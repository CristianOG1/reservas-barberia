// src/utils/borrador.js
// Borrador de la reservación: si el cliente llega al final sin sesión, se guarda
// lo que eligió en `sessionStorage`, se le manda a /login y al volver se
// restaura todo. Se borra al confirmar la cita o a las 2 horas.
//
// Sin dependencias de React.

import { FechaISO } from './fecha'

const CLAVE_BORRADOR = 'borradorReserva'
const VIGENCIA_BORRADOR_MS = 2 * 60 * 60 * 1000

export function guardarBorrador(datos) {
  try {
    sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ ...datos, guardadoEn: Date.now() }))
  } catch (e) {
    console.error(e)
  }
}

export function borrarBorrador() {
  try {
    sessionStorage.removeItem(CLAVE_BORRADOR)
  } catch (e) {
    console.error(e)
  }
}

export function leerBorrador() {
  try {
    const texto = sessionStorage.getItem(CLAVE_BORRADOR)
    if (!texto) return null
    const b = JSON.parse(texto)
    if (Date.now() - b.guardadoEn > VIGENCIA_BORRADOR_MS) return null
    // Si el día elegido ya pasó, se conserva todo menos la fecha y la hora.
    if (b.fechaElegida && b.fechaElegida < FechaISO(new Date())) {
      b.fechaElegida = null
      b.horaElegida = null
    }
    return b
  } catch {
    return null
  }
}
