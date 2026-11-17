// tests/unit/fecha.test.js
// Fija el comportamiento ACTUAL de las utilidades de fecha y hora antes de que
// los componentes las importen desde src/utils/fecha.js.

import { describe, expect, it } from 'vitest'
import {
  FechaISO,
  HoyEntero,
  aDate,
  formatearFecha,
  formatearHora,
  formatRecordatorio,
  formato12h,
  lunesDe,
  minutosDeHora,
  recortarHora,
  etiquetaFecha,
} from '../../src/utils/fecha'

describe('FechaISO', () => {
  it('devuelve YYYY-MM-DD a partir de un Date local', () => {
    expect(FechaISO(new Date(2026, 8, 30))).toBe('2026-09-30')
  })

  it('acepta un texto de fecha sin pasar por UTC', () => {
    expect(FechaISO('2026-09-30')).toBe('2026-09-30')
  })
})

describe('HoyEntero', () => {
  it('devuelve YYYY-MM-DD a partir de un Date o de un texto', () => {
    expect(HoyEntero(new Date(2026, 8, 30))).toBe('2026-09-30')
    expect(HoyEntero('2026-09-30')).toBe('2026-09-30')
  })
})

describe('lunesDe', () => {
  it('devuelve el lunes de la semana de la fecha', () => {
    // 2026-09-30 es miércoles: su lunes es el 28.
    const lunes = lunesDe(new Date(2026, 8, 30))
    expect(lunes.getDay()).toBe(1)
    expect(lunes.getDate()).toBe(28)
  })

  it('el domingo devuelve el lunes de la semana anterior', () => {
    // 2026-10-04 es domingo.
    const lunes = lunesDe(new Date(2026, 9, 4))
    expect(lunes.getDay()).toBe(1)
    expect(lunes.getDate()).toBe(28)
  })
})

describe('formatearHora', () => {
  it('convierte la hora de la base a 12 h', () => {
    expect(formatearHora('14:30:00')).toBe('2:30 PM')
    expect(formatearHora('09:05')).toBe('9:05 AM')
    expect(formatearHora('12:00')).toBe('12:00 PM')
    expect(formatearHora('00:30')).toBe('12:30 AM')
  })

  it('deja el texto tal cual cuando no es una hora', () => {
    expect(formatearHora('')).toBe('—')
    expect(formatearHora(null)).toBe('—')
    expect(formatearHora('10:00 AM')).toBe('10:00 AM')
  })
})

describe('minutosDeHora', () => {
  it('devuelve los minutos desde medianoche', () => {
    expect(minutosDeHora('14:30')).toBe(870)
    expect(minutosDeHora('14:30:00')).toBe(870)
    expect(minutosDeHora(new Date(2026, 0, 1, 9, 5))).toBe(545)
  })

  it('devuelve null cuando no puede leer la hora', () => {
    expect(minutosDeHora('')).toBe(null)
    expect(minutosDeHora('noche')).toBe(null)
  })
})

describe('etiquetaFecha', () => {
  it('antepone el dia de la semana en español', () => {
    const texto = etiquetaFecha('2026-09-30')
    expect(texto.startsWith('Mié')).toBe(true)
    expect(texto).toContain('30')
  })
})

describe('formatRecordatorio', () => {
  it('devuelve cadena vacia si no hay marca o si no es una fecha', () => {
    expect(formatRecordatorio(null)).toBe('')
    expect(formatRecordatorio('')).toBe('')
    expect(formatRecordatorio('no-es-una-fecha')).toBe('')
  })

  it('devuelve la fecha y la hora cuando la marca es valida', () => {
    const texto = formatRecordatorio('2026-09-30T14:30:00.000Z')
    expect(texto).not.toBe('')
    expect(texto).toContain('30')
  })
})

describe('recortarHora', () => {
  it('recorta los segundos', () => {
    expect(recortarHora('14:30:00')).toBe('14:30')
    expect(recortarHora(null)).toBe('')
  })
})

describe('formato12h', () => {
  it('convierte a 12 h', () => {
    expect(formato12h('14:30')).toBe('2:30 PM')
    expect(formato12h('14:30:00')).toBe('2:30 PM')
    expect(formato12h('09:05')).toBe('9:05 AM')
    expect(formato12h('12:00')).toBe('12:00 PM')
  })
})

describe('formatearFecha', () => {
  it('escribe la fecha larga en español', () => {
    const texto = formatearFecha('2026-09-30')
    expect(texto).toContain('2026')
    expect(texto.length).toBeGreaterThan(5)
  })
})

describe('aDate', () => {
  it('combina fecha y hora en un Date local', () => {
    const d = aDate('2026-09-30', '14:30:00')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(8)
    expect(d.getDate()).toBe(30)
    expect(d.getHours()).toBe(14)
    expect(d.getMinutes()).toBe(30)
  })
})
