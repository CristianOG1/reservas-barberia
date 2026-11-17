// tests/integration/RPC.test.js
// Permisos de las funciones de la base y comportamiento de las que el publico
// si puede usar.
//
// Matriz v3:
//   F-05 «Reservar una cita» (la franja ocupada se consulta por RPC)
//   F-06 «Gestionar el estado de una cita» (cancelar/reprogramar solo las suyas)
//   F-15 «Administrar las barberias registradas» (el resumen es del superadmin)
//   F-17 «Asignar automaticamente el barbero de la cita»

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  BARBERIA_A,
  BARBERIA_B,
  BARBERO_A_1,
  CITA_DE_OTRO,
  abrirSesiones,
  citaDePrueba,
  fechaDePrueba,
  franja,
  hayClaveAnon,
  limpiar,
  nuevaMarca,
} from '../helpers/integracion.js'

const FECHA = fechaDePrueba()
const HOY = new Date().toISOString().slice(0, 10)

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

describe.skipIf(!hayClaveAnon())('RPC · las de recordatorios no se pueden llamar desde el navegador', () => {
  it('INT-12 · anon no puede llamar recordatorios_citas_pendientes', async () => {
    const { data, error } = await sesiones.anon.rpc('recordatorios_citas_pendientes', {
      p_desde: HOY,
      p_hasta: HOY,
      p_columna_marca: 'recordatorio_24h_enviado_at',
      p_maximo: 1,
    })

    expect(error).not.toBeNull()
    expect(error.code).toBe('42501')
    expect(data).toBeNull()
  })

  it('INT-13 · anon no puede llamar recordatorios_api_key_resend', async () => {
    const { data, error } = await sesiones.anon.rpc('recordatorios_api_key_resend')

    expect(error).not.toBeNull()
    expect(error.code).toBe('42501')
    expect(data).toBeNull()
  })

  it('INT-14 · anon no puede llamar turnstile_api_key', async () => {
    const { data, error } = await sesiones.anon.rpc('turnstile_api_key')

    expect(error).not.toBeNull()
    expect(error.code).toBe('42501')
    expect(data).toBeNull()
  })

  it('INT-15 · un usuario autenticado tampoco puede reclamar recordatorios', async () => {
    for (const [rol, cliente] of Object.entries({
      dueno: sesiones.dueno,
      cliente: sesiones.cliente,
      proveedor: sesiones.proveedor,
    })) {
      const { error } = await cliente.rpc('reclamar_recordatorios', {
        p_tipo: '24h',
        p_limite_total: 1,
        p_limite_por_barberia: 1,
      })

      expect(error, `el rol ${rol} no deberia poder reclamar recordatorios`).not.toBeNull()
      expect(error.code).toBe('42501')
    }
  })
})

describe.skipIf(!hayClaveAnon())('RPC · las de consulta de agenda si responden a anon', () => {
  it('INT-16 · F-05 · horas_ocupadas responde a anon y lista las horas tomadas', async () => {
    // La cita se crea CON barbero: `horas_ocupadas` con `barbero_id = null`
    // solo devuelve las horas en las que no queda ni un barbero libre.
    const { data: creada, error: errorInsert } = await sesiones.dueno
      .from('citas')
      .insert([citaDePrueba({ marca, ...franja(FECHA, 1), barbero_id: BARBERO_A_1 })])
      .select('id, hora')
      .single()
    expect(errorInsert).toBeNull()

    const { data, error } = await sesiones.anon.rpc('horas_ocupadas', {
      fecha_consulta: FECHA,
      barberia_id: BARBERIA_A,
      barbero_id: BARBERO_A_1,
    })

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
    // La hora de la cita recien creada esta ocupada; las horas se recortan a HH:MM.
    const ocupadas = data.map((h) => String(h).slice(0, 5))
    expect(ocupadas).toContain(String(creada.hora).slice(0, 5))
    // Y una franja libre de ese mismo barbero no sale.
    expect(ocupadas).not.toContain('03:30')
  })

  it('INT-17 · F-17 · asignar_barbero responde a anon con un barbero de esa barberia', async () => {
    const { data, error } = await sesiones.anon.rpc('asignar_barbero', {
      fecha_consulta: FECHA,
      hora_consulta: '23:45:00',
      barberia_id: BARBERIA_A,
    })

    expect(error).toBeNull()
    expect(typeof data).toBe('string')

    // El barbero devuelto existe y es de esa barberia.
    const { data: barbero } = await sesiones.proveedor
      .from('barberos')
      .select('id, barberia_id, disponible')
      .eq('id', data)
      .single()
    expect(barbero.barberia_id).toBe(BARBERIA_A)
    expect(barbero.disponible).toBe(true)
  })
})

