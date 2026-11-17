import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const REMITENTE = Deno.env.get('REMITENTE')
const CRON_SECRET = Deno.env.get('CRON_SECRET')
const CORREO_PRUEBAS = Deno.env.get('CORREO_PRUEBAS')?.trim().toLowerCase()
const DOMINIO = Deno.env.get('SITIO_BASE_DOMINIO')

const CUPO_TOTAL = 80 // tope de correos por ejecución (el plan gratis de Resend permite 100 al día)

type Cita = {
  cita_id: string
  barberia_id: string
  barberia_nombre: string
  barberia_slug: string
  nombre: string
  correo: string
  servicio: string
  fecha: string
  hora: string
  barbero_nombre: string | null
  zona_horaria: string
}

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

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

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms))

function armarCorreo(c: Cita, tipo: '24h' | '2h') {
  const cuando = tipo === '24h' ? 'en 24 horas' : 'en 2 horas'
  const asunto = `Recordatorio: tu cita en ${c.barberia_nombre} es ${cuando}`
  const fecha = fechaLarga(c.fecha)
  const hora = hora12(c.hora)
  const enlace = DOMINIO ? `https://${c.barberia_slug}.${DOMINIO}/cliente` : null

  const lineas = [
    `Hola ${c.nombre},`,
    `Te recordamos que tu cita en ${c.barberia_nombre} es ${cuando}.`,
    `Servicio: ${c.servicio}`,
    `Fecha: ${fecha}`,
    `Hora: ${hora}`,
    ...(c.barbero_nombre ? [`Barbero: ${c.barbero_nombre}`] : []),
    ...(enlace ? [`Ver o cancelar tu cita: ${enlace}`] : []),
    '¡Te esperamos!',
  ]

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#0F172A">
  <h2 style="margin:0 0 12px">${esc(c.barberia_nombre)}</h2>
  <p>Hola ${esc(c.nombre)},</p>
  <p>Te recordamos que tu cita es <strong>${cuando}</strong>.</p>
  <table style="border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:4px 12px 4px 0;color:#64748B">Servicio</td><td>${esc(c.servicio)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#64748B">Fecha</td><td>${esc(fecha)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#64748B">Hora</td><td>${esc(hora)}</td></tr>
    ${c.barbero_nombre ? `<tr><td style="padding:4px 12px 4px 0;color:#64748B">Barbero</td><td>${esc(c.barbero_nombre)}</td></tr>` : ''}
  </table>
  ${enlace ? `<p><a href="${enlace}" style="background:#1E40AF;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Ver o cancelar mi cita</a></p>` : ''}
  <p style="color:#64748B">¡Te esperamos!</p>
</div>`

  return { asunto, html, texto: lineas.join('\n') }
}

async function liberar(citaId: string, tipo: string) {
  const { error } = await supabase.rpc('liberar_recordatorio', {
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
  if (!RESEND_API_KEY || !REMITENTE) {
    return json({ error: 'Faltan secretos RESEND_API_KEY o REMITENTE' }, 500)
  }

  const resumen = { reservadas: 0, enviados: 0, fallidos: 0, omitidas_por_prueba: 0 }
  let cupo = CUPO_TOTAL
  let detener = false

  for (const tipo of ['24h', '2h'] as const) {
    if (cupo <= 0 || detener) break

    const { data, error } = await supabase.rpc('reclamar_recordatorios', {
      p_tipo: tipo,
      p_limite_total: cupo,
      p_limite_por_barberia: 20,
    })
    if (error) {
      console.error('Error al reclamar', tipo, error.message)
      return json({ error: 'No se pudieron reclamar las citas', resumen }, 500)
    }

    const citas = (data ?? []) as Cita[]
    resumen.reservadas += citas.length
    cupo -= citas.length

    for (const c of citas) {
      // Modo prueba: solo se envía a las citas con el correo de pruebas
      if (CORREO_PRUEBAS && c.correo.trim().toLowerCase() !== CORREO_PRUEBAS) {
        await liberar(c.cita_id, tipo)
        resumen.omitidas_por_prueba++
        continue
      }

      // Si Resend ya pidió frenar, devolvemos el resto sin enviar
      if (detener) {
        await liberar(c.cita_id, tipo)
        resumen.fallidos++
        continue
      }

      const { asunto, html, texto } = armarCorreo(c, tipo)
      const respuesta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${c.barberia_nombre.replace(/["<>]/g, '')} <${REMITENTE}>`,
          to: [c.correo.trim()],
          subject: asunto,
          html,
          text: texto,
        }),
      })

      if (respuesta.ok) {
        resumen.enviados++
      } else {
        console.error('Resend rechazó el envío', c.cita_id, respuesta.status)
        await liberar(c.cita_id, tipo)
        resumen.fallidos++
        if (respuesta.status === 429) detener = true // límite alcanzado: paramos
      }

      await dormir(300) // pausa corta para no saturar a Resend
    }
  }

  console.log('Resumen', JSON.stringify(resumen))
  return json(resumen)
})