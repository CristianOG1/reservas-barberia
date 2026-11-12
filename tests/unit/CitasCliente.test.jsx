// tests/unit/CitasCliente.test.jsx
// Portal del cliente: sus citas, el corte entre proximas e historial, y las
// dos acciones que puede hacer sobre una cita (cancelar y reagendar).
//
// Matriz v3: F-07 «Consultar las citas propias y el historial» (el listado) y
// F-06 «Gestionar el estado de una cita» (cancelar y reagendar). Las dos
// acciones pasan por RPC (`cancelar_cita` y `reagendar_cita`), que son las que
// autorizan en el servidor.
//
// El reloj va fijo (2026-03-11, miercoles, 10:00) para que la separacion
// entre proximas e historial no dependa del momento de la ejecucion.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CitasCliente from '../../src/pages/cliente/CitasCliente'
import { renderWithProviders, sesionSimulada } from '../helpers/renderWithProviders'
import { supabaseMock } from '../mocks/supabaseClient'

vi.mock('../../src/context/useAuth', async (importOriginal) => {
  const real = await importOriginal()
  const { authSimulado } = await import('../helpers/renderWithProviders')
  return { ...real, useAuth: () => authSimulado.valor }
})

const AHORA = new Date('2026-03-11T10:00:00')
const HOY = '2026-03-11'
const BARBERIA = { id: 'b1', nombre: 'Salon Demo', slug: 'kromatik' }

/**
 * Cuatro citas del cliente:
 *   cc1 pendiente de mañana  -> proximas
 *   cc2 confirmada de pasado mañana -> proximas
 *   cc3 completada de ayer    -> historial
 *   cc4 cancelada de mañana  -> historial
 */
const CITAS = [
  {
    id: 'cc1', fecha: '2026-03-12', hora: '09:00:00', servicio: 'Corte de cabello',
    productos: [], total: 150, estado: 'pendiente', barbero_id: 'bar-1',
    barberos: { nombre: 'Barbero Uno' },
  },
  {
    id: 'cc2', fecha: '2026-03-13', hora: '11:00:00', servicio: 'Perfilado de barba',
    productos: [], total: 120, estado: 'confirmada', barbero_id: null, barberos: null,
  },
  {
    id: 'cc3', fecha: '2026-03-10', hora: '10:00:00', servicio: 'Lavado capilar',
    productos: [{ nombre: 'Shampoo', precio: 220 }], total: 370, estado: 'completada',
    barbero_id: 'bar-1', barberos: { nombre: 'Barbero Uno' },
  },
  {
    id: 'cc4', fecha: '2026-03-12', hora: '12:00:00', servicio: 'Corte de barba',
    productos: [], total: 150, estado: 'cancelada', barbero_id: null, barberos: null,
  },
]

/** Horas ocupadas que devuelve la RPC al abrir el modal de reagendar. */
const HORAS_OCUPADAS = ['11:00']

/** Monta el portal del cliente con las citas dadas. */
function montar({ citas = CITAS, error = null, horasOcupadas = HORAS_OCUPADAS } = {}) {
  supabaseMock.on(
    'citas',
    'select',
    error ? { data: null, error } : { data: citas }
  )
  supabaseMock.onRpc(
    'horas_ocupadas',
    { data: horasOcupadas.map((h) => `${h}:00`) }
  )
  return renderWithProviders(<CitasCliente />, {
    ruta: '/cliente',
    auth: {
      session: sesionSimulada(),
      cargando: false,
      rol: 'cliente',
      cargandoRol: false,
    },
    barberia: { barberia: BARBERIA, cargando: false, slug: 'kromatik', sinSlug: false },
  })
}

/** Devuelve la tarjeta de la cita de un servicio. */
function tarjetaDe(servicio) {
  return screen.getByText(servicio).closest('article')
}

