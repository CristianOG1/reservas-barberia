// tests/unit/rutaInicioPorRol.test.js
// src/utils/rutaInicioPorRol.js es la fuente unica de verdad del destino
// segun el rol. Un error aqui manda al usuario a la zona equivocada: el
// superadmin caeria en /admin, que no es su panel.

import { describe, expect, it } from 'vitest'
import { rutaInicioPorRol } from '../../src/utils/rutaInicioPorRol'

describe('rutaInicioPorRol', () => {
  it('devuelve la ruta propia de cada rol valido', () => {
    expect(rutaInicioPorRol('superadmin')).toBe('/superadmin')
    expect(rutaInicioPorRol('admin')).toBe('/admin')
    expect(rutaInicioPorRol('cliente')).toBe('/cliente')
  })

  it('cae en /admin cuando el rol no existe o no se pudo leer', () => {
    expect(rutaInicioPorRol(null)).toBe('/admin')
    expect(rutaInicioPorRol(undefined)).toBe('/admin')
    expect(rutaInicioPorRol('')).toBe('/admin')
    expect(rutaInicioPorRol('barbero')).toBe('/admin')
  })
})
