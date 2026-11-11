// tests/unit/formato.test.js
// Fija el comportamiento ACTUAL de las utilidades de presentacion.

import { describe, expect, it } from 'vitest'
import {
  aMinutos,
  duracionAMinutos,
  formatoDuracion,
  formatoPrecio,
} from '../../src/utils/formato'

describe('formatoPrecio', () => {
  it('escribe el precio con el formato de Mexico', () => {
    expect(formatoPrecio(150)).toBe('$150 MXN')
    expect(formatoPrecio(1234.5)).toContain('MXN')
  })

  it('devuelve guion cuando el valor no es un numero', () => {
    expect(formatoPrecio(undefined)).toBe('—')
    expect(formatoPrecio('abc')).toBe('—')
  })

  it('trata null como cero', () => {
    // Comportamiento actual: Number(null) es 0, que es un numero valido.
    expect(formatoPrecio(null)).toBe('$0 MXN')
  })
})

describe('formatoDuracion', () => {
  it('añade min a un numero pelado', () => {
    expect(formatoDuracion('30')).toBe('30 min')
  })

  it('deja el texto tal cual si ya trae unidad', () => {
    expect(formatoDuracion('50 min')).toBe('50 min')
  })

  it('devuelve guion si no hay nada', () => {
    expect(formatoDuracion('')).toBe('—')
    expect(formatoDuracion(null)).toBe('—')
  })
})

describe('aMinutos', () => {
  it('extrae el primer numero del texto', () => {
    expect(aMinutos('30')).toBe(30)
    expect(aMinutos('50 min')).toBe(50)
  })

  it('devuelve null cuando no hay numero', () => {
    expect(aMinutos('')).toBe(null)
    expect(aMinutos(null)).toBe(null)
  })
})

describe('duracionAMinutos', () => {
  it('extrae el primer numero del texto', () => {
    expect(duracionAMinutos('50 min')).toBe(50)
  })

  it('devuelve 0 cuando no hay numero', () => {
    // A diferencia de `aMinutos`, esta variante devuelve 0 y no null.
    expect(duracionAMinutos('')).toBe(0)
  })
})
