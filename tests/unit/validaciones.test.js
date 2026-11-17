// tests/unit/validaciones.test.js
// El validador de los datos que captura la gente: telefono y campos
// obligatorios.
//
// Matriz v3: F-05 (reservar una cita) y F-08 (la agenda del salón) usan este
// validador en los formularios de reserva.

import { describe, expect, it } from 'vitest'
import {
  validarEnteroNoNegativo,
  validarObligatorios,
  validarTelefono,
} from '../../src/utils/validaciones'

describe('validarTelefono', () => {
  it('acepta un móvil de 10 dígitos', () => {
    expect(validarTelefono('5512345678')).toBeNull()
  })

  it('acepta un móvil con el código de país', () => {
    expect(validarTelefono('525512345678')).toBeNull()
  })

  it('acepta un móvil con prefijo internacional y espacios', () => {
    expect(validarTelefono('+52 1 55 1234 5678')).toBeNull()
  })

  it('acepta un número con la larga nacional', () => {
    expect(validarTelefono('044 55 1234 5678')).toBeNull()
  })

  it('pide un teléfono cuando no hay ninguno', () => {
    expect(validarTelefono('')).toBe(
      'Escribe tu teléfono para confirmar la cita.'
    )
    expect(validarTelefono('   ')).toBe(
      'Escribe tu teléfono para confirmar la cita.'
    )
    expect(validarTelefono(undefined)).toBe(
      'Escribe tu teléfono para confirmar la cita.'
    )
  })

  it('rechaza un teléfono de pocos dígitos y explica cuántos se esperan', () => {
    const mensaje = validarTelefono('123')
    expect(mensaje).toContain('3 dígitos')
    expect(mensaje).toContain('se esperan 10')
  })

  it('rechaza un teléfono de más dígitos', () => {
    expect(validarTelefono('551234567890')).toContain('no válido')
  })

  it('rechaza un teléfono con letras', () => {
    // La regla shared de `telefonoParaWhatsApp` deja solo los dígitos.
    expect(validarTelefono('5512abc678')).not.toBeNull()
  })
})

describe('validarObligatorios', () => {
  const CAMPOS = {
    nombre: 'Escribe tu nombre completo.',
    telefono: 'Escribe tu teléfono para confirmar la cita.',
    correo: 'Escribe tu correo para recibir la confirmación.',
  }

  it('no devuelve errores cuando todo está lleno', () => {
    const errores = validarObligatorios(
      { nombre: 'Ana', telefono: '5512345678', correo: 'ana@ejemplo.com' },
      CAMPOS
    )
    expect(errores).toEqual({})
  })

  it('devuelve un error por cada campo vacío', () => {
    const errores = validarObligatorios({ nombre: '', telefono: '', correo: '' }, CAMPOS)
    expect(errores).toEqual(CAMPOS)
  })

  it('trata los espacios como campo vacío', () => {
    const errores = validarObligatorios({ nombre: '   ', telefono: '55', correo: 'a@b.com' }, CAMPOS)
    expect(Object.keys(errores)).toEqual(['nombre'])
    expect(errores.nombre).toBe('Escribe tu nombre completo.')
  })

  it('devuelve un error si el campo no existe en los valores', () => {
    const errores = validarObligatorios({ nombre: 'Ana' }, CAMPOS)
    expect(Object.keys(errores)).toEqual(['telefono', 'correo'])
  })

  it('no falla si no se le pasan campos', () => {
    expect(validarObligatorios({}, undefined)).toEqual({})
    expect(validarObligatorios(undefined, {})).toEqual({})
  })
})

describe('validarEnteroNoNegativo', () => {
  const MENSAJES = {
    vacio: 'Indica cuántas unidades hay en stock.',
    formato: 'El stock debe ser un número entero mayor o igual que 0.',
  }

  it('acepta el cero', () => {
    expect(validarEnteroNoNegativo('0', MENSAJES)).toBeNull()
    expect(validarEnteroNoNegativo(0, MENSAJES)).toBeNull()
  })

  it('acepta un entero positivo', () => {
    expect(validarEnteroNoNegativo('25', MENSAJES)).toBeNull()
    expect(validarEnteroNoNegativo(25, MENSAJES)).toBeNull()
  })

  it('acepta un entero con espacios alrededor', () => {
    expect(validarEnteroNoNegativo('  7 ', MENSAJES)).toBeNull()
  })

  it('pide un valor cuando no hay nada', () => {
    expect(validarEnteroNoNegativo('', MENSAJES)).toBe(MENSAJES.vacio)
    expect(validarEnteroNoNegativo('   ', MENSAJES)).toBe(MENSAJES.vacio)
    expect(validarEnteroNoNegativo(undefined, MENSAJES)).toBe(MENSAJES.vacio)
    expect(validarEnteroNoNegativo(null, MENSAJES)).toBe(MENSAJES.vacio)
  })

  it('rechaza un negativo', () => {
    expect(validarEnteroNoNegativo('-5', MENSAJES)).toBe(MENSAJES.formato)
  })

  it('rechaza un decimal', () => {
    expect(validarEnteroNoNegativo('1.5', MENSAJES)).toBe(MENSAJES.formato)
  })

  it('rechaza un texto', () => {
    expect(validarEnteroNoNegativo('mucho', MENSAJES)).toBe(MENSAJES.formato)
  })

  it('tiene mensajes por defecto cuando no se le pasan', () => {
    expect(validarEnteroNoNegativo('')).toBe('Este campo es obligatorio.')
    expect(validarEnteroNoNegativo('x')).toBe(
      'Debe ser un número entero mayor o igual que 0.'
    )
  })
})
