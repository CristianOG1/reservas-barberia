// src/utils/citas.js
// Logica de la cita y de su catalogo de servicios. Sin dependencias de React.
//
// Reunida desde `src/pages/admin/CitasAdmin.jsx`, donde estaba junto a los
// iconos y a la tabla.

import { etiquetaFecha, formatearHora } from './fecha'

// Minutos, cuando el servicio no está en el catálogo.
const DURACION_POR_DEFECTO = 30

// Bloques de horario por defecto (24 h). Compartidos entre BookingPage y CitasCliente
// para no duplicar la lista en dos componentes.
export const BLOQUES_POR_DEFECTO = [
  { titulo: 'Mañana (10:00 – 13:00)', horas: ['10:00', '11:00', '11:50', '12:40'] },
  { titulo: 'Tarde (14:00 – 18:00)',  horas: ['14:30', '15:20', '16:00', '17:30'] },
  { titulo: 'Noche (18:30 – 20:00)', horas: ['18:30'] },
]

// Días cerrados por defecto: 0 = domingo.
export const DIAS_CERRADOS_POR_DEFECTO = [0]

// Devuelve los bloques de horario de la configuración de la barbería, o los por defecto si no hay fila.
export function bloquesDeConfig(configuracion) {
  return configuracion?.bloques_horario ?? BLOQUES_POR_DEFECTO
}

// Devuelve los días cerrados de la configuración, o los por defecto si no hay fila.
export function diasCerradosDeConfig(configuracion) {
  return configuracion?.dias_cerrados ?? DIAS_CERRADOS_POR_DEFECTO
}

// 'estado' es nullable en la base: las citas nuevas nacen sin estado.
export function estadoDe(cita) {
  return cita.estado || 'pendiente'
}

// Minúsculas y sin acentos, para comparar textos que el usuario escribe a mano.
export function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Solo dígitos, máximo 10: se usa al escribir para no aceptar otro formato.
export function normalizarTelefono(valor) {
  return String(valor ?? '').replace(/\D/g, '').slice(0, 10)
}

// 10 dígitos exactos y no todos el mismo (0000000000 no es un teléfono).
export function esTelefonoValido(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '')
  return /^\d{10}$/.test(digitos) && !/^(\d)\1{9}$/.test(digitos)
}

// Mensaje de error, o null si el teléfono sirve. Fuente única del flujo público y manual.
export function validarTelefonoMexico(telefono) {
  const digitos = String(telefono ?? '').replace(/\D/g, '')
  if (!digitos) return 'Escribe tu teléfono para confirmar la cita.'
  if (digitos.length !== 10) return 'El teléfono debe tener exactamente 10 dígitos.'
  if (!esTelefonoValido(digitos)) return 'El teléfono no es válido: no puede repetir el mismo dígito.'
  return null
}

/**
 * Una cita puede traer varios servicios: `citas.servicio` los guarda unidos con
 * ', ' (el flujo público permite selección múltiple desde 2026-10).
 */
export function partirServicios(texto) {
  return String(texto ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
}

/**
 * `citas.servicio` es texto libre y casi nunca coincide con `servicios.nombre`
 * (el catálogo dice 'Corte de Cabello', las citas dicen 'Corte'). Se resuelve
 * por nombre exacto, luego por categoría exacta y luego por categoría contenida.
 */
export function buscarServicio(nombreCita, servicios) {
  const n = normalizar(nombreCita)
  if (!n) return null
  return (
    servicios.find((s) => normalizar(s.nombre) === n) ||
    servicios.find((s) => normalizar(s.categoria) === n) ||
    servicios.find((s) => normalizar(s.categoria) && n.includes(normalizar(s.categoria))) ||
    null
  )
}

/**
 * Duración acumulada de TODOS los servicios de la cita. Los que no están en el
 * catálogo caen al valor por defecto, como ya pasaba con el servicio único.
 */
export function duracionTotalCita(cita, servicios) {
  const nombres = partirServicios(cita.servicio)
  if (nombres.length === 0) return DURACION_POR_DEFECTO
  return nombres.reduce(
    (a, n) => a + (Number(buscarServicio(n, servicios)?.duracion) || DURACION_POR_DEFECTO),
    0
  )
}

/**
 * Productos de la cita: la columna es jsonb con [{ nombre, precio }]. Puede
 * llegar como texto si alguien la insertó a mano.
 */
export function productosCita(cita) {
  const bruto = cita.productos
  if (!bruto) return []
  if (Array.isArray(bruto)) return bruto
  try {
    const parsed = typeof bruto === 'string' ? JSON.parse(bruto) : bruto
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Texto del recordatorio manual por WhatsApp. */
export function mensajeRecordatorio(cita, nombreNegocio) {
  return (
    `Hola ${cita.nombre}, te recordamos tu cita en ${nombreNegocio} ` +
    `el ${etiquetaFecha(cita.fecha)} a las ${formatearHora(cita.hora)} ` +
    `para ${cita.servicio}. ¡Te esperamos!`
  )
}
