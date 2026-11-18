// src/utils/telefono.js
// Normalización de teléfonos para WhatsApp.

// wa.me exige el número internacional sin signos: 10 dígitos + 52.
const CODIGO_PAIS = '52'

// Devuelve { numero, motivo }: numero vacío y motivo si no se puede normalizar.
export function telefonoParaWhatsApp(telefono) {
  const crudo = String(telefono ?? '').trim()
  if (!crudo) return { numero: '', motivo: 'La cita no tiene teléfono registrado' }

  let digitos = crudo.replace(/\D/g, '')
  // Quitar prefijos antes de validar longitud: '00', '044', '52' y el '1' de móvil.
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
