// tests/unit/citas.test.js
// Fija el comportamiento ACTUAL de la logica de cita y de su catalogo.

import { describe, expect, it } from 'vitest'
import {
  buscarServicio,
  duracionTotalCita,
  estadoDe,
  mensajeRecordatorio,
  normalizar,
  partirServicios,
  productosCita,
} from '../../src/utils/citas'

const CATALOGO = [
  { nombre: 'Corte de cabello', categoria: 'Cabello', duracion: '30' },
  { nombre: 'Corte y barba', categoria: 'Combo', duracion: '60' },
  { nombre: 'Barba', categoria: 'Barba', duracion: '30' },
]

describe('estadoDe', () => {
  it('devuelve el estado de la cita', () => {
    expect(estadoDe({ estado: 'confirmada' })).toBe('confirmada')
  })

  it('devuelve pendiente cuando la cita no tiene estado', () => {
    expect(estadoDe({})).toBe('pendiente')
    expect(estadoDe({ estado: null })).toBe('pendiente')
  })
})

describe('normalizar', () => {
  it('pasa a minusculas y quita los acentos', () => {
    expect(normalizar('Barbería')).toBe('barberia')
    expect(normalizar('  CORTE  ')).toBe('corte')
  })

  it('devuelve cadena vacia si no hay texto', () => {
    expect(normalizar(null)).toBe('')
    expect(normalizar(undefined)).toBe('')
  })
})

describe('partirServicios', () => {
  it('parte la lista de servicios por coma', () => {
    expect(partirServicios('Corte de cabello, Barba')).toEqual(['Corte de cabello', 'Barba'])
  })

  it('devuelve lista vacia si no hay texto', () => {
    expect(partirServicios('')).toEqual([])
    expect(partirServicios(null)).toEqual([])
  })
})

describe('buscarServicio', () => {
  it('encuentra por nombre exacto ignorando acentos y mayusculas', () => {
    expect(buscarServicio('corte de cabello', CATALOGO).nombre).toBe('Corte de cabello')
  })

  it('encuentra por categoria exacta', () => {
    expect(buscarServicio('Barba', CATALOGO).nombre).toBe('Barba')
  })

  it('encuentra cuando el nombre contiene la categoria', () => {
    expect(buscarServicio('Perfilado de barba', CATALOGO).categoria).toBe('Barba')
  })

  it('devuelve null cuando no encuentra nada', () => {
    expect(buscarServicio('Tinte', CATALOGO)).toBe(null)
    expect(buscarServicio('', CATALOGO)).toBe(null)
  })
})

describe('duracionTotalCita', () => {
  it('suma la duracion de todos los servicios', () => {
    expect(duracionTotalCita({ servicio: 'Corte de cabello, Barba' }, CATALOGO)).toBe(60)
  })

  it('usa el valor por defecto cuando el servicio no esta en el catalogo', () => {
    expect(duracionTotalCita({ servicio: 'Tinte' }, CATALOGO)).toBe(30)
  })

  it('usa el valor por defecto cuando la cita no tiene servicios', () => {
    expect(duracionTotalCita({ servicio: '' }, CATALOGO)).toBe(30)
  })
})

describe('productosCita', () => {
  it('devuelve el array tal cual', () => {
    const productos = [{ nombre: 'Aceite', precio: 150 }]
    expect(productosCita({ productos })).toEqual(productos)
  })

  it('parsea el json cuando llega como texto', () => {
    expect(productosCita({ productos: '[{"nombre":"Aceite","precio":150}]' })).toEqual([
      { nombre: 'Aceite', precio: 150 },
    ])
  })

  it('devuelve lista vacia si no hay datos o no se pueden parsear', () => {
    expect(productosCita({ productos: null })).toEqual([])
    expect(productosCita({ productos: 'no-es-json' })).toEqual([])
    expect(productosCita({ productos: '{"a":1}' })).toEqual([])
  })
})

describe('mensajeRecordatorio', () => {
  it('arma el texto con el nombre, el salon, la fecha, la hora y el servicio', () => {
    const texto = mensajeRecordatorio(
      { nombre: 'Cliente', fecha: '2026-09-30', hora: '14:30:00', servicio: 'Barba' },
      'Salon Demo'
    )
    expect(texto).toContain('Cliente')
    expect(texto).toContain('Salon Demo')
    expect(texto).toContain('2:30 PM')
    expect(texto).toContain('Barba')
  })
})