describe.skipIf(!hayClaveAnon())('RPC · cancelar_cita solo toca las citas propias', () => {
  it('INT-18 · F-06 · cancelar_cita sobre una cita ajena se rechaza', async () => {
    const { error } = await sesiones.cliente.rpc('cancelar_cita', { p_id: CITA_DE_OTRO })

    expect(error).not.toBeNull()
    expect(error.message).toContain('cita_no_modificable')

    // La cita ajena sigue como estaba.
    const { data: cita } = await sesiones.proveedor
      .from('citas')
      .select('estado')
      .eq('id', CITA_DE_OTRO)
      .single()
    expect(cita.estado).not.toBe('cancelada')
  })

  it('INT-19 · F-06 · un administrador tampoco puede cancelar la cita de otro con esa RPC', async () => {
    const { error } = await sesiones.dueno.rpc('cancelar_cita', { p_id: CITA_DE_OTRO })

    expect(error).not.toBeNull()
    expect(error.message).toContain('cita_no_modificable')
  })
})

describe.skipIf(!hayClaveAnon())('RPC · el resumen de barberias es solo del superadmin', () => {
  it('INT-20 · F-15 · superadmin_resumen_barberias rechaza a anon, al admin y al cliente', async () => {
    // Anon: ni siquiera tiene permiso de ejecucion.
    const { error: errorAnon } = await sesiones.anon.rpc('superadmin_resumen_barberias')
    expect(errorAnon).not.toBeNull()
    expect(errorAnon.code).toBe('42501')

    // Admin y cliente: tienen permiso, pero la funcion comprueba el rol.
    for (const cliente of [sesiones.dueno, sesiones.duenoNorte, sesiones.cliente]) {
      const { error } = await cliente.rpc('superadmin_resumen_barberias')
      expect(error).not.toBeNull()
      expect(error.code).toBe('42501')
      expect(error.message).toContain('solo_superadmin')
    }
  })

  it('INT-21 · F-15 · superadmin_resumen_barberias responde al superadmin', async () => {
    const { data, error } = await sesiones.proveedor.rpc('superadmin_resumen_barberias')

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
    // Salen las dos barberias del seed, con sus conteos.
    const slugs = data.map((b) => b.slug)
    expect(slugs).toContain('kromatik')
    expect(slugs).toContain('barberia-norte')
    for (const fila of data) {
      expect(typeof fila.citas_total).toBe('number')
      expect(typeof fila.servicios).toBe('number')
    }
  })
})

describe.skipIf(!hayClaveAnon())('RPC · el cliente solo puede unirse como cliente', () => {
  it('INT-22 · F-14 · unirme_a_barberia se rechaza para el admin y el superadmin', async () => {
    for (const [rol, cliente] of Object.entries({
      dueno: sesiones.dueno,
      proveedor: sesiones.proveedor,
    })) {
      const { error } = await cliente.rpc('unirme_a_barberia', { p_barberia_id: BARBERIA_B })
      expect(error, `el rol ${rol} no deberia poder unirse`).not.toBeNull()
      expect(error.message).toContain('solo_clientes')
    }
  })

  it('INT-23 · F-14 · el cliente puede unirse a una barberia (idempotente)', async () => {
    const { error } = await sesiones.cliente.rpc('unirme_a_barberia', { p_barberia_id: BARBERIA_A })

    expect(error).toBeNull()

    const { data: membresias, error: errorLectura } = await sesiones.cliente
      .from('membresias')
      .select('barberia_id')
      .eq('barberia_id', BARBERIA_A)

    expect(errorLectura).toBeNull()
    expect(membresias.length).toBe(1)
    expect(membresias[0].barberia_id).toBe(BARBERIA_A)
  })
})

describe.skipIf(!hayClaveAnon())('RPC · las cuentas del seed tienen el papel que dice el seed', () => {
  it('INT-24 · F-01 · rol_actual devuelve el papel de cada cuenta', async () => {
    const { data: rolProveedor } = await sesiones.proveedor.rpc('rol_actual')
    const { data: rolDueno } = await sesiones.dueno.rpc('rol_actual')
    const { data: rolDuenoNorte } = await sesiones.duenoNorte.rpc('rol_actual')
    const { data: rolCliente } = await sesiones.cliente.rpc('rol_actual')

    expect(rolProveedor).toBe('superadmin')
    expect(rolDueno).toBe('admin')
    expect(rolDuenoNorte).toBe('admin')
    expect(rolCliente).toBe('cliente')
  })

  it('INT-25 · F-08 · es_superadmin solo es cierto para el proveedor', async () => {
    // `perfiles` solo deja leer la fila propia (su unica politica es
    // `auth.uid() = id`), asi que el papel se comprueba con la funcion.
    const { data: esProveedor } = await sesiones.proveedor.rpc('es_superadmin')
    const { data: esDueno } = await sesiones.dueno.rpc('es_superadmin')
    const { data: esDuenoNorte } = await sesiones.duenoNorte.rpc('es_superadmin')
    const { data: esCliente } = await sesiones.cliente.rpc('es_superadmin')

    expect(esProveedor).toBe(true)
    expect(esDueno).toBe(false)
    expect(esDuenoNorte).toBe(false)
    expect(esCliente).toBe(false)
  })

  it('INT-26 · F-07 · reagendar_cita sobre una cita ajena se rechaza', async () => {
    const { error } = await sesiones.cliente.rpc('reagendar_cita', {
      p_id: CITA_DE_OTRO,
      p_fecha: '2099-12-31',
      p_hora: '23:00:00',
    })

    expect(error).not.toBeNull()
    expect(error.message).toContain('cita_no_modificable')
  })
})
