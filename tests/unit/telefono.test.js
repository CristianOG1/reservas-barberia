// tests/unit/telefono.test.js
// Fija el comportamiento ACTUAL de telefonoParaWhatsApp.

import { describe, expect, it } from 'vitest'
import { telefonoParaWhatsApp } from '../../src/utils/telefono'

describe('telefonoParaWhatsApp', () => {
  it('devuelve el motivo cuando la cita no tiene telefono', () => {
    const r = telefonoParaWhatsApp('')
    expect(r.numero).toBe('')
    expect(r.motivo).toBe('La cita no tiene teléfono registrado')
  })

  it('normaliza el formato internacional con el 1 de movil', () => {
    const r = telefonoParaWhatsApp('+52 1 55 1234 5678')
    expect(r.numero).toBe('525512345678')
    expect(r.motivo).toBe('')
  })

  it('normaliza el formato internacional de 12 digitos', () => {
    expect(telefonoParaWhatsApp('525512345678').numero).toBe('525512345678')
  })

  it('acepta un movil local de 10 digitos y le antepone el codigo de pais', () => {
    // '5512345678' empieza por '55', no por '52', asi que no se interpreta como
    // prefijo internacional: quedan 10 digitos y se le anade el 52.
    const r = telefonoParaWhatsApp('5512345678')
    expect(r.numero).toBe('525512345678')
    expect(r.motivo).toBe('')
  })

  it('normaliza la larga nacional 044', () => {
    expect(telefonoParaWhatsApp('044 55 1234 5678').numero).toBe('525512345678')
  })

  it('normaliza el prefijo internacional 00', () => {
    expect(telefonoParaWhatsApp('0055 1234 5678').numero).toBe('525512345678')
  })

  it('rechaza un numero demasiado corto', () => {
    const r = telefonoParaWhatsApp('12345')
    expect(r.numero).toBe('')
    expect(r.motivo).toContain('5 dígitos')
  })
})
