// tests/unit/BarberoForm.test.jsx
// Modal de alta y edicion de un barbero.
//
// Matriz v3: F-11 «Gestionar los barberos». La ficha de cada uno (alta, edicion, baja y
// disponibilidad)».

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabaseMock } from '../mocks/supabaseClient'
import {
  BARBEROS,
  llamadaDe,
  montarBarberoForm,
  stubObjectUrl,
  usarRelojFijo,
} from '../helpers/fixturesCatalogo'

usarRelojFijo()

/** Rellena el formulario con los datos de un barbero nuevo. */
async function rellenar(user, { nombre = 'Barbero Nuevo', especialidad = 'Fade' } = {}) {
  await user.type(screen.getByLabelText('Nombre *'), nombre)
  await user.type(screen.getByLabelText('Especialidad'), especialidad)
}

describe('BarberoForm · alta', () => {
  it('F-11 · guarda el barbero nuevo disponible y con la barbería de la fila', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const guardado = vi.fn()
    montarBarberoForm({ onGuardado: guardado })

    await rellenar(user)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(guardado).toHaveBeenCalled()
    })

    const llamada = llamadaDe('barberos', 'insert')
    expect(llamada.carga[0]).toEqual({
      nombre: 'Barbero Nuevo',
      especialidad: 'Fade',
      disponible: true,
      imagen: null,
      barberia_id: 'b1',
    })
  })

  it('F-11 · un barbero nuevo nace con el interruptor de disponibilidad encendido', () => {
    montarBarberoForm()

    expect(
      screen.getByRole('switch', { name: 'Disponible para Citas' })
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('F-11 · el interruptor apaga la disponibilidad antes de guardar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarBarberoForm()

    await rellenar(user)
    await user.click(screen.getByRole('switch', { name: 'Disponible para Citas' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(llamadaDe('barberos', 'insert')).toBeDefined()
    })
    expect(llamadaDe('barberos', 'insert').carga[0].disponible).toBe(false)
  })

  it('F-11 · si la escritura falla, sale el aviso y no se avisa de guardado', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const guardado = vi.fn()
    supabaseMock.on('barberos', 'insert', { data: null, error: { message: 'duplicado' } })
    montarBarberoForm({ onGuardado: guardado })

    await rellenar(user)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal, intenta de nuevo.')
    })
    expect(guardado).not.toHaveBeenCalled()
  })
})

describe('BarberoForm · edición', () => {
  it('F-11 · la edición carga los datos del barbero y actualiza solo ese registro', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const guardado = vi.fn()
    montarBarberoForm({ barbero: BARBEROS[0], onGuardado: guardado })

    expect(screen.getByLabelText('Nombre *')).toHaveValue('Barbero Uno')
    expect(screen.getByLabelText('Especialidad')).toHaveValue('Corte clasico')
    expect(screen.getByText('Editar Barbero')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Nombre *'))
    await user.type(screen.getByLabelText('Nombre *'), 'Barbero Uno B.')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(guardado).toHaveBeenCalled()
    })

    const llamada = llamadaDe('barberos', 'update')
    expect(llamada.carga).toEqual({
      nombre: 'Barbero Uno B.',
      especialidad: 'Corte clasico',
      disponible: true,
      imagen: null,
    })
    expect(llamada.filtros).toEqual([
      { op: 'eq', columna: 'id', valor: 'bar-1' },
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
  })

  it('F-11 · en edición el interruptor muestra la disponibilidad actual', () => {
    montarBarberoForm({ barbero: BARBEROS[1] })

    expect(
      screen.getByRole('switch', { name: 'Disponible para Citas' })
    ).toHaveAttribute('aria-checked', 'false')
  })

  it('F-11 · en edición se puede cambiar la disponibilidad', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarBarberoForm({ barbero: BARBEROS[1] })

    await user.click(screen.getByRole('switch', { name: 'Disponible para Citas' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(llamadaDe('barberos', 'update')).toBeDefined()
    })
    expect(llamadaDe('barberos', 'update').carga.disponible).toBe(true)
  })

  it('F-11 · al elegir una foto se sube a la carpeta de la barbería y se guarda su URL', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const url = stubObjectUrl()
    montarBarberoForm()

    await rellenar(user)
    await user.upload(
      screen.getByLabelText('Fotografía'),
      new File(['contenido'], 'avatar.png', { type: 'image/png' })
    )
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(llamadaDe('barberos', 'insert')).toBeDefined()
    })
    const guardada = llamadaDe('barberos', 'insert').carga[0].imagen
    expect(guardada).toContain('/imagenes/b1/barberos/')
    expect(guardada).toContain('-avatar.png')

    url.restaurar()
  })
})

describe('BarberoForm · huecos', () => {
  it('F-11 · la edición acota la escritura a la barbería', async () => {
    // Defensa en profundidad: el alta mete `barberia_id` en el insert y el
    // listado borra con `.eq(`id`).eq(`barberia_id`)`; ahora la EDICIÓN también
    // lleva el acotado. La RLS ya lo impedía (AGENTS.md §10.5).
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarBarberoForm({ barbero: BARBEROS[0] })

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(llamadaDe('barberos', 'update')).toBeDefined()
    })
    expect(llamadaDe('barberos', 'update').filtros).toEqual([
      { op: 'eq', columna: 'id', valor: 'bar-1' },
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
  })
})
