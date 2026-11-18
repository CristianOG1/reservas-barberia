import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const TOKEN = Deno.env.get('WHATSAPP_TOKEN')
const PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID')
const PLANTILLA = Deno.env.get('WHATSAPP_PLANTILLA') ?? 'recordatorio_cita'
const IDIOMA = Deno.env.get('WHATSAPP_IDIOMA') ?? 'es_MX'
const VERSION = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v23.0'
const CRON_SECRET = Deno.env.get('CRON_SECRET')
// Si por algún motivo WhatsApp rechaza los números de México con "52", pon este secreto en "true" para usar "521"
const MX_CON_1 = Deno.env.get('WHATSAPP_MX_CON_1') === 'true'

const CUPO_TOTAL = 40
const POR_BARBERIA = 10

type Cita = {
  cita_id: string
  barberia_id: string
  barberia_nombre: string
  nombre: string
  telefono: string
  servicio: string
  fecha: string
  hora: string
  zona_horaria: string
}

const soloDigitos = (s: string) => s.replace(/\D/g, '')

// Por ahora solo números de México. Devuelve null si el número no es válido.
function normalizarTelefono(tel: string): string | null {
  let d = soloDigitos(tel)
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 10) d = '52' + d
  else if (d.length === 13 && d.startsWith('521')) d = '52' + d.slice(3)
  if (!/^52\d{10}$/.test(d)) return null
  return MX_CON_1 ? '521' + d.slice(2) : d
}

const PRUEBAS = normalizarTelefono(Deno.env.get('WHATSAPP_PRUEBAS') ?? '')
const MODO_PRUEBA = !!Deno.env.get('WHATSAPP_PRUEBAS')

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const fechaLarga = (f: string) =>
  new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${f}T12:00:00Z`))

const hora12 = (h: string) => {
  const [hh, mm] = h.split(':').map(Number)
  const sufijo = hh >= 12 ? 'p. m.' : 'a. m.'
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${sufijo}`
}

const fechaCorta = (f: string) => {
  const [y, m, d] = f.split('-')
  return `${d}/${m}/${y}`
}

const hora24 = (h: string) => h.slice(0, 5)

// WhatsApp no acepta saltos de línea ni textos vacíos en los parámetros
const limpio = (s: string) => s.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim() || '-'

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function liberar(citaId: string, tipo: string) {
  const { error } = await supabase.rpc('liberar_recordatorio_wa', {
    p_cita_id: citaId,
    p_tipo: tipo,
  })
  if (error) console.error('No se pudo liberar la cita', citaId, error.message)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return json({ error: 'No autorizado' }, 401)
  }
  if (!TOKEN || !PHONE_ID) {
    return json({ error: 'Faltan secretos WHATSAPP_TOKEN o WHATSAPP_PHONE_ID' }, 500)
  }
  if (MODO_PRUEBA && !PRUEBAS) {
    return json({ error: 'WHATSAPP_PRUEBAS no es un número válido' }, 500)
  }

  const resumen = {
    reservadas: 0,
    enviados: 0,
    fallidos: 0,
    omitidas_por_prueba: 0,
    telefono_invalido: 0,
  }
  let cupo = CUPO_TOTAL
  let fallosSeguidos = 0
  let detener = false

  for (const tipo of ['24h', '2h'] as const) {
    if (cupo <= 0 || detener) break

    const { data, error } = await supabase.rpc('reclamar_recordatorios_wa', {
      p_tipo: tipo,
      p_limite_total: cupo,
      p_limite_por_barberia: POR_BARBERIA,
    })
    if (error) {
      console.error('Error al reclamar', tipo, error.message)
      return json({ error: 'No se pudieron reclamar las citas', resumen }, 500)
    }

    const citas = (data ?? []) as Cita[]
    resumen.reservadas += citas.length
    cupo -= citas.length

    for (const c of citas) {
      const destino = normalizarTelefono(c.telefono)

      // Número que no es de México o mal escrito: no tiene caso reintentar
      if (!destino) {
        resumen.telefono_invalido++
        await liberar(c.cita_id, tipo)
        continue
      }

      // Modo prueba: solo se escribe al número de pruebas
      if (MODO_PRUEBA && destino !== PRUEBAS) {
        await liberar(c.cita_id, tipo)
        resumen.omitidas_por_prueba++
        continue
      }

      // Demasiados fallos seguidos: devolvemos el resto sin enviar
      if (detener) {
        await liberar(c.cita_id, tipo)
        resumen.fallidos++
        continue
      }

      const parametros = [
        c.nombre,
        c.servicio,
        fechaCorta(c.fecha),
        hora24(c.hora),
        c.barberia_nombre,
      ].map((t) => ({ type: 'text', text: limpio(t) }))

      const respuesta = await fetch(
        `https://graph.facebook.com/${VERSION}/${PHONE_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: destino,
            type: 'template',
            template: {
              name: PLANTILLA,
              language: { code: IDIOMA },
              components: [{ type: 'body', parameters: parametros }],
            },
          }),
        },
      )

      if (respuesta.ok) {
        resumen.enviados++
        fallosSeguidos = 0
      } else {
        const err = await respuesta.json().catch(() => null)
        console.error(
          'WhatsApp rechazó el envío',
          c.cita_id,
          respuesta.status,
          err?.error?.code,
          err?.error?.message,
        )
        await liberar(c.cita_id, tipo)
        resumen.fallidos++
        fallosSeguidos++
        if (respuesta.status === 429 || fallosSeguidos >= 3) detener = true
      }

      await dormir(200)
    }
  }

  console.log('Resumen', JSON.stringify(resumen))
  return json(resumen)
})
