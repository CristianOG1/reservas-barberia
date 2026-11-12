// tests/unit/BarberosAdmin.test.jsx
// Equipo de barberos del panel: tarjetas, disponibilidad, filtros y borrado.
//
// Matriz v3: F-11 «Gestionar los barberos». La ficha de cada uno (alta, edicion, baja y
// disponibilidad)».

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabaseMock } from '../mocks/supabaseClient'
import {
  BARBEROS,
  llamadaDe,
  montarBarberosAdmin,
  tarjetaDe,
  usarRelojFijo,
} from '../helpers/fixturesCatalogo'

usarRelojFijo()

/** Devuelve la tarjeta de un barbero. */
function tarjetaDeBarbero(nombre) {
  return screen.getByText(nombre).closest('div.rounded-xl')
}

describe('BarberosAdmin · equipo', () => {
  it('F-11 · carga solo los barberos de la barbería activa', async () => {
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')

    const llamada = llamadaDe('barberos', 'select')
    expect(llamada.filtros).toEqual([{ op: 'eq', columna: 'barberia_id', valor: 'b1' }])
  })

  it('F-11 · cuenta las citas de hoy de la barbería', async () => {
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')

    const llamada = llamadaDe('citas', 'select')
    expect(llamada.filtros).toEqual([
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
      { op: 'eq', columna: 'fecha', valor: expect.any(String) },
    ])
  })

  it('F-11 · cada tarjeta muestra el nombre, la especialidad y las reseñas', async () => {
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')
    const tarjeta = tarjetaDeBarbero('Barbero Uno')

    expect(tarjeta).toHaveTextContent('Corte clasico')
    expect(tarjeta).toHaveTextContent('12 reseñas')
  })

  it('F-11 · el interruptor refleja la disponibilidad de cada barbero', async () => {
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')

    const uno = within(tarjetaDeBarbero('Barbero Uno')).getByRole('switch', {
      name: 'Disponible para Citas',
    })
    const dos = within(tarjetaDeBarbero('Barbero Dos')).getByRole('switch', {
      name: 'Disponible para Citas',
    })

    expect(uno).toHaveAttribute('aria-checked', 'true')
    expect(dos).toHaveAttribute('aria-checked', 'false')
  })

  it('F-11 · las métricas de equipo salen de los datos reales', async () => {
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')

    expect(tarjetaDe('En la Barbería Hoy')).toHaveTextContent('1')
    expect(tarjetaDe('En la Barbería Hoy')).toHaveTextContent('de un equipo de 2')
    expect(tarjetaDe('Pausa / Libre')).toHaveTextContent('1')
  })

  it('F-11 · cada tarjeta cuenta las citas de hoy de su barbero', async () => {
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')

    // El Barbero Uno tiene dos citas de hoy y el Dos una. Sin «de N slots»:
    // el salón no define cuántos huecos tiene.
    expect(tarjetaDeBarbero('Barbero Uno')).toHaveTextContent('2 citas')
    expect(tarjetaDeBarbero('Barbero Dos')).toHaveTextContent('1 cita')
  })
})

