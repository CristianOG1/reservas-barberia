// tests/unit/useConfirmarCita.test.jsx
// Confirmacion optimista de una cita desde el panel.
//
// Matriz v3: F-06 «Gestionar el estado de una cita» — confirmar cambia el
// estado a 'confirmada', que es una operacion de estado sobre la cita.
//
// El hook recibe el setter de la pagina, asi que se prueba con `renderHook`
// sobre un estado real de React.

import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { useConfirmarCita } from '../../src/hooks/useConfirmarCita'
import { supabaseMock } from '../mocks/supabaseClient'

const BARBERIA_ID = 'barberia-1'
const CITA = { id: 'cita-1', estado: 'pendiente', nombre: 'Cliente' }

function montarHook(barberiaId = BARBERIA_ID, opciones = {}) {
  const { conErrorMsg = true, citas = [CITA] } = opciones
  return renderHook(() => {
    const [lista, setCitas] = useState(citas)
    const [errorMsg, setErrorMsg] = useState(null)
    const confirmar = useConfirmarCita(
      setCitas,
      conErrorMsg ? setErrorMsg : undefined,
      barberiaId
    )
    return { citas: lista, errorMsg, confirmar }
  })
}

describe('useConfirmarCita', () => {
  it('F-06 · actualiza el estado de la cita de forma optimista antes de que responda la base', async () => {
    // Respuesta diferida: mientras la base no conteste, la fila ya debe verse
    // como confirmada en la pantalla.
    let resolver
    const pendiente = new Promise((r) => { resolver = r })
    supabaseMock.on('citas', 'update', () => pendiente)

    const { result } = montarHook()

    await act(async () => {
      result.current.confirmar(CITA)
    })

    expect(result.current.citas[0].estado).toBe('confirmada')

    await act(async () => {
      resolver({ data: null, error: null })
    })
  })

  it('F-06 · deja la cita confirmada cuando el update en la base funciona', async () => {
    supabaseMock.on('citas', 'update', { data: null, error: null })

    const { result } = montarHook()

    await act(async () => {
      await result.current.confirmar(CITA)
    })

    await waitFor(() => {
      expect(result.current.citas[0].estado).toBe('confirmada')
    })
    expect(result.current.errorMsg).toBe(null)
  })

  it('F-06 · revuelve el estado anterior y avisa cuando el update en la base falla', async () => {
    supabaseMock.on('citas', 'update', { data: null, error: { message: 'sin permiso' } })

    const { result } = montarHook()

    await act(async () => {
      await result.current.confirmar(CITA)
    })

    await waitFor(() => {
      expect(result.current.errorMsg).toContain('sin permiso')
    })
    expect(result.current.citas[0].estado).toBe('pendiente')
  })

  it('el update se acota a la cita y a la barberia del panel', async () => {
    supabaseMock.on('citas', 'update', { data: null, error: null })

    const { result } = montarHook('barberia-9')

    await act(async () => {
      await result.current.confirmar(CITA)
    })

    const llamada = supabaseMock.llamadas.find(
      (c) => c.tipo === 'query' && c.tabla === 'citas' && c.operacion === 'update'
    )
    expect(llamada).toBeDefined()
    expect(llamada.carga).toEqual({ estado: 'confirmada' })
    expect(llamada.filtros).toEqual([
      { op: 'eq', columna: 'id', valor: 'cita-1' },
      { op: 'eq', columna: 'barberia_id', valor: 'barberia-9' },
    ])
  })

  it('no escribe nada si la cita ya estaba confirmada', async () => {
    supabaseMock.on('citas', 'update', { data: null, error: null })

    const { result } = montarHook()

    await act(async () => {
      await result.current.confirmar({ ...CITA, estado: 'confirmada' })
    })

    const escribio = supabaseMock.llamadas.some(
      (c) => c.tipo === 'query' && c.tabla === 'citas' && c.operacion === 'update'
    )
    expect(escribio).toBe(false)
  })

  it('una cita sin estado se trata como pendiente al revertir', async () => {
    supabaseMock.on('citas', 'update', { data: null, error: { message: 'sin permiso' } })

    const { result } = montarHook(BARBERIA_ID, { citas: [{ id: 'cita-1', nombre: 'Cliente' }] })

    await act(async () => {
      await result.current.confirmar({ id: 'cita-1', nombre: 'Cliente' })
    })

    await waitFor(() => {
      expect(result.current.citas[0].estado).toBe('pendiente')
    })
  })

  it('la reversion deja intactas las demas citas de la lista', async () => {
    supabaseMock.on('citas', 'update', { data: null, error: { message: 'sin permiso' } })

    const { result } = montarHook(BARBERIA_ID, {
      citas: [CITA, { id: 'cita-2', estado: 'confirmada', nombre: 'Otro' }],
    })

    await act(async () => {
      await result.current.confirmar(CITA)
    })

    await waitFor(() => {
      expect(result.current.citas[0].estado).toBe('pendiente')
    })
    expect(result.current.citas[1].estado).toBe('confirmada')
  })

  it('confirma igual cuando el setter de error es opcional y no se pasa', async () => {
    supabaseMock.on('citas', 'update', { data: null, error: { message: 'sin permiso' } })

    const { result } = montarHook(BARBERIA_ID, { conErrorMsg: false })

    await act(async () => {
      await result.current.confirmar(CITA)
    })

    // Sin setter de error no hay donde avisar, pero la reversion debe ocurrir.
    expect(result.current.citas[0].estado).toBe('pendiente')
    expect(result.current.errorMsg).toBe(null)
  })
})
