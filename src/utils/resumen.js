// src/utils/resumen.js
// Cálculos del resumen con datos reales de la barbería; sin dependencias de React.

import { partirServicios, bloquesDeConfig, diasCerradosDeConfig } from './citas'

// Umbral de reposición, el mismo que usa el panel de productos.
export const STOCK_MINIMO = 5

/** El stock de un producto, tratando el null como 0. */
export function stockDe(producto) {
  const n = Number(producto?.stock ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Productos cuyo stock esta en el minimo o por debajo (los que hay que reponer). */
export function productosConStockBajo(productos, minimo = STOCK_MINIMO) {
  return (productos || []).filter((p) => stockDe(p) <= minimo)
}

/** Unidades totales del inventario. */
export function totalStock(productos) {
  return (productos || []).reduce((suma, p) => suma + stockDe(p), 0)
}

/** Valor del inventario al precio de venta. */
export function valorInventario(productos) {
  return (productos || []).reduce(
    (suma, p) => suma + (Number(p.precio) || 0) * stockDe(p),
    0
  )
}

/** Productos ordenados de menos a mas stock (los mas urgentes primero). */
export function ordenarPorStock(productos) {
  return [...(productos || [])].sort((a, b) => stockDe(a) - stockDe(b))
}

/** Citas de un dia concreto ('YYYY-MM-DD'). */
export function citasDeHoy(citas, hoy) {
  return (citas || []).filter((c) => c.fecha === hoy)
}

// `estado` es nullable en la BD: sin valor cuenta como 'pendiente'.
export function contarPorEstado(citas, estado = 'pendiente') {
  return (citas || []).filter((c) => (c.estado || 'pendiente') === estado).length
}

// Cada servicio cuenta por separado; el % es sobre sesiones, no sobre citas.
export function topServicios(citas, limite = 3) {
  const cuentas = {}
  let total = 0

  for (const cita of citas || []) {
    for (const nombre of partirServicios(cita.servicio)) {
      cuentas[nombre] = (cuentas[nombre] || 0) + 1
      total += 1
    }
  }

  if (total === 0) return []

  return Object.entries(cuentas)
    .map(([nombre, sesiones]) => ({
      nombre,
      sesiones,
      pct: Math.round((sesiones / total) * 100),
    }))
    .sort((a, b) => b.sesiones - a.sesiones || a.nombre.localeCompare(b.nombre))
    .slice(0, limite)
}

/** Cuantas categorias distintas tiene el catalogo de servicios. */
export function categoriasDeServicios(servicios) {
  return new Set((servicios || []).map((s) => s.categoria).filter(Boolean)).size
}

// `disponible` es nullable con default true: ausente cuenta como disponible.
export function estaDisponible(barbero) {
  return barbero?.disponible ?? true
}

// Barberos que pueden recibir citas (ausente = disponible).
export function barberosDisponibles(barberos) {
  return (barberos || []).filter(estaDisponible).length
}

/** Cuantos barberos estan en pausa (no pueden recibir citas). */
export function barberosEnPausa(barberos) {
  return (barberos || []).length - barberosDisponibles(barberos)
}

// Ocupación = citas activas / (días abiertos × horas × barberos), acotado 0-100.
export function porcentajeOcupacionSemanal(citasSemana, barberos, configuracion, hoy) {
  void hoy // recibido por consistencia con la firma del resumen; las citas ya vienen filtradas por semana
  const bloques = bloquesDeConfig(configuracion)
  const diasCerrados = diasCerradosDeConfig(configuracion)
  const totalHorasPorDia = bloques.reduce((acc, b) => acc + b.horas.length, 0)
  const disponibles = Math.max(barberosDisponibles(barberos), 1)
  const diasAbiertos = 7 - diasCerrados.length
  const capacidadSemanal = diasAbiertos * totalHorasPorDia * disponibles

  if (capacidadSemanal === 0) return 0

  const citasActivas = (citasSemana || []).filter((c) => (c.estado || 'pendiente') !== 'cancelada')
  const ocupacion = (citasActivas.length / capacidadSemanal) * 100

  return Math.min(100, Math.max(0, Math.round(ocupacion)))
}
