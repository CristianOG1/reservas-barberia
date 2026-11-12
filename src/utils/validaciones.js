// src/utils/validaciones.js
// Validacion de los datos que captura la gente al reservar: el telefono y los
// campos obligatorios. Sin dependencias de React: se prueban sin renderizar
// nada.
//
// La regla del telefono NO se duplica aqui: se reutiliza la de
// `telefonoParaWhatsApp` (`src/utils/telefono.js`), que es la que ya decide si
// un numero sirve para enviar un WhatsApp. Si el numero no sirve para avisar,
// tampoco sirve para una cita.

import { telefonoParaWhatsApp } from './telefono'

/**
 * Valida un telefono capturado en un formulario de reserva.
 *
 * @param {string} telefono
 * @returns {string|null} El mensaje de error, o `null` si el telefono vale.
 *   - Sin telefono: se pide uno.
 *   - Con formato invalido: se reutiliza el motivo de
 *     `telefonoParaWhatsApp`, que ya esta en español y explica cuantos
 *     digitos se esperan.
 */
export function validarTelefono(telefono) {
  const crudo = String(telefono ?? '').trim()
  if (!crudo) return 'Escribe tu teléfono para confirmar la cita.'

  const { numero, motivo } = telefonoParaWhatsApp(crudo)
  if (numero) return null
  return motivo
}

/**
 * Valida que un conjunto de campos obligatorios tenga valor.
 *
 * @param {object} valores Objeto con los valores capturados, por nombre de campo.
 * @param {object} campos  Mapa `{ campo: 'Mensaje para la persona' }` con los
 *   campos que son obligatorios y el texto que se muestra si faltan.
 * @returns {object} `{ campo: mensaje }` SOLO con los campos que fallan. Si
 *   todo esta bien, devuelve un objeto vacio.
 */
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

/**
 * Valida que un valor sea un número entero mayor o igual que cero.
 *
 * @param {string|number} valor
 * @param {object} mensajes
 * @param {string} mensajes.vacio   Texto cuando no se ha escrito nada.
 * @param {string} mensajes.formato  Texto cuando no es un entero >= 0.
 * @returns {string|null} El mensaje de error, o `null` si el valor vale.
 */
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
