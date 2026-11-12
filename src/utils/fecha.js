// src/utils/fecha.js
// Utilidades de fecha y hora. Sin dependencias de React: se prueban sin
// renderizar nada.
//
// Este archivo es la reunion de copias que estaban duplicadas en varios
// componentes: `FechaISO` vivia en `CitasAdmin.jsx` y en `BookingPage.jsx` (byte
// a byte iguales) y `formato12h` en `BookingPage.jsx` y `CitasCliente.jsx`.

export const DIAS_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

// Fecha local en formato YYYY-MM-DD. Se parsesa explícitamente en hora local:
// `new Date('2026-09-30')` se interpretaría en UTC y en México mostraría el 29.
export function FechaISO(d) {
  const n = d instanceof Date ? d : new Date(`${String(d).slice(0, 10)}T00:00:00`)
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

// Variante que usaba el resumen del panel: comprueba `typeof d === 'object'` en
// lugar de `instanceof Date`. Se conserva tal cual para no alterar su
// comportamiento en ningun caso.
export function HoyEntero(d) {
  const n = typeof d === 'object' ? d : new Date(d + 'T00:00:00')
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0')
}

// lunes de la semana a la que pertenece la fecha (la semana empieza en lunes)
export function lunesDe(fecha) {
  const n = new Date(fecha)
  n.setHours(0, 0, 0, 0)
  const dow = n.getDay() // 0 = domingo
  n.setDate(n.getDate() + (dow === 0 ? -6 : 1 - dow))
  return n
}

// `citas.hora` es una columna `time`: llega como 'HH:MM:SS'. El flujo público
// guarda textos tipo '10:00 AM', así que se aceptan ambos formatos.
export function formatearHora(valor) {
  if (!valor) return '—'
  const s = String(valor).trim()
  const m = /^(\d{1,2}):(\d{2})/.exec(s)
  if (!m) return s
  if (/\b(am|pm)\b/i.test(s)) return s.toUpperCase()
  const h = Number(m[1])
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`
}

export function minutosDeHora(valor) {
  if (valor instanceof Date) return valor.getHours() * 60 + valor.getMinutes()
  const m = /^(\d{1,2}):(\d{2})/.exec(String(valor || '').trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

export function etiquetaFecha(iso) {
  const n = new Date(`${iso}T00:00:00`)
  const dia = DIAS_CORTO[n.getDay()]
  const texto = n.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${texto}`
}

/**
 * Marca de tiempo de un recordatorio automático, para el `title` de la etiqueta.
 * Las columnas `recordatorio_24h_enviado_at` y `recordatorio_2h_enviado_at` las
 * escribe la Edge Function con `now()`, así que llegan como timestamptz ISO.
 */
export function formatRecordatorio(iso) {
  if (!iso) return ''
  const n = new Date(iso)
  if (Number.isNaN(n.getTime())) return ''
  return n.toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// '14:30:00' → '14:30'
export function recortarHora(h) {
  return String(h ?? '').slice(0, 5)
}

// Solo presentación: '14:30' → '2:30 PM'
export function formato12h(hora) {
  const [h, m] = recortarHora(hora).split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export function formatearFecha(fecha) {
  const [y, m, d] = String(fecha).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function aDate(fecha, hora) {
  const [y, m, d] = String(fecha).slice(0, 10).split('-').map(Number)
  const [h, min] = recortarHora(hora).split(':').map(Number)
  return new Date(y, m - 1, d, h, min)
}
