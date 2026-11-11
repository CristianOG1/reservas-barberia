// tests/unit/CitasAdmin.recordatorios.test.jsx
// El recordatorio manual por WhatsApp y los dos interruptores de envio
// automatico.
//
// Matriz v3: F-13 «Enviar recordatorios al cliente en sus tres canales: manual
// por WhatsApp, automatico por correo y automatico por WhatsApp».

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabaseMock } from '../mocks/supabaseClient'
import {
  CITAS,
  dentroDeLaFila,
  esperarFila,
  filaDe,
  llamadaDe,
  montarCitasAdmin,
  usarRelojFijo,
} from '../helpers/fixturesCitas'

usarRelojFijo()

describe('CitasAdmin · recordatorio manual por WhatsApp', () => {
  it('F-13 · el boton Recordar abre WhatsApp con el mensaje de la cita', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null)
    montarCitasAdmin()

    await esperarFila('Luis')
    await user.click(dentroDeLaFila('Luis').getByRole('button', { name: 'Recordar' }))

    await waitFor(() => {
      expect(abrir).toHaveBeenCalledTimes(1)
    })
    const url = abrir.mock.calls[0][0]
    // El numero va normalizado con codigo de pais: 55 2222 2222 -> 52 55 2222 2222.
    expect(url).toMatch(/^https:\/\/wa\.me\/525522222222\?text=/)
    const mensaje = decodeURIComponent(url.split('?text=')[1])
    expect(mensaje).toContain('Hola Luis')
    expect(mensaje).toContain('Salon Demo')
    expect(mensaje).toContain('Barba')

    abrir.mockRestore()
  })

  it('F-13 · tras el aviso, la cita queda marcada como recordada', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null)
    montarCitasAdmin()

    await esperarFila('Luis')
    await user.click(dentroDeLaFila('Luis').getByRole('button', { name: 'Recordar' }))

    await waitFor(() => {
      expect(filaDe('Luis')).toHaveTextContent('Recordada')
    })
    // La marca se escribe en su propia columna y acotada a la barbería.
    const llamada = llamadaDe('citas', 'update')
    expect(llamada.carga).toHaveProperty('recordatorio_enviado_at')
    expect(llamada.filtros).toEqual([
      { op: 'eq', columna: 'id', valor: 'c2' },
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
    // Y el botón pasa a ofrecerse de nuevo.
    expect(dentroDeLaFila('Luis').getByRole('button', { name: 'Recordar de nuevo' })).toBeInTheDocument()

    abrir.mockRestore()
  })

  it('F-13 · con un telefono invalido el boton va deshabilitado y no abre nada', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null)
    montarCitasAdmin({
      datos: {
        citas: [
          {
            ...CITAS[1],
            telefono: '12345',
          },
        ],
      },
    })

    await esperarFila('Luis')
    // Con el teléfono inválido, el botón cambia su nombre accesible para
    // explicar por qué está deshabilitado.
    const boton = dentroDeLaFila('Luis').getByRole('button', { name: /^Recordar:/ })
    expect(boton).toBeDisabled()
    expect(boton).toHaveAttribute('title', expect.stringContaining('5 dígitos'))

    await user.click(boton)
    expect(abrir).not.toHaveBeenCalled()
    expect(llamadaDe('citas', 'update')).toBeUndefined()

    abrir.mockRestore()
  })

  it('F-13 · la tarjeta cuenta las citas por recordar', async () => {
    montarCitasAdmin()

    await esperarFila('Luis')
    // Solo la pendiente de hoy (11:00) y la de manana: 2.
    expect(screen.getByText(/citas por recordar/)).toHaveTextContent('2')
  })
})

describe('CitasAdmin · interruptores de canal', () => {
  it('F-13 · los dos interruptores reflejan el estado de la configuracion', async () => {
    montarCitasAdmin()

    await esperarFila('Ana')
    const correo = screen.getByRole('switch', { name: 'Envío automático' })
    const whatsapp = screen.getByRole('switch', { name: 'WhatsApp automático' })

    expect(correo).toHaveAttribute('aria-checked', 'true')
    expect(whatsapp).toHaveAttribute('aria-checked', 'false')
  })

  it('F-13 · apagar el envio automatico por correo escribe en la configuracion de la barbería', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitasAdmin()

    await esperarFila('Ana')
    await user.click(screen.getByRole('switch', { name: 'Envío automático' }))

    await waitFor(() => {
      const llamada = llamadaDe('configuracion', 'update')
      expect(llamada).toBeDefined()
      expect(llamada.carga).toEqual({ recordatorios_activos: false })
      expect(llamada.filtros).toEqual([{ op: 'eq', columna: 'barberia_id', valor: 'b1' }])
    })
  })

  it('F-13 · el interruptor de WhatsApp escribe en su propia columna', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitasAdmin()

    await esperarFila('Ana')
    await user.click(screen.getByRole('switch', { name: 'WhatsApp automático' }))

    await waitFor(() => {
      const llamada = llamadaDe('configuracion', 'update')
      expect(llamada).toBeDefined()
      expect(llamada.carga).toEqual({ whatsapp_activo: true })
    })
  })

  it('F-13 · si la escritura no afecta a ninguna fila, el interruptor vuelve a su valor', async () => {
    // Un UPDATE que la RLS no deja pasar afecta 0 filas SIN lanzar error. El
    // panel lo revisa con `count` y avisa, en vez de mentir con el switch movido.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    supabaseMock.on('configuracion', 'update', { data: null, error: null, count: 0 })
    montarCitasAdmin()

    await esperarFila('Ana')
    await user.click(screen.getByRole('switch', { name: 'Envío automático' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se cambió nada. Revisa que tu cuenta siga siendo la de esta barbería.'
      )
    })
    expect(screen.getByRole('switch', { name: 'Envío automático' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  it('F-13 · sin fila de configuracion los interruptores van deshabilitados', async () => {
    montarCitasAdmin({ configuracion: { id: null } })

    await esperarFila('Ana')
    expect(screen.getByRole('switch', { name: 'Envío automático' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'WhatsApp automático' })).toBeDisabled()
    // Los dos interruptores muestran el mismo aviso.
    expect(screen.getAllByText('Falta la configuración de la barbería')).toHaveLength(2)
  })
})
