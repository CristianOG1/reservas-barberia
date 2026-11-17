// tests/integration/RLS.test.js
// Aislamiento por barberia y por rol, comprobado contra la base REAL.
//
// Matriz v3:
//   F-05 «Reservar una cita» (la reserva publica solo en barberias activas)
//   F-07 «Consultar las citas propias y el historial» (un cliente solo ve las suyas)
//   F-08 «Gestionar la agenda de citas y el resumen del salon» (un administrador
//        no puede tocar las de otra barberia)
//   F-14 «Operar con varias sucursales desde una sola cuenta» (las membresias
//        no se escriben desde la app)

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  BARBERIA_A,
  BARBERIA_B,
  CITA_DE_OTRO,
  CLIENTE_ID,
  SERVICIO_DE_B,
  abrirSesiones,
  citaDePrueba,
  crearBarberiaDePrueba,
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

describe.skipIf(!hayClaveAnon())('RLS · aislamiento por barberia', () => {
  it('INT-01 · F-08 · el admin de A no ve las citas de B (count = 0)', async () => {
    // El superadmin si las ve: si no, la prueba no mediria nada.
    const { count: totalDeB } = await sesiones.proveedor
      .from('citas')
      .select('id', { count: 'exact', head: true })
      .eq('barberia_id', BARBERIA_B)
    expect(totalDeB).toBeGreaterThan(0)

    const { data, count, error } = await sesiones.dueno
      .from('citas')
      .select('id', { count: 'exact', head: true })
      .eq('barberia_id', BARBERIA_B)

    expect(error).toBeNull()
    expect(count).toBe(0)
    expect(data).toBeNull()
  })

  // ⚠ FALLA A PROPOSITO. El catalogo de `servicios` se lee con `using (true)`
  // (deuda #60 de AGENTS.md): RLS no puede ver el subdominio, asi que el
  // catalogo es publico y el frontend lo filtra por `barberia_id`. Que un admin
  // de A vea el catalogo de B NO es un fallo de seguridad (son datos publicos:
  // nombre, precio y foto), pero la cuenta del cliente solo ve SUS citas.
  it.fails('INT-02 · F-08 · el admin de A no ve los servicios de B (count = 0)', async () => {
    const { count } = await sesiones.dueno
      .from('servicios')
      .select('id', { count: 'exact', head: true })
      .eq('barberia_id', BARBERIA_B)

    // Falla: el catalogo es publico por diseño (deuda #60), count > 0.
    expect(count).toBe(0)
  })

  it('INT-03 · F-08 · el admin de A no modifica las citas de B (0 filas afectadas)', async () => {
    const { data: propias, count: totalPropias } = await sesiones.proveedor
      .from('citas')
      .select('id, notas', { count: 'exact' })
      .eq('barberia_id', BARBERIA_B)
      .limit(1)
    expect(totalPropias).toBeGreaterThan(0)

    const { data: afectadas, error } = await sesiones.dueno
      .from('citas')
      .update({ notas: 'int_prueba-intento' })
      .eq('id', propias[0].id)
      .select('id, notas')

    // Un UPDATE bloqueado por RLS no da error: afecta a 0 filas en silencio.
    expect(error).toBeNull()
    expect(afectadas).toEqual([])

    // Y la fila sigue como estaba.
    const { data: despues } = await sesiones.proveedor
      .from('citas')
      .select('notas')
      .eq('id', propias[0].id)
      .single()
    expect(despues.notas).not.toBe('int_prueba-intento')
  })

  it('INT-04 · F-08 · el admin de A no modifica los servicios de B (0 filas afectadas)', async () => {
    const { data: antes } = await sesiones.proveedor
      .from('servicios')
      .select('costo')
      .eq('id', SERVICIO_DE_B)
      .single()

    const { data: afectadas, error } = await sesiones.dueno
      .from('servicios')
      .update({ costo: 999 })
      .eq('id', SERVICIO_DE_B)
      .select('id, costo')

    expect(error).toBeNull()
    expect(afectadas).toEqual([])

    const { data: despues } = await sesiones.proveedor
      .from('servicios')
      .select('costo')
      .eq('id', SERVICIO_DE_B)
      .single()
    expect(despues.costo).toBe(antes.costo)
  })
})