/** Devuelve la llamada a una RPC. */
function rpcDe(nombre) {
  return supabaseMock.llamadas.find((c) => c.tipo === 'rpc' && c.nombre === nombre)
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, now: AHORA })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('CitasCliente · sus citas', () => {
  it('F-07 · carga solo las citas del cliente y de la barbería abierta', async () => {
    montar()

    await screen.findByText('Corte de cabello')

    const llamada = supabaseMock.llamadas.find(
      (c) => c.tipo === 'query' && c.tabla === 'citas' && c.operacion === 'select'
    )
    expect(llamada.filtros).toEqual([
      { op: 'eq', columna: 'cliente_id', valor: 'usuario-1' },
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
    // Pide el nombre del barbero en la misma consulta.
    expect(llamada.columnas).toContain('barberos(nombre)')
  })

  it('F-07 · separa las citas próximas del historial', async () => {
    montar()

    await screen.findByText('Corte de cabello')

    expect(screen.getByRole('tab', { name: 'Próximas (2)' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Historial (2)' })).toBeInTheDocument()
    // Las dos próximas son las pendientes y la confirmada de mañana.
    expect(tarjetaDe('Corte de cabello')).toBeInTheDocument()
    expect(tarjetaDe('Perfilado de barba')).toBeInTheDocument()
    expect(screen.queryByText('Lavado capilar')).not.toBeInTheDocument()
  })

  it('F-07 · el historial enseña las citas pasadas y las canceladas', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montar()

    await screen.findByText('Corte de cabello')
    await user.click(screen.getByRole('tab', { name: 'Historial (2)' }))

    await waitFor(() => {
      expect(tarjetaDe('Lavado capilar')).toBeInTheDocument()
    })
    expect(tarjetaDe('Corte de barba')).toBeInTheDocument()
    expect(screen.queryByText('Corte de cabello')).not.toBeInTheDocument()
  })

  it('F-07 · cada tarjeta muestra el servicio, el barbero, el total y los productos', async () => {
    montar()

    await screen.findByText('Corte de cabello')
    const tarjeta = tarjetaDe('Corte de cabello')

    expect(tarjeta).toHaveTextContent('Barbero Uno')
    expect(tarjeta).toHaveTextContent('$150 MXN')
    expect(tarjeta).toHaveTextContent('pendiente')
    // 9:00 en la base, 12 h en pantalla.
    expect(tarjeta).toHaveTextContent('9:00 AM')
  })

  it('F-07 · una cita sin barbero asignado lo dice', async () => {
    montar()

    await screen.findByText('Perfilado de barba')
    expect(tarjetaDe('Perfilado de barba')).toHaveTextContent('Por asignar')
  })

  it('F-07 · una cita con productos los lista', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montar()

    await screen.findByText('Corte de cabello')
    await user.click(screen.getByRole('tab', { name: 'Historial (2)' }))

    await waitFor(() => {
      expect(tarjetaDe('Lavado capilar')).toHaveTextContent('Shampoo')
    })
  })

  it('F-07 · avisa cuando el cliente no tiene citas próximas', async () => {
    montar({ citas: [] })

    await waitFor(() => {
      expect(screen.getByText('No tienes citas próximas.')).toBeInTheDocument()
    })
  })

  it('F-07 · avisa cuando la carga de las citas falla', async () => {
    montar({ error: { message: 'sin permiso' } })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudieron cargar tus citas. Intenta de nuevo.'
      )
    })
  })
})

