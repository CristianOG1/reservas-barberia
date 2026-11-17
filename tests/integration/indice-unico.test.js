// tests/integration/indice-unico.test.js
// El indice unico de las franjas (`citas_slot_unico`) comprobado contra la
// base REAL.
//
// Matriz v3:
//   F-05 «Reservar una cita»: «la franja queda bloqueada y un segundo intento
//        en la misma franja se rechaza con el error 23505».

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  BARBERIA_A,
  BARBERIA_B,
  DUENO_ID,
  abrirSesiones,
  citaDePrueba,
  fechaDePrueba,
  franja,
  hayClaveAnon,
  limpiar,
  nuevaMarca,
} from '../helpers/integracion.js'

const FECHA = fechaDePrueba()

let sesiones = null
// Cada PRUEBA tiene su propia marca: los archivos corren en paralelo y una
// limpieza global se comia las filas del archivo vecino.
let marca = null

beforeAll(async () => {
  sesiones = await abrirSesiones()
})

beforeEach(() => {
  marca = nuevaMarca()
})

afterEach(async () => {
  if (sesiones) await limpiar(sesiones, marca)
})

afterAll(async () => {
  if (sesiones) await limpiar(sesiones, marca)
})

describe.skipIf(!hayClaveAnon())('Indice unico · la franja se bloquea', () => {
  it('INT-27 · F-05 · una segunda reserva en la misma franja da 23505', async () => {
    const slot = franja(FECHA, 1)

    const { data: primera, error: errorPrimero } = await sesiones.dueno
      .from('citas')
      .insert([citaDePrueba({ marca, ...slot })])
      .select('id')
      .single()
    expect(errorPrimero).toBeNull()

    const { error: errorSegundo } = await sesiones.dueno
      .from('citas')
      .insert([citaDePrueba({ marca, ...slot })])

    expect(errorSegundo).not.toBeNull()
    expect(errorSegundo.code).toBe('23505')

    // En esa franja solo queda la primera cita.
    const { count } = await sesiones.proveedor
      .from('citas')
      .select('id', { count: 'exact', head: true })
      .eq('barberia_id', BARBERIA_A)
      .eq('fecha', slot.fecha)
      .eq('hora', slot.hora)
    expect(count).toBe(1)
    expect(primera.id).toBeTruthy()
  })

  it('INT-28 · F-05 · la franja de una cita cancelada se puede volver a reservar', async () => {
    const slot = franja(FECHA, 2)

    // La cita se crea a nombre del dueno, para que sea suya y pueda cancelar.
    const { data: cita, error: errorInsert } = await sesiones.dueno
      .from('citas')
      .insert([citaDePrueba({ marca, ...slot, cliente_id: DUENO_ID })])
      .select('id')
      .single()
    expect(errorInsert).toBeNull()

    // Se cancela con la RPC del portal: solo puede cancelar quien es el
    // `cliente_id` de la cita, asi que la cita es del dueno.
    const { error: errorCancelar } = await sesiones.dueno.rpc('cancelar_cita', { p_id: cita.id })
    expect(errorCancelar).toBeNull()

    const { data: cancelada } = await sesiones.proveedor
      .from('citas')
      .select('estado')
      .eq('id', cita.id)
      .single()
    expect(cancelada.estado).toBe('cancelada')

    // Y ahora la misma franja se vuelve a reservar sin problema: el indice es
    // parcial y excluye las citas canceladas.
    const { data: nueva, error: errorNueva } = await sesiones.dueno
      .from('citas')
      .insert([citaDePrueba({ marca, ...slot })])
      .select('id')
      .single()
    expect(errorNueva).toBeNull()
    expect(nueva.id).not.toBe(cita.id)
  })

  it('INT-29 · F-05 · la misma franja si se puede en dos barberias distintas', async () => {
    const slot = franja(FECHA, 3)

    const { error: errorA } = await sesiones.dueno
      .from('citas')
      .insert([citaDePrueba({ marca, ...slot, barberiaId: BARBERIA_A })])
    expect(errorA).toBeNull()

    const { error: errorB } = await sesiones.duenoNorte
      .from('citas')
      .insert([citaDePrueba({ marca, ...slot, barberiaId: BARBERIA_B })])
    expect(errorB).toBeNull()

    // Cada barberia tiene su propia cita en esa franja.
    for (const barberiaId of [BARBERIA_A, BARBERIA_B]) {
      const { count } = await sesiones.proveedor
        .from('citas')
        .select('id', { count: 'exact', head: true })
        .eq('barberia_id', barberiaId)
        .eq('fecha', slot.fecha)
        .eq('hora', slot.hora)
      expect(count).toBe(1)
    }
  })

  it('INT-30 · F-05 · dos reservas simultaneas: gana una sola', async () => {
    const slot = franja(FECHA, 4)

    const [primera, segunda] = await Promise.all([
      sesiones.dueno.from('citas').insert([citaDePrueba({ marca, ...slot })]),
      sesiones.dueno.from('citas').insert([citaDePrueba({ marca, ...slot })]),
    ])

    const exitos = [primera, segunda].filter((r) => !r.error)
    const fallidos = [primera, segunda].filter((r) => r.error)

    expect(exitos.length).toBe(1)
    expect(fallidos.length).toBe(1)
    expect(fallidos[0].error.code).toBe('23505')

    // Y en la base solo hay una fila en esa franja.
    const { count } = await sesiones.proveedor
      .from('citas')
      .select('id', { count: 'exact', head: true })
      .eq('barberia_id', BARBERIA_A)
      .eq('fecha', slot.fecha)
      .eq('hora', slot.hora)
    expect(count).toBe(1)
  })
})
