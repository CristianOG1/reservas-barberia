// tests/unit/slug.test.js
// Fija el comportamiento ACTUAL de la generacion y validacion de slugs.

import { describe, expect, it } from 'vitest'
import { motivoSlugInvalido, slugDeNombre } from '../../src/utils/slug'

describe('slugDeNombre', () => {
  it('pasa el nombre a un slug sin acentos ni mayusculas', () => {
    expect(slugDeNombre('Barbería El Buen Corte')).toBe('barberia-el-buen-corte')
  })

  it('quita los signos y los guiones sobrantes de los bordes', () => {
    expect(slugDeNombre('  ¡Hola!  ')).toBe('hola')
  })

  it('devuelve cadena vacia si el nombre no tiene caracteres utilizables', () => {
    expect(slugDeNombre('!!!')).toBe('')
  })
})

describe('motivoSlugInvalido', () => {
  it('acepta un slug valido', () => {
    expect(motivoSlugInvalido('barberia-el-buen-corte')).toBe(null)
  })

  it('rechaza la longitud fuera de rango', () => {
    expect(motivoSlugInvalido('ab')).toContain('entre 3 y 40')
    expect(motivoSlugInvalido('a'.repeat(41))).toContain('entre 3 y 40')
  })

  it('rechaza mayusculas, espacios y guiones en los bordes', () => {
    expect(motivoSlugInvalido('Barberia')).toContain('minúsculas')
    expect(motivoSlugInvalido('barberia norte')).toContain('minúsculas')
    expect(motivoSlugInvalido('-barberia')).toContain('minúsculas')
  })

  it('rechaza las palabras reservadas', () => {
    expect(motivoSlugInvalido('admin')).toContain('reservada')
    expect(motivoSlugInvalido('www')).toContain('reservada')
  })
})
