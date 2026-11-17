// tests/unit/borrador.test.js
// Fija el comportamiento ACTUAL del borrador de la reservacion.

import { beforeEach, describe, expect, it } from 'vitest'
import { borrarBorrador, guardarBorrador, leerBorrador } from '../../src/utils/borrador'

const CLAVE = 'borradorReserva'
const DOS_HORAS = 2 * 60 * 60 * 1000

describe('borrador de la reservacion', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('guarda y vuelve a leer lo que eligio el cliente', () => {
    guardarBorrador({ serviciosElegidos: [{ id: 'a1' }], pasoActual: 2 })
    const b = leerBorrador()
    expect(b.serviciosElegidos).toEqual([{ id: 'a1' }])
    expect(b.pasoActual).toBe(2)
    expect(typeof b.guardadoEn).toBe('number')
  })

  it('devuelve null si no hay borrador', () => {
    expect(leerBorrador()).toBe(null)
  })

  it('descarta el borrador que ya paso de las dos horas', () => {
    sessionStorage.setItem(
      CLAVE,
      JSON.stringify({ guardadoEn: Date.now() - DOS_HORAS - 1000, pasoActual: 1 })
    )
    expect(leerBorrador()).toBe(null)
  })

  it('conserva el borrador dentro de las dos horas', () => {
    sessionStorage.setItem(
      CLAVE,
      JSON.stringify({ guardadoEn: Date.now() - DOS_HORAS + 1000, pasoActual: 1 })
    )
    expect(leerBorrador()).not.toBe(null)
  })

  it('descarta la fecha y la hora si el dia elegido ya paso', () => {
    sessionStorage.setItem(
      CLAVE,
      JSON.stringify({
        guardadoEn: Date.now(),
        fechaElegida: '2020-01-01',
        horaElegida: '10:00',
        serviciosElegidos: [{ id: 'a1' }],
      })
    )
    const b = leerBorrador()
    expect(b.fechaElegida).toBe(null)
    expect(b.horaElegida).toBe(null)
    expect(b.serviciosElegidos).toEqual([{ id: 'a1' }])
  })

  it('devuelve null si el contenido guardado no es json valido', () => {
    sessionStorage.setItem(CLAVE, 'esto-no-es-json')
    expect(leerBorrador()).toBe(null)
  })

  it('borra el borrador', () => {
    guardarBorrador({ pasoActual: 3 })
    expect(leerBorrador()).not.toBe(null)
    borrarBorrador()
    expect(leerBorrador()).toBe(null)
  })
})
