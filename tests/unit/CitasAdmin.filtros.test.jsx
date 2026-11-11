// tests/unit/CitasAdmin.filtros.test.jsx
// Los filtros de la agenda (por estado y por barbero), la paginacion y las
// metricas del panel.
//
// Las metricas se verifican contra los DATOS REALES de las fixtures: si
// alguien las cambia por valores de ejemplo (como los METRICAS_EJEMPLO de
// ResumenPage), estos tests se rompen.

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  HOY,
  esperarFila,
  filaDe,
  montarCitasAdmin,
  usarRelojFijo,
} from '../helpers/fixturesCitas'

usarRelojFijo()

/** Texto de una tarjeta de metricas (la que contiene ese pie de foto). */
function tarjeta(titulo) {
  return screen.getByText(titulo).closest('div.rounded-xl')
}

describe('CitasAdmin · filtros y metricas', () => {
  it('F-08 · el filtro por estado deja solo las citas de ese estado', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitasAdmin()

    await esperarFila('Ana')
    await user.click(screen.getByRole('button', { name: /Pendientes de Confirmar/ }))

    await waitFor(() => {
      expect(filaDe('Ana')).toBeNull()
    })
    expect(filaDe('Luis')).toBeInTheDocument()
    expect(filaDe('Marta')).toBeNull()
  })

  it('F-08 · cada pestaña muestra la cuenta de citas de ese estado', async () => {
    montarCitasAdmin()

    await esperarFila('Ana')

    // Las cuatro citas de hoy: 1 pendiente, 1 confirmada, 1 completada, 1 cancelada.
    expect(screen.getByRole('button', { name: /^Todas/ })).toHaveTextContent('4')
    expect(screen.getByRole('button', { name: /^Pendientes de Confirmar/ })).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: /^Confirmadas/ })).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: /^Completadas/ })).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: /^Canceladas/ })).toHaveTextContent('1')
  })

  it('F-08 · el filtro por barbero deja solo las citas de ese barbero', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitasAdmin()

    await esperarFila('Ana')
    await user.selectOptions(screen.getByLabelText('Filtrar por barbero'), 'bar-1')

    await waitFor(() => {
      expect(filaDe('Luis')).toBeNull()
    })
    expect(filaDe('Ana')).toBeInTheDocument()
    expect(filaDe('Nico')).toBeInTheDocument()
  })

  it('F-08 · el filtro «Sin barbero asignado» deja solo las citas sin barbero', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitasAdmin()

    await esperarFila('Ana')
    await user.selectOptions(screen.getByLabelText('Filtrar por barbero'), 'sin-asignar')

    await waitFor(() => {
      expect(filaDe('Marta')).toBeInTheDocument()
    })
    expect(filaDe('Ana')).toBeNull()
  })

  it.fails('permite buscar una cita por el nombre del cliente', async () => {
    // HUECO REAL: el panel no tiene buscador. Solo hay filtro por estado y por
    // barbero (los servicios si lo tienen). El criterio de F-08 no lo exige,
    // pero el filtro por barbero y el de estado no cubren "buscar por cliente".
    montarCitasAdmin()

    await esperarFila('Ana')
    const buscador = screen.queryByPlaceholderText(/buscar|cliente/i)
    expect(buscador).toBeInTheDocument()
  })

  it('F-08 · las metricas del panel salen de los datos reales', async () => {
    montarCitasAdmin()

    await esperarFila('Ana')

    // Con las fixtures: 6 citas en total, 4 de hoy, 5 en la ventana de 7 dias.
    expect(tarjeta('Total histórico')).toHaveTextContent('6')
    expect(tarjeta('Citas hoy')).toHaveTextContent('4')
    expect(tarjeta('Semana actual')).toHaveTextContent('5')
    // 4 de 5 citas de la semana NO estan canceladas -> 80 %.
    expect(tarjeta('Cumplimiento')).toHaveTextContent('80%')
  })

  it('F-08 · el cumplimiento avisa cuando no hay citas en la ventana', async () => {
    // Una cita fuera de la ventana de 7 dias: no hay con que calcular el
    // porcentaje. El dia seleccionado tampoco tiene citas.
    montarCitasAdmin({
      datos: {
        citas: [
          {
            id: 'c9', nombre: 'Raro', telefono: '5577777777', correo: 'raro@ejemplo.com',
            servicio: 'Barba', fecha: '2026-03-20', hora: '09:00:00', estado: 'pendiente',
            barbero_id: null, total: 120, productos: [],
          },
        ],
      },
    })

    await waitFor(() => {
      expect(screen.getByText(/No hay citas agendadas/)).toBeInTheDocument()
    })
    expect(tarjeta('Cumplimiento')).toHaveTextContent('—')
    expect(tarjeta('Cumplimiento')).toHaveTextContent('Sin citas en la ventana de 7 días')
  })

  it('F-08 · la agenda pagina de ocho en ocho y avisa del rango', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const muchas = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      nombre: `Cliente ${i}`,
      telefono: `55000000${i}`.slice(0, 10),
      correo: `cliente${i}@ejemplo.com`,
      servicio: 'Barba',
      fecha: HOY,
      hora: '09:00:00',
      estado: 'pendiente',
      barbero_id: null,
      total: 120,
      productos: [],
    }))
    montarCitasAdmin({ datos: { citas: muchas } })

    await esperarFila('Cliente 0')
    expect(screen.getByText(/Mostrando/)).toHaveTextContent('1–8')
    expect(screen.getByText(/Mostrando/)).toHaveTextContent('de 10')

    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))

    await waitFor(() => {
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('9–10')
    })
    expect(filaDe('Cliente 0')).toBeNull()
  })

  it('F-08 · el filtro por barbero y por estado se pueden quitar a la vez', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitasAdmin()

    await esperarFila('Ana')
    await user.selectOptions(screen.getByLabelText('Filtrar por barbero'), 'bar-1')
    await user.click(screen.getByRole('button', { name: /Pendientes de Confirmar/ }))

    await waitFor(() => {
      expect(
        screen.getByText('Ninguna cita del día coincide con este estado.')
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Quitar filtros →' })).toBeInTheDocument()
  })

  it('F-08 · el navegador de fechas cambia de día la agenda', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitasAdmin()

    await esperarFila('Ana')
    await user.click(screen.getByRole('button', { name: 'Día siguiente' }))

    // Al dia siguiente solo esta la cita de manana (c6).
    await waitFor(() => {
      expect(filaDe('Pau')).toBeInTheDocument()
    })
    expect(filaDe('Ana')).toBeNull()
  })
})
