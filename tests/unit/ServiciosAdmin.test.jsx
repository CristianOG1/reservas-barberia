// tests/unit/ServiciosAdmin.test.jsx
// Catalogo de servicios del panel: lista, filtros, metricas, exportacion y
// borrado.
//
// Matriz v3: F-09 «Gestionar los servicios y sus precios».
// Las metricas se verifican contra los DATOS REALES de las fixtures: si
// alguien las cambia por valores de ejemplo, estos tests se rompen.

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabaseMock } from '../mocks/supabaseClient'
import {
  SERVICIOS,
  llamadaDe,
  leerTexto,
  montarServiciosAdmin,
  stubObjectUrl,
  tarjetaDe,
  usarRelojFijo,
} from '../helpers/fixturesCatalogo'

usarRelojFijo()

/** Devuelve la fila de la tabla de un servicio. */
function filaDe(servicio) {
  return screen.getByText(servicio).closest('tr')
}

describe('ServiciosAdmin · catalogo', () => {
  it('F-09 · carga solo los servicios de la barbería activa', async () => {
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')

    const llamada = llamadaDe('servicios', 'select')
    expect(llamada.filtros).toEqual([{ op: 'eq', columna: 'barberia_id', valor: 'b1' }])
    expect(llamada.orden).toEqual([
      { columna: 'created_at', opciones: { ascending: false } },
    ])
  })

  it('F-09 · cada fila muestra el nombre, la categoría, la duración y la tarifa', async () => {
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    const fila = filaDe('Corte de cabello')

    expect(fila).toHaveTextContent('Cabello')
    expect(fila).toHaveTextContent('30 min')
    expect(fila).toHaveTextContent('$150 MXN')
    expect(fila).toHaveTextContent('Corte clasico con lavado.')
  })

  it('F-09 · un servicio sin descripción lo dice en la tabla', async () => {
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte + Barba')
    expect(filaDe('Corte + Barba')).toHaveTextContent('Sin descripción')
  })

  it('F-09 · las métricas salen de los datos reales del catálogo', async () => {
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')

    // 3 servicios en 3 categorias.
    expect(tarjetaDe('Catálogo')).toHaveTextContent('3')
    expect(tarjetaDe('Catálogo')).toHaveTextContent('3 categorías en la carta')
    // (150 + 120 + 240) / 3 = 170.
    expect(tarjetaDe('Tarifa promedio')).toHaveTextContent('$170 MXN')
    expect(tarjetaDe('Tarifa promedio')).toHaveTextContent('rango de $120 a $240 MXN')
    // (30 + 50 + 60) / 3 = 46.67 -> 47. La duracion '50 min' tambien cuenta.
    expect(tarjetaDe('Duración promedio')).toHaveTextContent('47 min')
    expect(tarjetaDe('Duración promedio')).toHaveTextContent('servicios de 30 a 60 min')
  })

  it('F-09 · el buscador filtra por nombre o categoría', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    await user.type(screen.getByPlaceholderText('Filtrar por nombre o categoría...'), 'barba')

    await waitFor(() => {
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('1–2')
    })
    expect(screen.getByText('Perfilado de barba')).toBeInTheDocument()
    expect(screen.getByText('Corte + Barba')).toBeInTheDocument()
    expect(screen.queryByText('Corte de cabello')).not.toBeInTheDocument()
  })

  it('F-09 · el filtro por categoría deja solo esa categoría', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    await user.selectOptions(screen.getByLabelText('Filtrar por categoría'), 'Combo')

    await waitFor(() => {
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('1–1')
    })
    expect(screen.getByText('Corte + Barba')).toBeInTheDocument()
    expect(screen.queryByText('Corte de cabello')).not.toBeInTheDocument()
  })

  it('F-09 · avisa cuando ningún servicio coincide y ofrece limpiar los filtros', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    await user.type(screen.getByPlaceholderText('Filtrar por nombre o categoría...'), 'zzz')

    await waitFor(() => {
      expect(
        screen.getByText('Ningún servicio coincide con los filtros.')
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    await waitFor(() => {
      expect(screen.getByText('Corte de cabello')).toBeInTheDocument()
    })
  })

  it('F-09 · un catálogo vacío ofrece dar de alta el primer servicio', async () => {
    montarServiciosAdmin({ datos: [] })

    await waitFor(() => {
      expect(
        screen.getByText('Aún no hay servicios en el catálogo.')
      ).toBeInTheDocument()
    })
    // El botón del encabezado y el del estado vacío son los dos mismos.
    expect(
      screen.getAllByRole('button', { name: '+ Agregar Nuevo Servicio' })
    ).toHaveLength(2)
  })

  it('F-09 · la tabla pagina de ocho en ocho y avisa del rango', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const muchos = Array.from({ length: 9 }, (_, i) => ({
      id: `s${i}`,
      nombre: `Servicio ${i}`,
      categoria: 'Cabello',
      descripcion: '',
      costo: 100 + i,
      duracion: '30',
      imagen: null,
      created_at: '2026-03-01T00:00:00Z',
    }))
    montarServiciosAdmin({ datos: muchos })

    await screen.findByText('Servicio 0')
    expect(screen.getByText(/Mostrando/)).toHaveTextContent('1–8')
    expect(screen.getByText(/Mostrando/)).toHaveTextContent('de 9')

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    await waitFor(() => {
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('9–9')
    })
    expect(screen.queryByText('Servicio 0')).not.toBeInTheDocument()
    expect(screen.getByText('Servicio 8')).toBeInTheDocument()
  })
})

