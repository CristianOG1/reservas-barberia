// tests/integration/reglas.test.js
// Las reglas de la tabla `barberias` que el formulario y la Edge Function
// anticipan, comprobadas contra la base REAL (la ultima palabra es el
// `CHECK` y el indice unico de la base).
//
// Matriz v3:
//   F-15 «Administrar las barberias registradas»
//   F-16 «Crear una barberia junto con la cuenta de su dueno»: «un slug
//        reservado o con formato invalido se rechaza con el motivo».

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  abrirSesiones,
  crearBarberiaDePrueba,
  hayClaveAnon,
  limpiar,
  nuevaMarca,
} from '../helpers/integracion.js'

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

describe.skipIf(!hayClaveAnon())('Reglas · el slug de una barberia', () => {
  it('INT-31 · F-16 · un slug reservado se rechaza', async () => {
    const { data, error } = await sesiones.proveedor.from('barberias').insert({
      nombre: 'int_prueba-reservado',
      slug: 'admin',
      activa: true,
      zona_horaria: 'America/Mexico_City',
    })

    expect(error).not.toBeNull()
    // Violacion del CHECK `barberias_slug_valido`.
    expect(error.code).toBe('23514')
    expect(data).toBeNull()
  })

  it('INT-32 · F-16 · un slug duplicado da 23505', async () => {
    // `kromatik` es el slug de la primera barberia del seed.
    const { data, error } = await sesiones.proveedor.from('barberias').insert({
      nombre: 'int_prueba-duplicado',
      slug: 'kromatik',
      activa: true,
      zona_horaria: 'America/Mexico_City',
    })

    expect(error).not.toBeNull()
    expect(error.code).toBe('23505')
    expect(data).toBeNull()
  })

  it('INT-33 · F-16 · un slug valido si se crea (control positivo)', async () => {
    // Si esto tampoco funcionara, los dos rechazos de arriba no probarian nada.
    const barbs = await crearBarberiaDePrueba(sesiones.proveedor, { marca, activa: true })

    expect(barbs.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect(barbs.activa).toBe(true)

    const { data: leida } = await sesiones.proveedor
      .from('barberias')
      .select('id, slug, activa')
      .eq('id', barbs.id)
      .single()
    expect(leida.slug).toBe(barbs.slug)
  })

  it('INT-34 · F-15 · una barberia inactiva no se ve desde anon', async () => {
    const barbs = await crearBarberiaDePrueba(sesiones.proveedor, { marca, activa: false })

    // Con la sesion: el superadmin si la ve.
    const { data: conSesion } = await sesiones.proveedor
      .from('barberias')
      .select('id')
      .eq('id', barbs.id)
      .maybeSingle()
    expect(conSesion).not.toBeNull()

    // Sin sesion: la politica de lectura publica es `activa = true`.
    const { data: sinSesion } = await sesiones.anon
      .from('barberias')
      .select('id')
      .eq('id', barbs.id)
      .maybeSingle()
    expect(sinSesion).toBeNull()
  })
})
