// tests/unit/CitasAdmin.huecos.test.jsx
// Los tres huecos que quedaban del panel de citas: el aviso cuando no se
// puede marcar un recordatorio, la reversion del interruptor de canal cuando
// la escritura falla, y la deteccion de primera visita.
//
// Matriz v3: F-13 (canales de recordatorio) y F-08 (agenda del salon).

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabaseMock } from '../mocks/supabaseClient'
import {
  CITAS,
  HOY,
  dentroDeLaFila,
  esperarFila,
  montarCitasAdmin,
  usarRelojFijo,
} from '../helpers/fixturesCitas'

usarRelojFijo()

describe('CitasAdmin · recordatorio que no se puede marcar', () => {
  it('F-13 · avisa de que WhatsApp se abrió pero la cita no quedó marcada', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null)
    supabaseMock.on('citas', 'update', { data: null, error: { message: 'sin permiso' } })
    montarCitasAdmin()

    await esperarFila('Luis')
    await user.click(dentroDeLaFila('Luis').getByRole('button', { name: 'Recordar' }))

    // El aviso tiene que explicar las dos cosas: que WhatsApp si se abrio y
    // que la marca en la base fallo.
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Se abrió WhatsApp para Luis, pero no se pudo marcar como recordada: sin permiso'
      )
    })
    // El aviso de WhatsApp se abre igual: el barbero ya lo ha enviado.
    expect(abrir).toHaveBeenCalledTimes(1)
    // Y la fila NO se marca como recordada.
    expect(dentroDeLaFila('Luis').queryByText('Recordada')).not.toBeInTheDocument()

    abrir.mockRestore()
  })
})

describe('CitasAdmin · interruptores de canal', () => {
  it('F-13 · si la escritura falla, el interruptor vuelve a su valor y se avisa', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    supabaseMock.on('configuracion', 'update', { data: null, error: { message: 'sin permiso' } })
    montarCitasAdmin()

    await screen.findByText('Ana')
    const interruptor = screen.getByRole('switch', { name: 'Envío automático' })
    expect(interruptor).toHaveAttribute('aria-checked', 'true')

    await user.click(interruptor)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudo cambiar el envío automático por correo: sin permiso'
      )
    })
    // El switch vuelve a como estaba: no puede mentir sobre lo guardado.
    expect(interruptor).toHaveAttribute('aria-checked', 'true')
  })

  it('F-13 · el interruptor de WhatsApp también revierte si la escritura falla', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    supabaseMock.on('configuracion', 'update', { data: null, error: { message: 'sin permiso' } })
    montarCitasAdmin()

    await screen.findByText('Ana')
    const interruptor = screen.getByRole('switch', { name: 'WhatsApp automático' })
    expect(interruptor).toHaveAttribute('aria-checked', 'false')

    await user.click(interruptor)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudo cambiar el envío automático por WhatsApp: sin permiso'
      )
    })
    expect(interruptor).toHaveAttribute('aria-checked', 'false')
  })
})

describe('CitasAdmin · abrir el modal de cita manual', () => {
  it('F-08 · el botón «Nueva Cita Manual» abre el modal en modo alta', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitasAdmin()

    await esperarFila('Luis')
    await user.click(screen.getByRole('button', { name: 'Nueva Cita Manual' }))

    expect(screen.getByText('Nueva cita manual')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del cliente *')).toHaveValue('')
  })

  it('F-08 · el botón «Reprogramar» abre el modal con los datos de la cita', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitasAdmin()

    await esperarFila('Ana')
    await user.click(dentroDeLaFila('Ana').getByRole('button', { name: 'Reprogramar' }))

    expect(screen.getByText('Reprogramar cita')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del cliente *')).toHaveValue('Ana')
    expect(screen.getByLabelText('Fecha *')).toHaveValue(HOY)
  })

  it('F-08 · al guardar la cita manual, el modal se cierra y la agenda se recarga', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    supabaseMock.on('citas', 'insert', { data: null, error: null })
    montarCitasAdmin()

    await esperarFila('Luis')
    await user.click(screen.getByRole('button', { name: 'Nueva Cita Manual' }))
    await user.type(screen.getByLabelText('Nombre del cliente *'), 'Cliente Nuevo')
    await user.type(screen.getByLabelText('Teléfono (WhatsApp) *'), '5512345678')
    await user.selectOptions(screen.getByLabelText('Servicio contratado *'), 'Barba')
    await user.type(screen.getByLabelText('Fecha *'), '2026-03-15')
    await user.type(screen.getByLabelText('Hora *'), '11:30')
    await user.click(screen.getByRole('button', { name: 'Crear cita' }))

    await waitFor(() => {
      expect(screen.queryByText('Nueva cita manual')).not.toBeInTheDocument()
    })
    const selects = supabaseMock.llamadas.filter(
      (c) => c.tipo === 'query' && c.tabla === 'citas' && c.operacion === 'select'
    )
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })
})

describe('CitasAdmin · primera visita', () => {
  // Ana repite: la cita de las 09:00 es su primera vez y la de las 16:00 no.
  const CON_REPETICION = [
    { ...CITAS[0], id: 'r1', nombre: 'Ana', telefono: '5512345678', hora: '09:00:00', estado: 'confirmada', barbero_id: 'bar-1' },
    { ...CITAS[3], id: 'r2', nombre: 'Ana', telefono: '5512345678', hora: '16:00:00', estado: 'confirmada', barbero_id: 'bar-1' },
    { ...CITAS[1], id: 'r3', nombre: 'Luis', telefono: '5522222222', hora: '11:00:00', estado: 'pendiente', barbero_id: 'bar-2' },
  ]

  it('F-08 · marca la primera cita de un teléfono como «Primera visita»', async () => {
    montarCitasAdmin({ datos: { citas: CON_REPETICION } })

    await esperarFila('Luis')
    expect(dentroDeLaFila('Luis').getByText('Primera visita')).toBeInTheDocument()
  })

  it('F-08 · la segunda cita del mismo teléfono ya no es «Primera visita»', async () => {
    montarCitasAdmin({ datos: { citas: CON_REPETICION } })

    await esperarFila('Luis')
    // Las dos filas de Ana, en el orden de la tabla (la de las 09:00 primero).
    const filasDeAna = screen.getAllByText('Ana').map((el) => el.closest('tr'))

    expect(within(filasDeAna[0]).getByText('Primera visita')).toBeInTheDocument()
    expect(within(filasDeAna[1]).queryByText('Primera visita')).not.toBeInTheDocument()
  })
})
