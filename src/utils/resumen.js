// src/utils/resumen.js
// Calculos del resumen del panel (citas, personal e inventario). Sin
// dependencias de React: se prueban sin renderizar nada.
//
// Todas las cifras que se muestran en el resumen salen de aqui, y TODAS parten
// de datos reales de la barberia (filtrados por `barberia_id`). Si no hay
// datos, el resultado es 0 o una lista vacia: nunca un numero de ejemplo.

import { partirServicios } from './citas'

/**
 * Stock mínimo de un producto: por debajo (o justo en) este número hay que
 * reponer. Es el mismo umbral que usa el panel de productos.
 */
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

/**
 * Cuantas citas tienen un estado. `citas.estado` es nullable en la base: una
 * cita sin estado esta 'pendiente'.
 */
export function contarPorEstado(citas, estado = 'pendiente') {
  return (citas || []).filter((c) => (c.estado || 'pendiente') === estado).length
}

/**
 * Los servicios mas solicitados de una lista de citas, con su porcentaje
 * sobre el total de sesiones.
 *
 * Una cita puede llevar varios servicios (el flujo publico permite seleccion
 * multiple), asi que se cuenta cada servicio por separado: el porcentaje es
 * sobre el total de sesiones, no sobre el numero de citas.
 */
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

/**
 * Si un barbero puede recibir citas. `barberos.disponible` es nullable en la
 * base y su default es `true`, asi que un valor ausente cuenta como
 * disponible (la misma convencion que usa `BarberoForm`).
 */
export function estaDisponible(barbero) {
  return barbero?.disponible ?? true
}

/**
 * Cuantos barberos pueden recibir citas. `barberos.disponible` es nullable en
 * la base: si no viene, se asume disponible (default de la columna).
 */
export function barberosDisponibles(barberos) {
  return (barberos || []).filter(estaDisponible).length
}

/** Cuantos barberos estan en pausa (no pueden recibir citas). */
export function barberosEnPausa(barberos) {
  return (barberos || []).length - barberosDisponibles(barberos)
}