describe('ServiciosAdmin · eliminar', () => {
  it('F-09 · eliminar pide confirmación y borra acotado a la barbería', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    await user.click(screen.getByRole('button', { name: 'Eliminar Corte de cabello' }))

    await waitFor(() => {
      expect(llamadaDe('servicios', 'delete')).toBeDefined()
    })
    expect(confirmar).toHaveBeenCalledWith('¿Eliminar este servicio?')
    expect(llamadaDe('servicios', 'delete').filtros).toEqual([
      { op: 'eq', columna: 'id', valor: 's1' },
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])

    confirmar.mockRestore()
  })

  it('F-09 · si se cancela la confirmación, no borra nada', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    await user.click(screen.getByRole('button', { name: 'Eliminar Corte de cabello' }))

    expect(llamadaDe('servicios', 'delete')).toBeUndefined()

    confirmar.mockRestore()
  })
})

describe('ServiciosAdmin · exportar la carta', () => {
  it('F-09 · exporta un CSV con los servicios que se están viendo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const url = stubObjectUrl()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    await user.click(screen.getByRole('button', { name: 'Exportar Carta' }))

    expect(url.crear).toHaveBeenCalledTimes(1)
    const blob = url.crear.mock.calls[0][0]
    const csv = await leerTexto(blob)

    // Separador ';' para Excel en español y cada celda entre comillas.
    expect(csv).toContain('"Servicio";"Categoría";"Duración (min)";"Tarifa (MXN)";"Descripción"')
    expect(csv).toContain('"Corte de cabello";"Cabello";"30";"150";"Corte clasico con lavado."')
    // El archivo se descarga con nombre y la URL temporal se libera.
    expect(click).toHaveBeenCalled()
    expect(url.revocar).toHaveBeenCalled()

    url.restaurar()
    click.mockRestore()
  })

  it('F-09 · el CSV sale con los filtros aplicados, no con todo el catálogo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const url = stubObjectUrl()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    await user.selectOptions(screen.getByLabelText('Filtrar por categoría'), 'Combo')
    await user.click(screen.getByRole('button', { name: 'Exportar Carta' }))

    const csv = await leerTexto(url.crear.mock.calls[0][0])
    expect(csv).toContain('"Corte + Barba";"Combo";"60";"240";""')
    expect(csv).not.toContain('Corte de cabello')

    url.restaurar()
    click.mockRestore()
  })
})

describe('ServiciosAdmin · abrir el formulario desde la tabla', () => {
  it('F-09 · el botón Editar abre el formulario con los datos del servicio', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    await user.click(screen.getByRole('button', { name: 'Editar Corte de cabello' }))

    expect(screen.getByText('Editar Servicio')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre *')).toHaveValue('Corte de cabello')
    expect(screen.getByLabelText('Categoría *')).toHaveValue('Cabello')
    expect(screen.getByLabelText('Tarifa (MXN) *')).toHaveValue(150)
  })

  it('F-09 · el botón Ver abre el detalle del servicio, sin campo editable', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    await user.click(screen.getByRole('button', { name: 'Ver Corte de cabello' }))

    expect(screen.getByText('Detalle del Servicio')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre *')).toBeDisabled()
  })

  it('F-09 · el botón de alta abre el formulario vacío', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    await user.click(screen.getByRole('button', { name: '+ Agregar Nuevo Servicio' }))

    expect(screen.getByText('Nuevo Servicio')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre *')).toHaveValue('')
  })

  it('F-09 · al guardar desde la tabla, el modal se cierra y la lista se recarga', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    supabaseMock.on('servicios', 'insert', { data: null, error: null })
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    await user.click(screen.getByRole('button', { name: '+ Agregar Nuevo Servicio' }))
    await user.type(screen.getByLabelText('Nombre *'), 'Servicio nuevo')
    await user.type(screen.getByLabelText('Categoría *'), 'Cabello')
    await user.type(screen.getByLabelText('Tarifa (MXN) *'), '100')
    await user.type(screen.getByLabelText('Duración (min) *'), '30')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(screen.queryByText('Nuevo Servicio')).not.toBeInTheDocument()
    })
    // La tabla se vuelve a pedir para reflejar el servicio nuevo.
    const selects = supabaseMock.llamadas.filter(
      (c) => c.tipo === 'query' && c.tabla === 'servicios' && c.operacion === 'select'
    )
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })
})

describe('ServiciosAdmin · errores', () => {
  it('F-09 · avisa cuando la carga de los servicios falla y ofrece reintentar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarServiciosAdmin({ error: { message: 'sin permiso' } })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No pudimos cargar los servicios. Intenta de nuevo.'
      )
    })
    // Un fallo de red NO se ve como un catálogo vacío.
    expect(
      screen.queryByText('Aún no hay servicios en el catálogo.')
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()

    // Al reintentar se vuelve a pedir el catálogo.
    const selects = supabaseMock.llamadas.filter(
      (c) => c.tipo === 'query' && c.tabla === 'servicios' && c.operacion === 'select'
    )
    expect(selects).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(
        supabaseMock.llamadas.filter(
          (c) => c.tipo === 'query' && c.tabla === 'servicios' && c.operacion === 'select'
        ).length
      ).toBeGreaterThanOrEqual(2)
    })
  })

  it('F-09 · avisa cuando el borrado de un servicio falla', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
    supabaseMock.on('servicios', 'delete', { data: null, error: { message: 'sin permiso' } })
    montarServiciosAdmin({ datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    await user.click(screen.getByRole('button', { name: 'Eliminar Corte de cabello' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudo eliminar el servicio: sin permiso'
      )
    })
    // El servicio sigue en la lista: no se finge el borrado.
    expect(screen.getByText('Corte de cabello')).toBeInTheDocument()

    confirmar.mockRestore()
  })
})
