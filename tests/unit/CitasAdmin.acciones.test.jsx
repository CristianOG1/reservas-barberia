// tests/unit/CitasAdmin.acciones.test.jsx
// Las acciones rapidas de cada fila segun el estado de la cita, y lo que pasa
// cuando la escritura en la base falla.
//
// Matriz v3: F-06 «Gestionar el estado de una cita» y F-08 (la agenda).

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabaseMock } from '../mocks/supabaseClient'
import {
  dentroDeLaFila,
  esperarFila,
  filaDe,
  llamadaDe,
  montarCitasAdmin,
  usarRelojFijo,
} from '../helpers/fixturesCitas'

usarRelojFijo()

/** Los nombres de los botones de accion de una fila. */
function accionesDe(cliente) {
  const fila = filaDe(cliente)
  return Array.from(fila.querySelectorAll('button'))
    .map((b) => b.textContent.trim())
    .filter((t) => t && t !== '×')
}

describe('CitasAdmin · acciones por estado', () => {
  it('F-06 · una cita pendiente ofrece recontactar, confirmar y cancelar', async () => {
    montarCitasAdmin()

    await esperarFila('Luis')
    const acciones = accionesDe('Luis')
    expect(acciones).toContain('Recontactar')
    expect(acciones).toContain('Confirmar')
    expect(acciones).toContain('Cancelar')
    expect(acciones).not.toContain('Completar')
  })

  it('F-06 · una cita confirmada ofrece completar, cobrar y reprogramar', async () => {
    montarCitasAdmin()

    await esperarFila('Ana')
    const acciones = accionesDe('Ana')
    expect(acciones).toContain('Completar')
    expect(acciones).toContain('Cobrar')
    expect(acciones).toContain('Reprogramar')
    expect(acciones).not.toContain('Confirmar')
  })

  it('F-06 · una cita completada solo ofrece reprogramar', async () => {
    montarCitasAdmin()

    await esperarFila('Nico')
    const acciones = accionesDe('Nico')
    expect(acciones).toContain('Reprogramar')
    expect(acciones).not.toContain('Confirmar')
    expect(acciones).not.toContain('Completar')
    expect(acciones).not.toContain('Cancelar')
  })

  it('F-06 · una cita cancelada solo ofrece reactivar', async () => {
    montarCitasAdmin()

    await esperarFila('Marta')
    const acciones = accionesDe('Marta')
    expect(acciones).toContain('Reactivar')
    expect(acciones).not.toContain('Confirmar')
    expect(acciones).not.toContain('Completar')
  })
})

describe('CitasAdmin · escritura del estado', () => {
  it('F-06 · confirmar cambia el estado a confirmada y acota la escritura a la cita y a la barbería', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitasAdmin()

    await esperarFila('Luis')
    await user.click(dentroDeLaFila('Luis').getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => {
      expect(filaDe('Luis')).toHaveTextContent('Confirmada')
    })

    const llamada = llamadaDe('citas', 'update')
    expect(llamada.carga).toEqual({ estado: 'confirmada' })
    // La escritura nunca puede tocar una cita de otra barbería.
    expect(llamada.filtros).toEqual([
      { op: 'eq', columna: 'id', valor: 'c2' },
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
  })

  it('F-06 · cancelar pide confirmación y deja la cita cancelada', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
    montarCitasAdmin()

    await esperarFila('Luis')
    await user.click(dentroDeLaFila('Luis').getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => {
      expect(filaDe('Luis')).toHaveTextContent('Cancelada')
    })
    expect(confirmar).toHaveBeenCalledWith('¿Cancelar la cita de Luis?')
    expect(llamadaDe('citas', 'update').carga).toEqual({ estado: 'cancelada' })

    confirmar.mockRestore()
  })

  it('F-06 · si se cancela el diálogo, la cita no cambia', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    montarCitasAdmin()

    await esperarFila('Luis')
    await user.click(dentroDeLaFila('Luis').getByRole('button', { name: 'Cancelar' }))

    expect(filaDe('Luis')).toHaveTextContent('Pendiente')
    expect(llamadaDe('citas', 'update')).toBeUndefined()

    confirmar.mockRestore()
  })

  it('F-06 · completar deja la cita completada', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitasAdmin()

    await esperarFila('Ana')
    await user.click(dentroDeLaFila('Ana').getByRole('button', { name: 'Completar' }))

    await waitFor(() => {
      expect(filaDe('Ana')).toHaveTextContent('Completada')
    })
    expect(llamadaDe('citas', 'update').carga).toEqual({ estado: 'completada' })
  })

  it('F-06 · reactivar devuelve una cita cancelada a la cola de pendientes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitasAdmin()

    await esperarFila('Marta')
    await user.click(dentroDeLaFila('Marta').getByRole('button', { name: 'Reactivar' }))

    await waitFor(() => {
      expect(filaDe('Marta')).toHaveTextContent('Pendiente')
    })
    expect(llamadaDe('citas', 'update').carga).toEqual({ estado: 'pendiente' })
  })

  it('F-06 · el estado cambia en pantalla antes de que la base responda', async () => {
    // Actualización optimista: la fila se repinta al instante, sin esperar.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    let resolver
    const pendiente = new Promise((r) => { resolver = r })
    supabaseMock.on('citas', 'update', () => pendiente)
    montarCitasAdmin()

    await esperarFila('Luis')
    await user.click(dentroDeLaFila('Luis').getByRole('button', { name: 'Confirmar' }))

    // Todavía no hay respuesta de la base, pero la fila ya está confirmada.
    expect(filaDe('Luis')).toHaveTextContent('Confirmada')

    await resolver({ data: null, error: null })
  })

  it('F-06 · si la escritura falla, el estado vuelve al anterior y se avisa', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    supabaseMock.on('citas', 'update', { data: null, error: { message: 'sin permiso' } })
    montarCitasAdmin()

    await esperarFila('Luis')
    await user.click(dentroDeLaFila('Luis').getByRole('button', { name: 'Confirmar' }))

    // «Confirmar» usa el hook compartido, que tiene su propio mensaje.
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudo confirmar la cita: sin permiso'
      )
    })
    // La fila vuelve a su estado anterior.
    expect(filaDe('Luis')).toHaveTextContent('Pendiente')
  })

  it('F-06 · si falla una acción de estado, se avisa con el mensaje de «aplicarEstado»', async () => {
    // «Completar» y «Cancelar» van por `aplicarEstado`, que tiene otro mensaje
    // que el hook de confirmar.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    supabaseMock.on('citas', 'update', { data: null, error: { message: 'sin permiso' } })
    montarCitasAdmin()

    await esperarFila('Ana')
    await user.click(dentroDeLaFila('Ana').getByRole('button', { name: 'Completar' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudo actualizar el estado de la cita: sin permiso'
      )
    })
    expect(filaDe('Ana')).toHaveTextContent('Confirmada')
  })
})