describe('BarberosAdmin · filtros', () => {
  it('F-11 · la pestaña de disponibles deja solo a los que pueden recibir citas', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')
    await user.click(screen.getByRole('button', { name: /Disponibles \(1\)/ }))

    await waitFor(() => {
      expect(screen.queryByText('Barbero Dos')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Barbero Uno')).toBeInTheDocument()
  })

  it('F-11 · el buscador filtra por nombre o especialidad', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')
    await user.type(screen.getByPlaceholderText('Buscar por nombre o especialidad...'), 'barba')

    await waitFor(() => {
      expect(screen.queryByText('Barbero Uno')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Barbero Dos')).toBeInTheDocument()
    expect(
      screen.queryByText('No hay barberos que coincidan con la búsqueda.')
    ).not.toBeInTheDocument()
  })

  it('F-11 · un equipo vacío ofrece dar de alta al primer barbero', async () => {
    montarBarberosAdmin({ datos: [] })

    await waitFor(() => {
      expect(
        screen.getByText('Aún no hay barberos registrados.')
      ).toBeInTheDocument()
    })
    // El botón del encabezado y el del estado vacío son los dos mismos.
    expect(screen.getAllByRole('button', { name: 'Dar de Alta Barbero' })).toHaveLength(2)
  })
})

describe('BarberosAdmin · disponibilidad', () => {
  it('F-11 · apagar la disponibilidad se escribe en su propia columna y acotado a la barbería', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    supabaseMock.on('barberos', 'update', (ctx) => ({
      data: [{ id: 'bar-1', disponible: ctx.carga.disponible }],
      error: null,
    }))
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')
    await user.click(
      within(tarjetaDeBarbero('Barbero Uno')).getByRole('switch', {
        name: 'Disponible para Citas',
      })
    )

    await waitFor(() => {
      expect(llamadaDe('barberos', 'update')).toBeDefined()
    })
    const llamada = llamadaDe('barberos', 'update')
    expect(llamada.carga).toEqual({ disponible: false })
    expect(llamada.filtros).toEqual([
      { op: 'eq', columna: 'id', valor: 'bar-1' },
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
  })

  it('F-11 · el interruptor se mueve al instante, antes de que la base responda', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    let resolver
    const pendiente = new Promise((r) => { resolver = r })
    supabaseMock.on('barberos', 'update', () => pendiente)
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')
    await user.click(
      within(tarjetaDeBarbero('Barbero Uno')).getByRole('switch', {
        name: 'Disponible para Citas',
      })
    )

    expect(
      within(tarjetaDeBarbero('Barbero Uno')).getByRole('switch', {
        name: 'Disponible para Citas',
      })
    ).toHaveAttribute('aria-checked', 'false')

    await resolver({ data: [{ id: 'bar-1', disponible: false }], error: null })
  })

  it('F-11 · si el cambio no se guarda, el interruptor vuelve a su valor y se avisa', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    // Un UPDATE que la RLS no deja pasar afecta 0 filas SIN lanzar error: el
    // panel lo comprueba con `.select()` y revierte el cambio optimista.
    supabaseMock.on('barberos', 'update', { data: [], error: null })
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')
    await user.click(
      within(tarjetaDeBarbero('Barbero Uno')).getByRole('switch', {
        name: 'Disponible para Citas',
      })
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudo guardar el cambio, intenta de nuevo.'
      )
    })
    expect(
      within(tarjetaDeBarbero('Barbero Uno')).getByRole('switch', {
        name: 'Disponible para Citas',
      })
    ).toHaveAttribute('aria-checked', 'true')
  })
})

describe('BarberosAdmin · eliminar', () => {
  it('F-11 · eliminar pide confirmación y borra acotado a la barbería', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Dos')
    await user.click(
      within(tarjetaDeBarbero('Barbero Dos')).getByRole('button', { name: 'Eliminar' })
    )

    await waitFor(() => {
      expect(llamadaDe('barberos', 'delete')).toBeDefined()
    })
    expect(confirmar).toHaveBeenCalledWith('¿Eliminar este barbero?')
    expect(llamadaDe('barberos', 'delete').filtros).toEqual([
      { op: 'eq', columna: 'id', valor: 'bar-2' },
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])

    confirmar.mockRestore()
  })

  it('F-11 · si se cancela la confirmación, no borra nada', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Dos')
    await user.click(
      within(tarjetaDeBarbero('Barbero Dos')).getByRole('button', { name: 'Eliminar' })
    )

    expect(llamadaDe('barberos', 'delete')).toBeUndefined()

    confirmar.mockRestore()
  })
})

