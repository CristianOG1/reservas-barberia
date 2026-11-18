// tests/unit/resumen.test.jsx
// Pruebas de cálculo del resumen: sin React, sin renderizar nada.

import { describe, expect, it } from 'vitest'
import { porcentajeOcupacionSemanal } from '../../src/utils/resumen'

const BARBEROS_DISPONIBLES = [
  { id: 'br-1', disponible: true },
  { id: 'br-2', disponible: true },
]
const BARBERO_UNO = [{ id: 'br-1', disponible: true }]
const SIN_DISPONIBLES = [{ id: 'br-1', disponible: false }]
const CITA_VIVA = (estado = 'pendiente') => ({ estado, fecha: '2026-03-12', hora: '10:00' })

describe('resumen · porcentajeOcupacionSemanal', () => {
  it('0 % cuando no hay citas', () => {
    const configuracion = { dias_cerrados: [0], bloques_horario: [{ horas: ['10:00', '11:00'] }] }
    expect(porcentajeOcupacionSemanal([], BARBEROS_DISPONIBLES, configuracion, '2026-03-12')).toBe(0)
  })

  it('ocupación sobre capacidad semanal: 2 citas de 48 horas-silla posibles = 4 %', () => {
    const configuracion = {
      dias_cerrados: [0],
      bloques_horario: [{ horas: ['10:00', '11:00', '12:00', '13:00'] }],
    }
    // 6 días × 4 horas × 2 barberos = 48; 2 citas => 4.166... → 4 %
    const citas = [CITA_VIVA(), CITA_VIVA('confirmada')]
    expect(porcentajeOcupacionSemanal(citas, BARBEROS_DISPONIBLES, configuracion, '2026-03-12')).toBe(4)
  })

  it('no cuenta citas canceladas', () => {
    const configuracion = {
      dias_cerrados: [0],
      bloques_horario: [{ horas: ['10:00', '11:00', '12:00', '13:00'] }],
    }
    const citas = [CITA_VIVA(), CITA_VIVA('cancelada')]
    // 1 cita activa / 48 = 2 %
    expect(porcentajeOcupacionSemanal(citas, BARBEROS_DISPONIBLES, configuracion, '2026-03-12')).toBe(2)
  })

  it('días cerrados reducen la capacidad', () => {
    const configuracion = {
      dias_cerrados: [0, 6], // domingo y sábado cerrados
      bloques_horario: [{ horas: ['10:00', '11:00'] }],
    }
    // 5 días × 2 horas × 2 barberos = 20; 1 cita => 5 %
    const citas = [CITA_VIVA()]
    expect(porcentajeOcupacionSemanal(citas, BARBEROS_DISPONIBLES, configuracion, '2026-03-12')).toBe(5)
  })

  it('un solo barbero disponible reduce la capacidad', () => {
    const configuracion = {
      dias_cerrados: [0],
      bloques_horario: [{ horas: ['10:00', '11:00', '12:00', '13:00'] }],
    }
    // 6 días × 4 horas × 1 barbero = 24; 1 cita => 4 %
    const citas = [CITA_VIVA()]
    expect(porcentajeOcupacionSemanal(citas, BARBERO_UNO, configuracion, '2026-03-12')).toBe(4)
  })

  it('acota al 100 % aunque las citas superen la capacidad', () => {
    const configuracion = { dias_cerrados: [0], bloques_horario: [{ horas: ['10:00'] }] }
    const citas = Array.from({ length: 10 }, () => CITA_VIVA())
    // 6 días × 1 hora × 2 barberos = 12; 10 citas => 83 % (no supera 100)
    expect(porcentajeOcupacionSemanal(citas, BARBEROS_DISPONIBLES, configuracion, '2026-03-12')).toBe(83)
  })

  it('sin barberos disponibles: capacidad es 1 (no divide por cero)', () => {
    const configuracion = { dias_cerrados: [0], bloques_horario: [{ horas: ['10:00'] }] }
    const citas = [CITA_VIVA()]
    // 6 días × 1 hora × 1 (mínimo) = 6; 1 cita => 17 % (16.66 redondeado)
    expect(porcentajeOcupacionSemanal(citas, SIN_DISPONIBLES, configuracion, '2026-03-12')).toBe(17)
  })

  it('sin configuración: bloques y días cerrados por defecto', () => {
    // Default: 7 días × 9 horas × 2 barberos = 126; 1 cita => 0 % (redondeado)
    const citas = [CITA_VIVA()]
    expect(porcentajeOcupacionSemanal(citas, BARBEROS_DISPONIBLES, null, '2026-03-12')).toBe(1)
  })
})
