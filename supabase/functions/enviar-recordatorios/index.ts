/**
 * enviar-recordatorios
 * ---------------------------------------------------------------------------
 * Envía los avisos automáticos de cita por correo (Resend) en dos ventanas:
 *
 *   · H-24: la cita empieza entre 23 y 24 horas desde ahora.
 *   · H-2 : la cita empieza entre  1 y  2 horas desde ahora.
 *
 * La invoca pg_cron una vez por hora (migración `cron_recordatorios`). Cada
 * ventana tiene su propia marca en `citas`, así que una cita en la ventana de
 * 24 h y otra en la de 2 h se gestionan por separado.
 *
 * REGLAS QUE NO DEBEN ROMPERSE
 * 1. Sin el secreto (leído de Supabase Vault) la función responde 401 y no
 *    hace nada. No está abierta al público.
 * 2. Si `configuracion.recordatorios_activos` es false, no se envía nada.
 *    El interruptor del panel manda.
 * 3. Solo se marca una columna si el envío **funcionó**. Si Resend falla, la
 *    columna sigue en NULL y se reintenta en la próxima hora.
 * 4. `lower(estado)`: hay una fila con 'Pendiente' en mayúscula (§18.37).
 * 5. Toda la aritmética de fechas va en America/Mexico_City.
 * 6. El límite de 80 es por el plan gratuito de Resend (100 correos/día).
 *
 * SECRETOS: ninguno vive en este archivo.
 *   · SUPABASE_URL       → inyectada por Supabase (NO es SUPABASE_API_URL:
 *     ese nombre no existe en el runtime y createClient falla con
 *     "supabaseUrl is required" si se usa).
 *   · SUPABASE_SERVICE_ROLE_KEY → inyectada por Supabase, usada solo aquí
 *     dentro de la plataforma (nunca en el frontend).
 *   · RESEND_API_KEY     → opcional. Si no está en el entorno (lo normal), se
 *     lee de Supabase Vault con la RPC `recordatorios_api_key_resend`, que solo
 *     service_role puede llamar. Así la clave no pasa por ningún archivo.
 *   · RESEND_REMITENTE   → opcional, con default "Barberos <notifications@resend.dev>".
 *   · SECRETO_RECORDATORIOS → opcional; si no está, el secreto se lee de
 *     Vault con la RPC `recordatorios_secreto_valido`.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

// ---- Constantes fáciles de cambiar ----------------------------------------

/** Zona horaria del salón. Debe coincidir con la que usa la RPC de citas. */
const TZ = 'America/Mexico_City'

/** Máximo de correos por ejecución (plan gratis de Resend: 100/día). */
const MAX_POR_EJECUCION = 80

/** Header que debe traer la llamada para que se procese. */
const HEADER_SECRETO = 'x-recordatorios-secreto'

/** Ventanas de aviso, en horas antes de que empiece la cita. */
const VENTANA_24H = { min: 23, max: 24, columna: 'recordatorio_24h_enviado_at' }
const VENTANA_2H = { min: 1, max: 2, columna: 'recordatorio_2h_enviado_at' }

// ---- Utilidades de fecha en la zona del salón ------------------------------

/**
 * Devuelve el instante actual como texto 'YYYY-MM-DD HH:MM:SS' **en la zona
 * horaria del salón**. `citas.fecha` es `date` y `citas.hora` es `time`, así
 * que ambos se comparan como texto local sin zona.
 */
function instanteLocal(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(fecha)

  const v = (tipo) => partes.find((p) => p.type === tipo)?.value ?? '00'
  return `${v('year')}-${v('month')}-${v('day')} ${v('hour')}:${v('minute')}:${v('second')}`
}