describe.skipIf(!hayClaveAnon())('RLS · el cliente solo ve sus citas', () => {
  it('INT-05 · F-07 · el cliente ve exactamente sus citas y ninguna mas', async () => {
    // Referencia: cuantas citas tienen su `cliente_id`, segun el superadmin.
    const { count: propiasDelCliente } = await sesiones.proveedor
      .from('citas')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', CLIENTE_ID)
    expect(propiasDelCliente).toBeGreaterThan(0)

    const { data: vistas, count: totalVistas, error } = await sesiones.cliente
      .from('citas')
      .select('id, cliente_id', { count: 'exact' })

    expect(error).toBeNull()
    expect(totalVistas).toBe(propiasDelCliente)
    expect(vistas.length).toBe(propiasDelCliente)
    // Todas y cada una son suyas.
    expect(vistas.every((c) => c.cliente_id === CLIENTE_ID)).toBe(true)
    // Y la cita publica (sin `cliente_id`) no aparece.
    expect(vistas.some((c) => c.id === CITA_DE_OTRO)).toBe(false)
  })

  it('INT-06 · F-07 · el cliente no puede modificar una cita (ni siquiera propia)', async () => {
    const { data: propias } = await sesiones.cliente
      .from('citas')
      .select('id, notas')
      .limit(1)
    expect(propias.length).toBeGreaterThan(0)

    const { data: afectadas, error } = await sesiones.cliente
      .from('citas')
      .update({ notas: 'int_prueba-intento' })
      .eq('id', propias[0].id)
      .select('id')

    expect(error).toBeNull()
    expect(afectadas).toEqual([])

    const { data: despues } = await sesiones.proveedor
      .from('citas')
      .select('notas')
      .eq('id', propias[0].id)
      .single()
    expect(despues.notas).not.toBe('int_prueba-intento')
  })

  it('INT-07 · F-07 · el cliente no puede borrar una cita', async () => {
    const { data: propias } = await sesiones.cliente
      .from('citas')
      .select('id')
      .limit(1)
    expect(propias.length).toBeGreaterThan(0)

    const { data: afectadas, error } = await sesiones.cliente
      .from('citas')
      .delete()
      .eq('id', propias[0].id)
      .select('id')

    expect(error).toBeNull()
    expect(afectadas).toEqual([])

    const { count: siguen } = await sesiones.proveedor
      .from('citas')
      .select('id', { count: 'exact', head: true })
      .eq('id', propias[0].id)
    expect(siguen).toBe(1)
  })

  it('INT-08 · F-14 · el cliente no puede insertar en membresias', async () => {
    // La barberia B es la que NO tiene membresia: si el INSERT pasara, no
    // chocaria con la clave primaria y el error seria el de verdad.
    const { error } = await sesiones.cliente
      .from('membresias')
      .insert({ user_id: CLIENTE_ID, barberia_id: BARBERIA_B })

    expect(error).not.toBeNull()
    expect(error.code).toBe('42501')
  })
})

describe.skipIf(!hayClaveAnon())('RLS · la reserva publica solo en barberias activas', () => {
  it('INT-09 · F-05 · nadie puede insertar citas en una barberia inactiva', async () => {
    const barbs = await crearBarberiaDePrueba(sesiones.proveedor, { marca, activa: false })

    // Sin sesion.
    const { error: errorAnon } = await sesiones.anon
      .from('citas')
      .insert([citaDePrueba({ marca, barberiaId: barbs.id, ...franja(FECHA, 1) })])
    expect(errorAnon).not.toBeNull()

    // Con sesion de cliente.
    const { error: errorCliente } = await sesiones.cliente
      .from('citas')
      .insert([citaDePrueba({ marca, barberiaId: barbs.id, ...franja(FECHA, 2) })])
    expect(errorCliente).not.toBeNull()

    // Y no se ha creado nada.
    const { count } = await sesiones.proveedor
      .from('citas')
      .select('id', { count: 'exact', head: true })
      .eq('barberia_id', barbs.id)
    expect(count).toBe(0)
  })

  // ⚠ FALLA A PROPOSITO. El proyecto de PRUEBAS no tiene la politica
  // «Cualquiera puede agendar» (si esta en produccion: `insert to
  // anon, authenticated` con `exists (select 1 from barberias b where
  // b.id = citas.barberia_id and b.activa)`), asi que ni anon ni el cliente
  // pueden registrar una cita. Es una DIFERENCIA entre el proyecto de pruebas
  // y produccion, no un fallo del codigo: en produccion la reserva publica si
  // funciona. Se deja como `it.fails` hasta que el proyecto de pruebas se
  // actualice con `database/schema.sql`.
  it.fails('INT-10 · F-05 · anon si puede insertar citas en una barberia activa', async () => {
    const { data, error } = await sesiones.anon
      .from('citas')
      .insert([citaDePrueba({ marca, ...franja(FECHA, 3) })])
      .select('id, barberia_id')
      .single()

    // Falla con 42501: el proyecto de pruebas no tiene esa politica.
    expect(error).toBeNull()
    expect(data.barberia_id).toBe(BARBERIA_A)
  })

  it('INT-11 · F-05 · el admin de su barberia si puede registrar una cita (control positivo)', async () => {
    // Si esto tampoco funcionara, los rechazos de arriba no probarian nada.
    const { data, error } = await sesiones.dueno
      .from('citas')
      .insert([citaDePrueba({ marca, ...franja(FECHA, 4) })])
      .select('id, barberia_id')
      .single()

    expect(error).toBeNull()
    expect(data.barberia_id).toBe(BARBERIA_A)

    // Y la cita existe de verdad.
    const { data: vista } = await sesiones.dueno
      .from('citas')
      .select('id')
      .eq('id', data.id)
      .single()
    expect(vista.id).toBe(data.id)
  })
})
