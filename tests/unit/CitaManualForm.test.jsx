// tests/unit/CitaManualForm.test.jsx
// El modal de alta y reprogramacion de una cita a mano.
//
// Matriz v3: F-08 (la agenda del salon) cubre esta capturacion.

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

/** Rellena los campos obligatorios de una cita. */
async function rellenar(user, { telefono = '5512345678', servicio = 'Barba' } = {}) {
  await user.type(screen.getByLabelText('Nombre del cliente *'), 'Cliente Manual')
  await user.type(screen.getByLabelText('Teléfono (WhatsApp) *'), telefono)
  await user.selectOptions(screen.getByLabelText('Servicio contratado *'), servicio)
  await user.type(screen.getByLabelText('Fecha *'), '2026-03-15')
  await user.type(screen.getByLabelText('Hora *'), '11:30')
}

describe('CitaManualForm', () => {
  it('F-08 · los campos obligatorios estan marcados como obligatorios', () => {
    montarCitaManual()

    for (const etiqueta of [
      'Nombre del cliente *',
      'Teléfono (WhatsApp) *',
      'Servicio contratado *',
      'Fecha *',
      'Hora *',
    ]) {
      expect(screen.getByLabelText(etiqueta)).toBeRequired()
    }
  })

  it('F-08 · al elegir un servicio del catalogo se propone su precio', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitaManual()

    await user.selectOptions(screen.getByLabelText('Servicio contratado *'), 'Corte de cabello')

    // «Corte de cabello» cuesta 150 en el catálogo.
    expect(screen.getByLabelText('Total a cobrar (MXN)')).toHaveValue(150)
  })

  it('F-08 · al guardar se crea la cita pendiente y pertenece a la barbería', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const guardada = vi.fn()
    montarCitaManual({ onGuardado: guardada })

    await rellenar(user)
    await user.click(screen.getByRole('button', { name: 'Crear cita' }))

    await waitFor(() => {
      expect(guardada).toHaveBeenCalled()
    })

    const llamada = llamadaDe('citas', 'insert')
    expect(llamada.carga[0]).toMatchObject({
      nombre: 'Cliente Manual',
      telefono: '5512345678',
      servicio: 'Barba',
      fecha: '2026-03-15',
      hora: '11:30',
      // En alta manual la cita nace 'pendiente' de confirmar.
      estado: 'pendiente',
      barberia_id: BARBERIA.id,
    })
    // Sin correo ni notas no se mandan vacios.
    expect(llamada.carga[0].correo).toBe(null)
    expect(llamada.carga[0].notas).toBe(null)
  })

  it('F-08 · el barbero elegido se guarda en la cita', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitaManual()

    await rellenar(user)
    await user.selectOptions(screen.getByLabelText('Barbero asignado'), 'bar-2')
    await user.click(screen.getByRole('button', { name: 'Crear cita' }))

    await waitFor(() => {
      expect(llamadaDe('citas', 'insert')).toBeDefined()
    })
    expect(llamadaDe('citas', 'insert').carga[0].barbero_id).toBe('bar-2')
  })

  it('F-08 · si la insercion falla se muestra el aviso y no se avisa de guardado', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const guardada = vi.fn()
    supabaseMock.on('citas', 'insert', { data: null, error: { message: 'duplicada' } })
    montarCitaManual({ onGuardado: guardada })

    await rellenar(user)
    await user.click(screen.getByRole('button', { name: 'Crear cita' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal, intenta de nuevo.')
    })
    expect(guardada).not.toHaveBeenCalled()
  })

  it.fails('F-08 · avisa con un mensaje cuando falta un campo obligatorio', async () => {
    // HUECO REAL: el modal solo marca `required` en los inputs. No hay ningun
    // mensaje de error propio: el navegador valida, pero la aplicacion no dice
    // nada. El unico texto de error del modal es el generico de fallo.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarCitaManual()

    await user.type(screen.getByLabelText('Nombre del cliente *'), 'Cliente Manual')
    await user.click(screen.getByRole('button', { name: 'Crear cita' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/obligatorio|requerido|falta/i)
  })

  it.fails('F-08 · no deja crear una cita con un telefono de formato invalido', async () => {
    // HUECO REAL: el campo `telefono` solo tiene `required`. No hay ninguna
    // validacion de formato, asi que un numero de 3 digitos se guarda y la
    // cita queda con un telefono inservible para WhatsApp.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const guardada = vi.fn()
    montarCitaManual({ onGuardado: guardada })

    await rellenar(user, { telefono: '123' })
    await user.click(screen.getByRole('button', { name: 'Crear cita' }))

    expect(guardada).not.toHaveBeenCalled()
  })
})
