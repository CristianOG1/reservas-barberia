// tests/unit/ServicioForm.test.jsx
// Modal de alta, edicion y detalle de un servicio.
//
// Matriz v3: F-09 «Gestionar los servicios y sus precios».

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabaseMock } from '../mocks/supabaseClient'
import {
  SERVICIOS,
  llamadaDe,
  montarServicioForm,
  stubObjectUrl,
  usarRelojFijo,
} from '../helpers/fixturesCatalogo'

usarRelojFijo()

/** Rellena el formulario con los datos de un servicio nuevo. */
async function rellenar(user, { nombre = 'Corte nuevo', categoria = 'Cabello', costo = '180', duracion = '25' } = {}) {
  await user.type(screen.getByLabelText('Nombre *'), nombre)
  await user.type(screen.getByLabelText('Categoría *'), categoria)
  await user.type(screen.getByLabelText('Descripción'), 'Servicio de prueba.')
  await user.type(screen.getByLabelText('Tarifa (MXN) *'), costo)
  await user.type(screen.getByLabelText('Duración (min) *'), duracion)
}

describe('ServicioForm · alta', () => {
  it('F-09 · guarda el servicio nuevo con la tarifa en número y la barbería de la fila', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const guardado = vi.fn()
    montarServicioForm({ onGuardado: guardado })

    await rellenar(user)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(guardado).toHaveBeenCalled()
    })

    const llamada = llamadaDe('servicios', 'insert')
    expect(llamada.carga[0]).toEqual({
      nombre: 'Corte nuevo',
      categoria: 'Cabello',
      descripcion: 'Servicio de prueba.',
      costo: 180,
      duracion: '25',
      imagen: null,
      barberia_id: 'b1',
    })
  })

  it('F-09 · el título del modal es el de un servicio nuevo', () => {
    montarServicioForm()

    expect(screen.getByText('Nuevo Servicio')).toBeInTheDocument()
    expect(screen.queryByText('Editar Servicio')).not.toBeInTheDocument()
  })

  it('F-09 · si la escritura falla, sale el aviso y no se avisa de guardado', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const guardado = vi.fn()
    supabaseMock.on('servicios', 'insert', { data: null, error: { message: 'duplicado' } })
    montarServicioForm({ onGuardado: guardado })

    await rellenar(user)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal, intenta de nuevo.')
    })
    expect(guardado).not.toHaveBeenCalled()
  })
})

describe('ServicioForm · edición', () => {
  it('F-09 · la edición carga los datos del servicio y actualiza solo ese registro', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const guardado = vi.fn()
    const servicio = {
      id: 's1', nombre: 'Corte de cabello', categoria: 'Cabello',
      descripcion: 'Corte clasico con lavado.', costo: 150, duracion: '30',
      imagen: 'https://ejemplo.com/foto.png',
    }
    montarServicioForm({ servicio, onGuardado: guardado })

    // El formulario llega con los valores del servicio.
    expect(screen.getByLabelText('Nombre *')).toHaveValue('Corte de cabello')
    expect(screen.getByLabelText('Tarifa (MXN) *')).toHaveValue(150)
    expect(screen.getByText('Editar Servicio')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Tarifa (MXN) *'))
    await user.type(screen.getByLabelText('Tarifa (MXN) *'), '175')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(guardado).toHaveBeenCalled()
    })

    const llamada = llamadaDe('servicios', 'update')
    expect(llamada.carga).toEqual({
      nombre: 'Corte de cabello',
      categoria: 'Cabello',
      descripcion: 'Corte clasico con lavado.',
      costo: 175,
      duracion: '30',
      imagen: 'https://ejemplo.com/foto.png',
    })
    expect(llamada.filtros).toEqual([{ op: 'eq', columna: 'id', valor: 's1' }])
  })

  it('F-09 · sin imagen nueva se conserva la que ya tenía, sin volver a subirla', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarServicioForm({
      servicio: {
        id: 's1', nombre: 'Corte de cabello', categoria: 'Cabello',
        descripcion: '', costo: 150, duracion: '30',
        imagen: 'https://ejemplo.com/foto.png',
      },
    })

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(llamadaDe('servicios', 'update')).toBeDefined()
    })
    expect(llamadaDe('servicios', 'update').carga.imagen).toBe('https://ejemplo.com/foto.png')
    const subidas = supabaseMock.llamadas.filter((c) => c.tipo === 'storage.upload')
    expect(subidas).toHaveLength(0)
  })

  it('F-09 · al elegir una imagen se sube a la carpeta de la barbería y se guarda su URL', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const url = stubObjectUrl()
    montarServicioForm()

    await rellenar(user)
    await user.upload(
      screen.getByLabelText('Imagen del servicio'),
      new File(['contenido'], 'foto.png', { type: 'image/png' })
    )
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(llamadaDe('servicios', 'insert')).toBeDefined()
    })
    const guardada = llamadaDe('servicios', 'insert').carga[0].imagen
    expect(guardada).toContain('/imagenes/b1/servicios/')
    expect(guardada).toContain('-foto.png')

    url.restaurar()
  })
})

describe('ServicioForm · detalle', () => {
  it('F-09 · en modo detalle los campos van deshabilitados y solo hay un botón', () => {
    montarServicioForm({ servicio: SERVICIOS[0], soloLectura: true })

    expect(screen.getByText('Detalle del Servicio')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre *')).toBeDisabled()
    expect(screen.getByLabelText('Categoría *')).toBeDisabled()
    expect(screen.getByLabelText('Tarifa (MXN) *')).toBeDisabled()
    expect(screen.getByLabelText('Duración (min) *')).toBeDisabled()
    // No hay selector de archivo ni botón de guardar.
    expect(screen.queryByLabelText('Imagen del servicio')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
  })

  it('F-09 · el modo detalle avisa de si el servicio tiene imagen', () => {
    montarServicioForm({ servicio: SERVICIOS[0], soloLectura: true })
    expect(screen.getByText('Este servicio no tiene imagen.')).toBeInTheDocument()
  })
})

describe('ServicioForm · huecos', () => {
  it.fails('F-09 · la edición acota la escritura a la barbería', async () => {
    // HUECO REAL: el alta mete `barberia_id` en el insert y el listado borra
    // con `.eq('id').eq('barberia_id')`, pero la EDICION solo filtra por
    // `.eq('id')`. La RLS lo impide de todos modos (politica `Admin escribe`,
    // AGENTS.md §10.5), asi que no es una fuga de datos: es que la consulta no
    // lleva el mismo acotado que el resto de escrituras del panel.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarServicioForm({ servicio: SERVICIOS[0] })

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(llamadaDe('servicios', 'update')).toBeDefined()
    })
    expect(llamadaDe('servicios', 'update').filtros).toEqual([
      { op: 'eq', columna: 'id', valor: 's1' },
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
  })
})
