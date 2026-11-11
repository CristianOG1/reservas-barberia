// src/utils/formato.js
// Presentacion de precios, duraciones y minutos. Sin dependencias de React.

/**
 * `servicios.costo` y `productos.precio` son numericos: se muestran como
 * $650 MXN. La funcion vivia duplicada en `Servicios.jsx` y `Productos.jsx`.
 */
export function formatoPrecio(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? `$${n.toLocaleString('es-MX')} MXN` : '—'
}

/**
 * `duracion` es TEXT en la base de datos: puede venir '30' o '50 min'.
 * Estava duplicada en `Servicios.jsx` y `BookingPage.jsx`.
 */
export function formatoDuracion(valor) {
  const s = String(valor ?? '').trim()
  return /^\d+$/.test(s) ? `${s} min` : s || '—'
}

/**
 * `duracion` es una columna TEXT: hoy guarda '30', pero el formulario aceptaba
 * '50 min'. Para promediar se extrae el primer numero que aparezca.
 * Devuelve null cuando no hay numero.
 */
export function aMinutos(valor) {
  const n = parseInt(String(valor ?? '').match(/\d+/)?.[0] ?? '', 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Igual que `aMinutos`, pero devuelve 0 en vez de null cuando no hay numero.
 * Se conserva la distincion porque las dos versiones ya coexistian.
 */
export function duracionAMinutos(valor) {
  const n = parseInt(String(valor ?? '').match(/\d+/)?.[0] ?? '', 10)
  return Number.isFinite(n) ? n : 0
}
