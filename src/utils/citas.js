// src/utils/citas.js
// Logica de la cita y de su catalogo de servicios. Sin dependencias de React.
//
// Reunida desde `src/pages/admin/CitasAdmin.jsx`, donde estaba junto a los
// iconos y a la tabla.

import { etiquetaFecha, formatearHora } from './fecha'

// Minutos, cuando el servicio no está en el catálogo.
const DURACION_POR_DEFECTO = 30

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