/**
 * Suma horas a un instante local (texto 'YYYY-MM-DD HH:MM:SS').
 *
 * Se parsea como si fuera UTC solo para poder sumar horas con el reloj; el
 * resultado se vuelve a extraer con los mismos campos, de modo que el número
 * devuelto es "hora local + N horas". No hay conversión real de zona, y no hace
 * falta: lo que buscamos es el texto que se compara contra `fecha + hora` de la
 * cita. México no aplica horario de verano desde 2022, así que las 24 h siguen
 * siendo 24 h durante todo el año.
 *
 * ⚠ `hora` YA trae segundos ('22:10:43'), así que hay que recortar a HH:MM
 * antes de construir el ISO. Con `T${hora}:00Z` el resultado es
 * '2026-10-13T22:10:43:00Z' → **Invalid Date**, y entonces `getUTCFullYear()`
 * devuelve `NaN`: la ventana se volvía "NaN-NaN-NaN", que como comparación de
 * strings hace que H-24 matchee TODAS las citas futuras y H-2 ninguna.
 */
function sumarHoras(instante, horas) {
  const [fecha, hora] = instante.split(' ')
  const d = new Date(`${fecha}T${hora.slice(0, 5)}:00Z`)
  if (Number.isNaN(d.getTime())) {
    throw new Error(`sumarHoras no pudo interpretar el instante "${instante}"`)
  }
  d.setUTCHours(d.getUTCHours() + horas)
  const p = (n) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
  )
}

