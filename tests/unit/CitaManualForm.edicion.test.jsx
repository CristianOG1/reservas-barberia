// tests/unit/CitaManualForm.edicion.test.jsx
// El modal de cita manual en modo EDICION: el que abre el boton
// "Reprogramar" de la agenda del panel.
//
// Matriz v3: F-08 «Gestionar la agenda de citas y el resumen del salon».

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabaseMock } from '../mocks/supabaseClient'
import {
  BARBERIA,
  llamadaDe,
  montarCitaManual,
  usarRelojFijo,
} from '../helpers/fixturesCitas'

usarRelojFijo()

/** Una cita ya existente, tal como la devuelve la agenda. */
const CITA = {
  id: 'c9',
  nombre: 'Cliente Programado',
  telefono: '5512345678',
  correo: 'cliente@ejemplo.com',
  servicio: 'Barba',
  fecha: '2026-03-15',
  hora: '11:30:00',
  barbero_id: 'bar-2',
  total: 120,
  notas: 'Traer la afeitada previa.',
  estado: 'confirmada',
}

describe('CitaManualForm · modo edición (reprogramar)', () => {
  it('F-08 · el modal se titula «Reprogramar cita» y trae los datos de la cita', () => {
    montarCitaManual({ cita: CITA })

    expect(screen.getByText('Reprogramar cita')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del cliente *')).toHaveValue('Cliente Programado')
    expect(screen.getByLabelText('Teléfono (WhatsApp) *')).toHaveValue('5512345678')
    expect(screen.getByLabelText('Correo')).toHaveValue('cliente@ejemplo.com')
    expect(screen.getByLabelText('Fecha *')).toHaveValue('2026-03-15')
    // La hora llega como '11:30:00' y se recorta a '11:30'.
    expect(screen.getByLabelText('Hora *')).toHaveValue('11:30')
    expect(screen.getByLabelText('Barbero asignado')).toHaveValue('bar-2')
    expect(screen.getByLabelText('Total a cobrar (MXN)')).toHaveValue(120)
    expect(screen.getByLabelText('Notas')).toHaveValue('Traer la afeitada previa.')
  })

  it('F-08 · al guardar se ACTUALIZA la cita, no se inserta otra', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const guardada = vi.fn()
    montarCitaManual({ cita: CITA, onGuardado: guardada })

    await user.clear(screen.getByLabelText('Hora *'))
    await user.type(screen.getByLabelText('Hora *'), '16:00')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(guardada).toHaveBeenCalled()
    })

    expect(llamadaDe('citas', 'insert')).toBeUndefined()
    const llamada = llamadaDe('citas', 'update')
    expect(llamada.filtros).toEqual([{ op: 'eq', columna: 'id', valor: 'c9' }])
    expect(llamada.carga).toMatchObject({
      nombre: 'Cliente Programado',
      telefono: '5512345678',
      servicio: 'Barba',
      fecha: '2026-03-15',
      hora: '16:00',
      barbero_id: 'bar-2',
      total: 120,
    })
  })

  it('F-08 · al reprogramar no se toca el estado de la cita', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitaManual({ cita: CITA })

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(llamadaDe('citas', 'update')).toBeDefined()
    })
    // En alta manual la cita nace 'pendiente'; al reprogramar no se toca.
    expect(llamadaDe('citas', 'update').carga).not.toHaveProperty('estado')
  })

  it('F-08 · al cambiar el servicio se propone el precio del catálogo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitaManual({ cita: CITA })

    await user.selectOptions(screen.getByLabelText('Servicio contratado *'), 'Corte de cabello')

    // «Corte de cabello» cuesta 150 en el catálogo.
    expect(screen.getByLabelText('Total a cobrar (MXN)')).toHaveValue(150)
  })

  it('F-08 · si la actualización falla, sale el aviso y no se avisa de guardado', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const guardada = vi.fn()
    supabaseMock.on('citas', 'update', { data: null, error: { message: 'sin permiso' } })
    montarCitaManual({ cita: CITA, onGuardado: guardada })

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal, intenta de nuevo.')
    })
    expect(guardada).not.toHaveBeenCalled()
  })
})

describe('CitaManualForm · huecos', () => {
  it.fails('F-08 · la reprogramación acota la escritura a la barbería', async () => {
    // HUECO REAL: el alta manual mete `barberia_id` en el insert, pero la
    // EDICION solo filtra por `.eq('id')`. La RLS lo impide de todos modos
    // (politica `Admin escribe`, AGENTS.md §10.5), asi que no es una fuga de
    // datos: es que la consulta no lleva el mismo acotado que el alta.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitaManual({ cita: CITA })

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(llamadaDe('citas', 'update')).toBeDefined()
    })
    expect(llamadaDe('citas', 'update').filtros).toEqual([
      { op: 'eq', columna: 'id', valor: 'c9' },
      { op: 'eq', columna: 'barberia_id', valor: BARBERIA.id },
    ])
  })
})
