// src/utils/validaciones.js
// Validación de campos de reserva; el teléfono reusa telefonoParaWhatsApp.

import { telefonoParaWhatsApp } from './telefono'

// Mensaje de error para el teléfono, o null si sirve para WhatsApp.
export function validarTelefono(telefono) {
  const crudo = String(telefono ?? '').trim()
  if (!crudo) return 'Escribe tu teléfono para confirmar la cita.'

  const { numero, motivo } = telefonoParaWhatsApp(crudo)
  if (numero) return null
  return motivo
}

// Devuelve { campo: mensaje } solo para los obligatorios que faltan.
export function validarObligatorios(valores, campos) {
  const errores = {}
  for (const [campo, mensaje] of Object.entries(campos || {})) {
    const valor = valores?.[campo]
    const vacio =
      valor === null ||
      valor === undefined ||
      String(valor).trim() === ''
    if (vacio) errores[campo] = mensaje
  }
  return errores
}

// Entero >= 0 (stock); mensajes.vacio y mensajes.formato personalizan el aviso.
export function validarEnteroNoNegativo(valor, mensajes = {}) {
  const crudo = String(valor ?? '').trim()
  if (crudo === '') {
    return mensajes.vacio || 'Este campo es obligatorio.'
  }
  if (!/^\d+$/.test(crudo)) {
    return mensajes.formato || 'Debe ser un número entero mayor o igual que 0.'
  }
  return null
}