describe('BarberosAdmin · abrir el formulario desde la tarjeta', () => {
  it('F-11 · el botón Editar abre el formulario con los datos del barbero', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')
    await user.click(within(tarjetaDeBarbero('Barbero Uno')).getByRole('button', { name: 'Editar' }))

    expect(screen.getByText('Editar Barbero')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre *')).toHaveValue('Barbero Uno')
    expect(screen.getByLabelText('Especialidad')).toHaveValue('Corte clasico')
  })

  it('F-11 · el botón de alta abre el formulario vacío y con la disponibilidad encendida', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')
    await user.click(screen.getByRole('button', { name: 'Dar de Alta Barbero' }))

    expect(screen.getByText('Nuevo Barbero')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre *')).toHaveValue('')
    // El switch del modal (el de las tarjetas de detrás también existe).
    const modal = screen.getByText('Nuevo Barbero').closest('div.fixed')
    expect(
      within(modal).getByRole('switch', { name: 'Disponible para Citas' })
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('F-11 · al guardar desde la tarjeta, el modal se cierra y la lista se recarga', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    supabaseMock.on('barberos', 'insert', { data: null, error: null })
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')
    await user.click(screen.getByRole('button', { name: 'Dar de Alta Barbero' }))
    await user.type(screen.getByLabelText('Nombre *'), 'Barbero Nuevo')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(screen.queryByText('Nuevo Barbero')).not.toBeInTheDocument()
    })
    const selects = supabaseMock.llamadas.filter(
      (c) => c.tipo === 'query' && c.tabla === 'barberos' && c.operacion === 'select'
    )
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })
})

describe('BarberosAdmin · errores', () => {
  it('F-11 · avisa cuando la carga del equipo falla y ofrece reintentar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarBarberosAdmin({ error: { message: 'sin permiso' } })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No pudimos cargar el equipo. Intenta de nuevo.'
      )
    })
    // Un fallo de red NO se ve como un equipo vacío.
    expect(
      screen.queryByText('Aún no hay barberos registrados.')
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(
        supabaseMock.llamadas.filter(
          (c) => c.tipo === 'query' && c.tabla === 'barberos' && c.operacion === 'select'
        ).length
      ).toBeGreaterThanOrEqual(2)
    })
  })

  it('F-11 · avisa cuando el borrado de un barbero falla', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
    supabaseMock.on('barberos', 'delete', { data: null, error: { message: 'sin permiso' } })
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Dos')
    await user.click(
      within(tarjetaDeBarbero('Barbero Dos')).getByRole('button', { name: 'Eliminar' })
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudo eliminar el barbero: sin permiso'
      )
    })
    // El barbero sigue en la lista: no se finge el borrado.
    expect(screen.getByText('Barbero Dos')).toBeInTheDocument()

    confirmar.mockRestore()
  })
})

describe('BarberosAdmin · huecos', () => {
  it('F-11 · la pestaña de los que no están disponibles se etiqueta bien', async () => {
    // La etiqueta se armaba con `No dispo${disponibles}s`, así que metía el
    // número de DISPONIBLES en mitad de la palabra: «No dispo1s (1)».
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')
    expect(
      screen.getByRole('button', { name: 'No disponibles (1)' })
    ).toBeInTheDocument()
  })

  it('F-11 · las cifras del panel salen de datos reales, sin capacidades inventadas', async () => {
    // `CAPACIDAD_SLOTS_ESTIMADA = 8` era un dato de ejemplo que se mostraba
    // como si fuera la agenda real. Ahora la tercera tarjeta dice quantas
    // citas hay HOY (dato real) y las barras de cada barbero son relativas al
    // mas ocupado del dia.
    montarBarberosAdmin({ datos: BARBEROS })

    await screen.findByText('Barbero Uno')

    // No queda ninguna cifra de «slots» ni la tarjeta de capacidad.
    expect(screen.queryByText('Capacidad operativa')).not.toBeInTheDocument()
    expect(screen.queryByText(/slots/)).not.toBeInTheDocument()

    // La tarjeta nueva: las 3 citas de hoy, repartidas entre 2 barberos.
    const tarjeta = screen.getByText('Citas de hoy').closest('div.rounded-xl')
    expect(tarjeta).toHaveTextContent('3')
    expect(tarjeta).toHaveTextContent('repartidas entre 2 barberos')
  })
})