/** '2026-10-13 11:00:00' → '11:00 AM'. */
function hora12(hora) {
  const [h, m] = String(hora ?? '00:00:00').split(':').map(Number)
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m ?? 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** '2026-10-13' → 'martes 13 de octubre de 2026'. */
function fechaLarga(fecha) {
  const [a, m, d] = String(fecha).slice(0, 10).split('-').map(Number)
  if (!a || !m || !d) return String(fecha)
  return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString('es-MX', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ---- Plantilla del correo ---------------------------------------------------

function htmlRecordatorio({ cita, negocio, horas }) {
  const cuando = horas <= 2 ? 'en unas horas' : 'mañana'
  const servicios = String(cita.servicio || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ')

  const fila = (etiqueta, valor) =>
    valor
      ? `<tr>
           <td style="padding:10px 0;color:#64748B;font-size:14px;width:140px;vertical-align:top">${etiqueta}</td>
           <td style="padding:10px 0;color:#0F172A;font-size:14px;font-weight:600">${valor}</td>
         </tr>`
      : ''

  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#F8FAFC;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #E2E8F0">
      <p style="margin:0;color:#854D0E;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Recordatorio de cita</p>
      <h1 style="margin:6px 0 0;color:#0F172A;font-size:20px">${negocio}</h1>
    </td></tr>
    <tr><td style="padding:24px 28px">
      <p style="margin:0 0 16px;color:#0F172A;font-size:15px">Hola ${cita.nombre}, te recordamos tu cita ${cuando}:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #E2E8F0">
        ${fila('Fecha', fechaLarga(cita.fecha))}
        ${fila('Hora', hora12(cita.hora))}
        ${fila('Servicios', servicios)}
        ${fila('Barbero', cita.barbero_nombre)}
      </table>
      <p style="margin:20px 0 0;color:#64748B;font-size:13px">
        Si necesitas cambiar la hora, responde a este correo o llámanos.
      </p>
    </td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid #E2E8F0;background:#F8FAFC;border-radius:0 0 12px 12px">
      <p style="margin:0;color:#94A3B8;font-size:11px">Este mensaje se envió automáticamente porque tienes una cita registrada.</p>
    </td></tr>
  </table>
</body>
</html>`
}

// ---- Arranque --------------------------------------------------------------

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

/**
 * Comprueba el secreto del header contra Vault o contra el entorno.
 *
 * Si la RPC falla se devuelve `false` (401) a propósito: preferimos **no
 * enviar** antes que abrir la puerta. No se pierde nada, porque las columnas
 * quedan en NULL y el cron reintenta a la siguiente hora.
 */
async function secretoValido(recibido) {
  if (!recibido) return false

  // 1) Si hay secreto en el entorno de la función, manda ese.
  const delEntorno = Deno.env.get('SECRETO_RECORDATORIOS')
  if (delEntorno) return recibido === delEntorno

  // 2) Si no, se consulta a Vault mediante la RPC, que es security definer.
  const { data, error } = await supabase.rpc('recordatorios_secreto_valido', {
    p_secreto: recibido,
  })
  if (error) {
    console.error('No se pudo validar el secreto:', error.message)
    return false
  }
  return data === true
}

/**
 * Devuelve las citas cuya cita cae en la ventana indicada y que aún no
 * tienen la marca de esa ventana.
 */
async function citasEnVentana(ventana, desde, hasta) {
  const columna = ventana.columna
  const { data, error } = await supabase.rpc('recordatorios_citas_pendientes', {
    p_desde: desde,
    p_hasta: hasta,
    p_columna_marca: columna,
    p_maximo: MAX_POR_EJECUCION,
  })
  if (error) throw new Error(`RPC recordatorios_citas_pendientes: ${error.message}`)
  return data ?? []
}

/**
 * Devuelve la clave de Resend: primero del entorno de la función y, si no está,
 * de Supabase Vault a través de la RPC `recordatorios_api_key_resend`, que es
 * `security definer` y solo admite `service_role`.
 *
 * Nunca se registra en los logs ni se devuelve en la respuesta.
 */
async function apiKeyResend() {
  const delEntorno = Deno.env.get('RESEND_API_KEY')
  if (delEntorno) return delEntorno

  const { data, error } = await supabase.rpc('recordatorios_api_key_resend')
  if (error) {
    console.error('No se pudo leer la clave de Resend de Vault:', error.message)
    return null
  }
  return data || null
}

/** Marca la ventana como enviada. Devuelve true si el update se aplicó. */
async function marcar(citaId, columna) {
  const { error } = await supabase
    .from('citas')
    .update({ [columna]: new Date().toISOString() })
    .eq('id', citaId)
  if (error) {
    console.error(`No se pudo marcar ${columna} en la cita ${citaId}:`, error.message)
    return false
  }
  return true
}

Deno.serve(async (req) => {
  const responder = (codigo, cuerpo) =>
    new Response(JSON.stringify(cuerpo), {
      status: codigo,
      headers: { 'Content-Type': 'application/json' },
    })

  // 1) Solo POST y con secreto.
  if (req.method !== 'POST') return responder(405, { error: 'Método no permitido' })
  if (!(await secretoValido(req.headers.get(HEADER_SECRETO)))) {
    return responder(401, { error: 'Secreto inválido o ausente' })
  }

  try {
    // 2) Interruptor maestro del panel.
    const { data: config, error: errorConfig } = await supabase
      .from('configuracion')
      .select('nombre, recordatorios_activos')
      .eq('id', 1)
      .maybeSingle()

    if (errorConfig) throw new Error(`configuracion: ${errorConfig.message}`)

    if (!config?.recordatorios_activos) {
      console.log('Envío automático apagado en configuracion. No se manda nada.')
      return responder(200, {
        enviados: 0,
        motivo: 'interruptor apagado',
        negocio: config?.nombre ?? null,
      })
    }

    const negocio = config.nombre?.trim() || 'la barbería'

    // 3) Ventanas, calculadas en la zona del salón.
    //    ⚠ Las dos ventanas usan MIN **y** MAX. Usar `min: ahora` abriría una
    //    ventana de 24 h de ancho y mandaría el aviso de "mañana" a cada cita
    //    del día, cada hora, hasta agotar los 80. La ventana es de 1 h: [23,24]
    //    y [1,2] horas de distancia.
    const ahora = instanteLocal()
    const ventana_24h = {
      min: sumarHoras(ahora, VENTANA_24H.min),
      max: sumarHoras(ahora, VENTANA_24H.max),
    }
    const ventana_2h = {
      min: sumarHoras(ahora, VENTANA_2H.min),
      max: sumarHoras(ahora, VENTANA_2H.max),
    }

    // Barrera: una ventana mal formada se compara como texto y no da error, solo
    // deja de encontrar citas… o peor, hace que H-24 matchee todas las futuras.
    // Si algo sale del formato 'YYYY-MM-DD HH:MM:SS', no se envía nada.
    const formatoVentana = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
    const ventanas = [ventana_24h.min, ventana_24h.max, ventana_2h.min, ventana_2h.max]
    if (!ventanas.every((v) => formatoVentana.test(v))) {
      console.error('Ventanas con formato inválido, no se envía nada:', JSON.stringify(ventanas))
      return responder(500, { error: 'Ventanas de aviso inválidas' })
    }

    const [lote24h, lote2h] = await Promise.all([
      citasEnVentana(VENTANA_24H, ventana_24h.min, ventana_24h.max),
      citasEnVentana(VENTANA_2H, ventana_2h.min, ventana_2h.max),
    ])

    // 4) Sin correo no hay aviso: se avisa y se sigue con el resto.
    const sinCorreo = [...lote24h, ...lote2h].filter((c) => !c.correo)
    if (sinCorreo.length > 0) {
      console.warn(
        `${sinCorreo.length} cita(s) en ventana sin correo: ` +
          sinCorreo.map((c) => `${c.nombre} (${c.fecha} ${String(c.hora).slice(0, 5)})`).join(', '),
      )
    }

    // 5) Envío. La API key vive en Vault o en el entorno de la función.
    const apiKey = await apiKeyResend()
    if (!apiKey) {
      console.error(
        'Falta la clave de Resend. Se busca en RESEND_API_KEY (entorno) y en ' +
          "Vault (secreto 'resend_api_key').",
      )
      return responder(500, { error: 'No hay clave de Resend disponible' })
    }
    const remitente = Deno.env.get('RESEND_REMITENTE') ?? 'Barberos <notifications@resend.dev>'

    let presupuesto = MAX_POR_EJECUCION
    const resumen = { enviados: [], fallos: [], sinCorreo: [], saltados: [] }

    const enviar = async (cita, horas, columna) => {
      if (!cita.correo) {
        resumen.sinCorreo.push(`${cita.nombre} ${cita.fecha}`)
        return
      }
      if (presupuesto <= 0) {
        resumen.saltados.push(`${cita.nombre} ${cita.fecha} (límite de ${MAX_POR_EJECUCION})`)
        return
      }

      const horasRestantes = Math.max(
        1,
        Math.round(
          (new Date(`${cita.fecha}T${String(cita.hora).slice(0, 8)}Z`).getTime() -
            new Date(`${ahora.replace(' ', 'T')}Z`).getTime()) /
            3600000,
        ),
      )

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: remitente,
            to: [cita.correo],
            subject: `Recordatorio de tu cita ${cuando(horas)} — ${negocio}`,
            html: htmlRecordatorio({ cita, negocio, horas: horasRestantes }),
          }),
        })

        if (!res.ok) {
          const detalle = await res.text()
          console.error(`Resend ${res.status} para ${cita.correo}:`, detalle.slice(0, 300))
          resumen.fallos.push(`${cita.nombre} (HTTP ${res.status})`)
          return
        }

        presupuesto -= 1
        if (await marcar(cita.id, columna)) {
          resumen.enviados.push(`${cita.nombre} ${cita.fecha}`)
        } else {
          // Se envió pero no quedó marcada: se avisará otra vez en la próxima hora.
          resumen.fallos.push(`${cita.nombre} (enviado sin marcar)`)
        }
      } catch (e) {
        console.error('Fallo de red enviando a', cita.correo, e)
        resumen.fallos.push(`${cita.nombre} (error de red)`)
      }
    }

    for (const cita of lote24h) await enviar(cita, 24, VENTANA_24H.columna)
    for (const cita of lote2h) await enviar(cita, 2, VENTANA_2H.columna)

    // 6) Log de lo que queda para la próxima hora.
    console.log(
      JSON.stringify({
        ahora_local: ahora,
        ventana_24h,
        ventana_2h,
        encontrados: { h24: lote24h.length, h2: lote2h.length },
        resumen,
      }),
    )

    return responder(200, {
      ahora_local: ahora,
      ventana_24h,
      ventana_2h,
      encontrados: { h24: lote24h.length, h2: lote2h.length },
      ...resumen,
      presupuesto_restante: presupuesto,
    })
  } catch (e) {
    console.error('Fallo general:', e)
    return responder(500, { error: String(e?.message ?? e) })
  }
})

/** Texto del asunto según la ventana. */
function cuando(horas) {
  return horas <= 3 ? 'en unas horas' : 'mañana'
}