describe('CitasCliente · cancelar', () => {
  it('F-06 · cancelar pide confirmación y llama a la RPC con el id de la cita', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montar()

    await screen.findByText('Corte de cabello')
    await user.click(within(tarjetaDe('Corte de cabello')).getByRole('button', { name: 'Cancelar cita' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Cancelar cita' })
    // El modal confirma con la fecha y la hora de la cita que se va a cancelar.
    expect(dialogo).toHaveTextContent('9:00 AM')

    await user.click(within(dialogo).getByRole('button', { name: 'Sí, cancelar' }))

    await waitFor(() => {
      expect(rpcDe('cancelar_cita')).toBeDefined()
    })
    expect(rpcDe('cancelar_cita').argumentos).toEqual({ p_id: 'cc1' })
    // El modal se cierra y la lista se vuelve a pedir.
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('F-06 · si la RPC rechaza la cancelación, se avisa y el modal sigue abierto', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    supabaseMock.onRpc('cancelar_cita', {
      data: null,
      error: { message: 'cita_no_modificable' },
    })
    montar()

    await screen.findByText('Corte de cabello')
    await user.click(within(tarjetaDe('Corte de cabello')).getByRole('button', { name: 'Cancelar cita' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sí, cancelar' })
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudo cancelar la cita. Puede que ya haya pasado o cambiado de estado.'
      )
    })
    expect(screen.getByRole('dialog', { name: 'Cancelar cita' })).toBeInTheDocument()
  })
})

describe('CitasCliente · reagendar', () => {
  it('F-06 · reagendar llama a la RPC con la fecha y la hora elegidas', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montar()

    await screen.findByText('Corte de cabello')
    await user.click(within(tarjetaDe('Corte de cabello')).getByRole('button', { name: 'Reagendar' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Reagendar cita' })
    fireEvent.change(within(dialogo).getByLabelText('Nueva fecha'), {
      target: { value: '2026-03-14' },
    })
    await user.click(within(dialogo).getByRole('button', { name: '2:30 PM' }))
    await user.click(within(dialogo).getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => {
      expect(rpcDe('reagendar_cita')).toBeDefined()
    })
    expect(rpcDe('reagendar_cita').argumentos).toEqual({
      p_id: 'cc1',
      p_fecha: '2026-03-14',
      p_hora: '14:30',
    })
  })

  it('F-06 · confirmar está deshabilitado mientras no se elija hora', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montar()

    await screen.findByText('Corte de cabello')
    await user.click(within(tarjetaDe('Corte de cabello')).getByRole('button', { name: 'Reagendar' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Reagendar cita' })
    expect(within(dialogo).getByRole('button', { name: 'Confirmar' })).toBeDisabled()
    expect(rpcDe('reagendar_cita')).toBeUndefined()
  })

  it('F-06 · si el horario acaba de ocuparse, se avisa y se vuelve a pedir la hora', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    supabaseMock.onRpc('reagendar_cita', {
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    })
    montar()

    await screen.findByText('Corte de cabello')
    await user.click(within(tarjetaDe('Corte de cabello')).getByRole('button', { name: 'Reagendar' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Reagendar cita' })
    await user.click(within(dialogo).getByRole('button', { name: '2:30 PM' }))
    await user.click(within(dialogo).getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Ese horario acaba de ser tomado, elige otro.'
      )
    })
    // La hora elegida se borra: hay que elegir otra.
    expect(within(dialogo).getByRole('button', { name: 'Confirmar' })).toBeDisabled()
  })

  it('F-06 · una hora ya ocupada no se puede elegir', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montar()

    await screen.findByText('Corte de cabello')
    await user.click(within(tarjetaDe('Corte de cabello')).getByRole('button', { name: 'Reagendar' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Reagendar cita' })
    // La RPC de horas ocupadas devuelve 11:00 como ocupada.
    await waitFor(() => {
      expect(within(dialogo).getByRole('button', { name: '11:00 AM' })).toBeDisabled()
    })
    expect(within(dialogo).getByRole('button', { name: '2:30 PM' })).toBeEnabled()
  })

  it('F-06 · los domingos no se pueden agendar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montar()

    await screen.findByText('Corte de cabello')
    await user.click(within(tarjetaDe('Corte de cabello')).getByRole('button', { name: 'Reagendar' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Reagendar cita' })
    fireEvent.change(within(dialogo).getByLabelText('Nueva fecha'), {
      target: { value: '2026-03-15' },
    })

    await waitFor(() => {
      expect(
        within(dialogo).getByText('Los domingos permanecemos cerrados.')
      ).toBeInTheDocument()
    })
    // Todas las horas del domingo van deshabilitadas.
    for (const hora of ['10:00 AM', '11:00 AM', '2:30 PM', '6:30 PM']) {
      expect(within(dialogo).getByRole('button', { name: hora })).toBeDisabled()
    }
  })

  it('F-06 · una hora que ya pasó no se puede elegir', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const hoy = { ...CITAS[0], id: 'cc5', fecha: HOY, hora: '14:30:00' }
    montar({ citas: [hoy], horasOcupadas: [] })

    await screen.findByText('Corte de cabello')
    await user.click(within(tarjetaDe('Corte de cabello')).getByRole('button', { name: 'Reagendar' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Reagendar cita' })
    // Son las 10:00: la hora de las 10:00 ya paso y la de las 11:00 no.
    expect(within(dialogo).getByRole('button', { name: '10:00 AM' })).toBeDisabled()
    expect(within(dialogo).getByRole('button', { name: '11:00 AM' })).toBeEnabled()
    expect(within(dialogo).getByRole('button', { name: '2:30 PM' })).toBeEnabled()
  })
})
