// tests/unit/CitasAdmin.agenda.test.jsx
// La agenda del panel: que citas se cargan, como se muestran y que pasa
// cuando no hay ninguna.
//
// Matriz v3: F-08 «Gestionar la agenda de citas y el resumen del salón».

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import {
  esperarFila,
  dentroDeLaFila,
  filaDe,
  llamadaDe,
  montarCitasAdmin,
  usarRelojFijo,
} from '../helpers/fixturesCitas'

usarRelojFijo()

describe('CitasAdmin · agenda', () => {
  it('F-08 · carga solo las citas de la barbería activa', async () => {
    montarCitasAdmin()

    await esperarFila('Ana')

    const llamada = llamadaDe('citas', 'select')
    expect(llamada.filtros).toEqual([{ op: 'eq', columna: 'barberia_id', valor: 'b1' }])
  })

  it('F-08 · pide las citas ordenadas por fecha y por hora', async () => {
    montarCitasAdmin()

    await esperarFila('Ana')

    const llamada = llamadaDe('citas', 'select')
    expect(llamada.orden).toEqual([
      { columna: 'fecha', opciones: { ascending: true } },
      { columna: 'hora', opciones: { ascending: true } },
    ])
  })

  it('F-08 · muestra en cada fila la hora, la duración y el badge del estado', async () => {
    montarCitasAdmin()

    await esperarFila('Ana')
    const fila = filaDe('Ana')

    // La hora se saca de `citas.hora` ('09:00:00').
    expect(fila).toHaveTextContent('9:00 AM')
    // La duración sale del catálogo de servicios, no de un dato inventado.
    expect(fila).toHaveTextContent('30 min')
    // El badge traduce el estado de la base a la etiqueta del panel.
    const badge = dentroDeLaFila('Ana').getByText('Confirmada')
    expect(badge).toHaveClass('bg-primary-100', 'text-primary')
  })

  it('F-08 · cada fila muestra el cliente, el teléfono y el barbero asignado', async () => {
    montarCitasAdmin()

    await esperarFila('Ana')
    const fila = filaDe('Ana')

    expect(fila).toHaveTextContent('5512345678')
    expect(fila).toHaveTextContent('Corte de cabello')
    expect(fila).toHaveTextContent('Barbero Uno')
  })

  it('F-08 · una cita sin barbero se muestra como «Sin asignar»', async () => {
    montarCitasAdmin()

    await esperarFila('Marta')
    expect(filaDe('Marta')).toHaveTextContent('Sin asignar')
  })

  it.fails('F-08 · muestra la hora de la cita en formato de 24 horas', async () => {
    // DISCREPANCIA CON LA MATRIZ: el criterio de F-08 dice «con hora en 24 h».
    // La columna `citas.hora` SI guarda 24 h ('09:00:00'), pero el panel la
    // pinta con `formatearHora`, que la convierte a 12 h con AM/PM («9:00 AM»).
    // Cuando se decida (cambiar el criterio o la pantalla), este test avisa.
    montarCitasAdmin()

    await esperarFila('Ana')
    expect(filaDe('Ana')).toHaveTextContent('09:00')
  })

  it('avisa cuando el día no tiene ninguna cita', async () => {
    montarCitasAdmin({ datos: { citas: [] } })

    await waitFor(() => {
      expect(screen.getByText(/No hay citas agendadas/)).toBeInTheDocument()
    })
  })

  it('avisa cuando el filtro de estado deja la tabla vacía', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitasAdmin()

    await esperarFila('Ana')
    // «Barbero Uno» solo tiene una confirmada y una completada: al pedir las
    // pendientes de confirmar no queda ninguna.
    await user.selectOptions(screen.getByLabelText('Filtrar por barbero'), 'bar-1')
    await user.click(screen.getByRole('button', { name: /Pendientes de Confirmar/ }))

    await waitFor(() => {
      expect(
        screen.getByText('Ninguna cita del día coincide con este estado.')
      ).toBeInTheDocument()
    })
  })

  it.fails('F-08 · avisa cuando la carga de las citas falla', async () => {
    // HUECO REAL: `cargarDatos` no revisa el `error` de la consulta, hace
    // `setCitas(citasRes.data || [])` y un fallo de red se ve EXACTAMENTE
    // igual que un día sin citas. Es el patrón «A. Lecturas — el error se
    // descarta» de AGENTS.md §13, que este panel aún no corrige.
    montarCitasAdmin({ datos: { errorCitas: { message: 'sin permiso' } } })

    await waitFor(() => {
      expect(screen.getByText(/No hay citas agendadas/)).toBeInTheDocument()
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('el panel muestra «Cargando...» mientras llegan los datos', async () => {
    montarCitasAdmin()

    expect(screen.getByText('Cargando...')).toBeInTheDocument()
    await esperarFila('Ana')
    expect(screen.queryByText('Cargando...')).not.toBeInTheDocument()
  })
})
