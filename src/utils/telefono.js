// src/utils/telefono.js
// Normalizacion de telefonos para el envio por WhatsApp. Sin dependencias de
// React.

// Codigo de pais para WhatsApp. wa.me exige el numero internacional sin signos:
// 10 digitos (los dos digitos de un movil mexicano) + 52.
const CODIGO_PAIS = '52'

/**
 * Normaliza un teléfono al formato que wa.me espera: solo dígitos y con código de
 * país. Acepta lo que la gente escribe de verdad ('55 1234 5678', '+52 1 55…').
 * @returns {{ numero: string, motivo: string }} `numero` vacío si no hay número
 *   usable, y `motivo` explicando por qué, para poder ponerlo en el `title`.
 */
export function telefonoParaWhatsApp(telefono) {
  const crudo = String(telefono ?? '').trim()
  if (!crudo) return { numero: '', motivo: 'La cita no tiene teléfono registrado' }

  let digitos = crudo.replace(/\D/g, '')
  // Prefijos que la gente escribe a mano: prefijo internacional '00', la larga
  // nacional '044', el código de país y el '1' de móvil internacional. Se quitan
  // en ese orden ANTES de validar la longitud: si no, un "+52 1 55 1234 5678"
  // quedaría con el 1 pegado y el número sería inválido.
  if (digitos.startsWith('00')) digitos = digitos.slice(2)
  if (digitos.startsWith('044')) digitos = digitos.slice(3)
  if (digitos.startsWith(CODIGO_PAIS)) digitos = digitos.slice(CODIGO_PAIS.length)
  if (digitos.length === 11 && digitos.startsWith('1')) digitos = digitos.slice(1)

  // 10 dígitos = móvil local: se le antepone el código de país.
  if (digitos.length === 10) digitos = `${CODIGO_PAIS}${digitos}`
  else if (digitos.length !== 11) {
    return { numero: '', motivo: `Teléfono "${crudo}" no válido: ${digitos.length} dígitos, se esperan 10` }
  }

  return { numero: digitos, motivo: '' }
}
