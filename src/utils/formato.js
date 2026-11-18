// src/utils/formato.js
// Presentacion de precios, duraciones y minutos. Sin dependencias de React.

// `costo` y `precio` son numéricos: se muestran como $650 MXN.
export function formatoPrecio(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? `$${n.toLocaleString('es-MX')} MXN` : '—'
}

// `duracion` es TEXT: puede venir '30' o '50 min'.
export function formatoDuracion(valor) {
  const s = String(valor ?? '').trim()
  return /^\d+$/.test(s) ? `${s} min` : s || '—'
}

// Extrae el primer número de `duracion` (TEXT); null si no hay ninguno.
export function aMinutos(valor) {
  const n = parseInt(String(valor ?? '').match(/\d+/)?.[0] ?? '', 10)
  return Number.isFinite(n) ? n : null
}

// Igual que aMinutos, pero devuelve 0 en vez de null.
export function duracionAMinutos(valor) {
  const n = parseInt(String(valor ?? '').match(/\d+/)?.[0] ?? '', 10)
  return Number.isFinite(n) ? n : 0
}
