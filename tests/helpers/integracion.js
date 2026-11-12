// tests/helpers/integracion.js
// Utilidades compartidas por las pruebas de INTEGRACION.
//
// Las pruebas hablan con un proyecto de Supabase REAL usando el MISMO cliente
// que usa la aplicacion (supabase-js), de modo que lo que se comprueba es
// exactamente lo que ve el navegador: las mismas politicas RLS, los mismos
// indices y las mismas RPC.
//
// ⚠ POR QUE ESTE ARCHIVO NO ESTA EN `tests/integration/`
//   `vitest.integration.config.js` usa `include: ['tests/integration/**']` y solo
//   excluye `tests/integration/setup.js`: TODO archivo de esa carpeta se
//   collected como archivo de pruebas, y un archivo sin `describe` falla con
//   «No test suite found». Por eso los helpers viven aqui, en `tests/helpers/`.
//
// ⚠ SEGURIDAD
//   - El guard de `tests/integration/setup.js` aborta si falta
//     `TEST_SUPABASE_URL` o si apunta a produccion. Este archivo NO lo
//     sustituye: solo lee las variables ya validadas por el guard.
//   - Las claves NO se imprimen, NO se registran y NO se devuelven.

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/* ============================================================
 *  MARCAS E IDENTIFICADORES DEL SEED
 *  ============================================================ */

/**
 * Prefijo de TODO lo que crean las pruebas. Cada PRUEBA tiene ademas su propia
 * marca (unica), y la limpieza solo toca las filas de esa marca: los archivos
 * de pruebas corren EN PARALELO y una limpieza global se comia las filas del
 * archivo vecino.
 */
export const PREFIJO = 'int_prueba'

/** Contrasena de las cuentas del seed (`database/seed.sql`). Es ficticia. */
export const PASSWORD_SEED = 'Demo1234!'

/** Las cuatro cuentas del seed y su papel. */
export const USUARIOS = {
  proveedor: 'proveedor@ejemplo.com',      // superadmin
  dueno: 'dueno@ejemplo.com',              // admin de la barberia A
  duenoNorte: 'dueno.norte@ejemplo.com',    // admin de la barberia B
  cliente: 'cliente@ejemplo.com',          // cliente
}

/** Barberias del seed (`database/seed.sql`). */
export const BARBERIA_A = '11111111-1111-1111-1111-111111111111'  // Salon Demo (activa)
export const BARBERIA_B = '22222222-2222-2222-2222-222222222222'  // Barberia Norte Ficticia (activa)

/** Ids de los usuarios del seed en `auth.users`. */
export const DUENO_ID = '88888888-8888-8888-8888-888888888888'
export const CLIENTE_ID = '33333333-3333-3333-3333-333333333333'

/** Cita publica del seed: NO tiene `cliente_id`, asi que no es de nadie. */
export const CITA_DE_OTRO = 'd3333333-3333-3333-3333-333333333333'

/** Servicio del seed que pertenece a la barberia B. */
export const SERVICIO_DE_B = 'a4444444-4444-4444-4444-444444444444'

/** Barberos del seed de la barberia A (los dos estan disponibles). */
export const BARBERO_A_1 = 'c1111111-1111-1111-1111-111111111111'
export const BARBERO_A_2 = 'c2222222-2222-2222-2222-222222222222'

/* ============================================================
 *  VARIABLES DE ENTORNO
 *  ============================================================ */

/** Lee una variable de entorno tolerando valores ausentes o la cadena 'undefined'. */
function leer(nombre) {
  const bruto = process.env[nombre]
  if (bruto === undefined || bruto === null) return ''
  const valor = String(bruto).trim()
  return valor === 'undefined' || valor === 'null' ? '' : valor
}

export function urlPruebas() {
  return leer('TEST_SUPABASE_URL').replace(/\/+$/, '')
}

/** La clave publicable del proyecto de pruebas. */
export function claveAnon() {
  return leer('TEST_SUPABASE_ANON_KEY')
}

/** La clave `service_role`. Solo existe si el proyecto la ha compartido. */
export function claveServiceRole() {
  return leer('TEST_SUPABASE_SERVICE_ROLE_KEY')
}

export function hayClaveAnon() {
  return Boolean(urlPruebas()) && Boolean(claveAnon())
}

export function hayServiceRole() {
  return Boolean(urlPruebas()) && Boolean(claveServiceRole())
}

/** Motivo por el que se saltan las pruebas que tocan `auth.users`. */
export const MOTIVO_SIN_SERVICE_ROLE =
  'se salta: requiere TEST_SUPABASE_SERVICE_ROLE_KEY (crea y borra usuarios en auth.users)'

/* ============================================================
 *  CLIENTES
 *  ============================================================ */

/** Cliente de Supabase. En node no se persiste la sesion en disco. */
export function crearCliente(clave = claveAnon()) {
  return createClient(urlPruebas(), clave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

/* ------------------------------------------------------------
 *  CACHE DE SESIONES
 *
 *  El endpoint de inicio de sesion de Supabase tiene un limite de peticiones
 *  (por IP): con los archivos de pruebas en paralelo, empezar sesion una vez
 *  por archivo y por cuenta lo agota («Request rate limit reached»).
 *
 *  Asi que las sesiones se cachean en el directorio temporal del sistema
 *  (NO en el repo), con una hora de validez, y se reutilizan entre archivos y
 *  entre ejecuciones. Un archivo de bloqueo (`wx`) hace que solo un proceso
 *  inicie sesion a la vez y los demas esperen al resultado.
 *
 *  ⚠ El archivo contiene tokens de sesion: vive en el temporal, caduca solo y
 *    no se imprime nunca.
 *  ------------------------------------------------------------ */

const RUTA_CACHE = path.join(os.tmpdir(), 'barberweb-integracion-sesiones.json')
const RUTA_LOCK = path.join(os.tmpdir(), 'barberweb-integracion-sesiones.lock')
const SEGUNDOS_DE_SEGURIDAD = 120

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

function leerCache() {
  try {
    return JSON.parse(fs.readFileSync(RUTA_CACHE, 'utf8'))
  } catch {
    return {}
  }
}

function guardarCache(cache) {
  try {
    fs.writeFileSync(RUTA_CACHE, JSON.stringify(cache), { mode: 0o600 })
  } catch {
    // Si no se puede guardar, la suite sigue: solo habra mas inicios de sesion.
  }
}

/** El token guardado para una cuenta, si sigue vivo. */
function tokenEnCache(cache, correo) {
  const guardado = cache[urlPruebas()]?.[correo]
  if (!guardado) return null
  if (guardado.expira <= Date.now() + SEGUNDOS_DE_SEGURIDAD * 1000) return null
  return guardado
}

/** Coge el bloqueo de la cache. Devuelve false si otro proceso lo tiene. */
function cogerLock() {
  try {
    const fd = fs.openSync(RUTA_LOCK, 'wx')
    fs.closeSync(fd)
    return true
  } catch {
    // Si el bloqueo es viejo (un proceso murio), se retira y se vuelve a probar.
    try {
      const edad = Date.now() - fs.statSync(RUTA_LOCK).mtimeMs
      if (edad > 60_000) {
        fs.unlinkSync(RUTA_LOCK)
        const fd = fs.openSync(RUTA_LOCK, 'wx')
        fs.closeSync(fd)
        return true
      }
    } catch {
      // Da igual: se espera.
    }
    return false
  }
}

function soltarLock() {
  try {
    fs.unlinkSync(RUTA_LOCK)
  } catch {
    // Da igual.
  }
}

/** Cliente con la sesion de una cuenta del seed ya iniciada. */
export async function clienteComo(correo) {
  const cliente = crearCliente()
  const cache = leerCache()

  // 1) ¿Hay una sesion viva en la cache?
  const guardado = tokenEnCache(cache, correo)
  if (guardado) {
    const { error } = await cliente.auth.setSession({
      access_token: guardado.access_token,
      refresh_token: guardado.refresh_token,
    })
    if (!error) return cliente
  }

  // 2) Iniciar sesion de verdad, pero solo uno a la vez.
  //    La espera se acota a ~20 s: el hookTimeout del config es de 30 s y
  //    pasarse haria saltar la suite entera en un arranque en frío. Si se
  //    acaba la espera, se intenta el inicio de sesion directo (peor caso:
  //    un «Request rate limit reached», igual que sin cache).
  if (!cogerLock()) {
    for (let intento = 0; intento < 40; intento += 1) {
      await esperar(500)
      const otro = tokenEnCache(leerCache(), correo)
      if (otro) {
        const { error } = await cliente.auth.setSession({
          access_token: otro.access_token,
          refresh_token: otro.refresh_token,
        })
        if (!error) return cliente
      }
    }
  }

  try {
    const { data, error } = await cliente.auth.signInWithPassword({
      email: correo,
      password: PASSWORD_SEED,
    })
    if (error) {
      throw new Error(`[integracion] No se pudo iniciar sesion como ${correo}: ${error.message}`)
    }
    if (!data?.session) {
      throw new Error(`[integracion] La sesion de ${correo} vino vacia`)
    }

    const cacheActual = leerCache()
    const delProyecto = cacheActual[urlPruebas()] || {}
    delProyecto[correo] = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expira: Date.now() + Math.max(300, data.session.expires_in - SEGUNDOS_DE_SEGURIDAD) * 1000,
    }
    cacheActual[urlPruebas()] = delProyecto
    guardarCache(cacheActual)

    return cliente
  } finally {
    soltarLock()
  }
}

/**
 * Abre una sesion por cada papel del seed.
 *
 * - `anon`       sin sesion (la clave publicable).
 * - `dueno`      admin de la barberia A.
 * - `duenoNorte` admin de la barberia B.
 * - `cliente`    cliente del portal.
 * - `proveedor`  superadmin (ve y escribe en todas).
 * - `service`    service_role, o `null` si no se ha compartido la clave.
 */
export async function abrirSesiones() {
  const [dueno, duenoNorte, cliente, proveedor] = await Promise.all([
    clienteComo(USUARIOS.dueno),
    clienteComo(USUARIOS.duenoNorte),
    clienteComo(USUARIOS.cliente),
    clienteComo(USUARIOS.proveedor),
  ])

  return {
    anon: crearCliente(),
    dueno,
    duenoNorte,
    cliente,
    proveedor,
    service: hayServiceRole() ? crearCliente(claveServiceRole()) : null,
  }
}

/* ============================================================
 *  DATOS DE PRUEBA
 *  ============================================================ */

/**
 * Marca unica de una PRUEBA. Todas las filas que cree esa prueba la llevan y
 * la limpieza solo busca por ella.
 */
export function nuevaMarca() {
  return `${PREFIJO}-${randomUUID().slice(0, 8)}`
}

/**
 * Una cita de prueba. Todas las pruebas que crean citas pasan por aqui, asi
 * que todas quedan marcadas y la limpieza las encuentra.
 */
export function citaDePrueba({ marca, barberiaId = BARBERIA_A, fecha, hora, ...resto } = {}) {
  return {
    nombre: 'int_prueba',
    telefono: '5512345678',
    servicio: 'Corte de cabello',
    fecha,
    hora,
    notas: marca || nuevaMarca(),
    estado: 'pendiente',
    barberia_id: barberiaId,
    ...resto,
  }
}

/**
 * Crea una barberia de prueba (la usan las pruebas de RLS y de reglas).
 * El superadmin es el unico que puede crear barberias.
 */
export async function crearBarberiaDePrueba(proveedor, { marca, activa = true } = {}) {
  const id = marca || nuevaMarca()
  // El slug no puede llevar el prefijo tal cual: el CHECK barberias_slug_valido
  // exige ^[a-z0-9]+(-[a-z0-9]+)*$ (sin guion bajo) y de 3 a 40 caracteres. El
  // nombre (que si es libre) conserva la marca, que es la que usa la limpieza.
  const slug = 'b' + id.replace(/[^0-9a-f]/g, '')
  const { data, error } = await proveedor
    .from('barberias')
    .insert({
      nombre: id,
      slug,
      activa,
      zona_horaria: 'America/Mexico_City',
    })
    .select('id, nombre, slug, activa')
    .single()

  if (error) {
    throw new Error(`[integracion] No se pudo crear la barberia de prueba: ${error.message}`)
  }
  return data
}

/* ============================================================
 *  LIMPIEZA
 *  ============================================================ */

/**
 * Borra lo que ha creado UNA prueba: las filas con su marca. No toca el seed
 * ni las filas de las pruebas que corren en paralelo.
 *
 * Usa el superadmin porque es el unico rol que puede escribir en todas las
 * barberias.
 */
export async function limpiar(sesiones, marca) {
  if (!sesiones || !marca) return
  const superadmin = sesiones.proveedor

  // Barberias de prueba y todo lo que cuelgue de ellas.
  const { data: barbs } = await superadmin
    .from('barberias')
    .select('id')
    .like('nombre', `${marca}%`)

  for (const b of barbs || []) {
    await superadmin.from('citas').delete().eq('barberia_id', b.id)
    await superadmin.from('servicios').delete().eq('barberia_id', b.id)
    await superadmin.from('productos').delete().eq('barberia_id', b.id)
    await superadmin.from('barberos').delete().eq('barberia_id', b.id)
    await superadmin.from('configuracion').delete().eq('barberia_id', b.id)
    await superadmin.from('barberias').delete().eq('id', b.id)
  }

  // Citas y servicios sueltos (los que se crean en la barberia del seed).
  await superadmin.from('citas').delete().like('notas', `${marca}%`)
  await superadmin.from('servicios').delete().like('descripcion', `${marca}%`)
}

/* ============================================================
 *  FRANJAS
 *  ============================================================ */

/**
 * Sufijo unico por ARCHIVO de pruebas. Cada archivo tiene su propia copia de
 * este modulo, asi que cada uno recibe un sufijo distinto: dos archivos nunca
 * usan la misma franja aunque se crucen las fechas.
 */
const SUFIJO_ARCHIVO = randomUUID().replace(/-/g, '').slice(0, 6)

const dosDigitos = (n) => String(n).padStart(2, '0')

/**
 * Una franja libre ('YYYY-MM-DD' + 'HH:MM:SS') para una prueba.
 *
 * - La fecha es de 2099 (el seed usa `current_date + N`).
 * - La hora depende del archivo y del numero de prueba, para que dos pruebas
 *   que corren a la vez no pidan la misma franja.
 */
export function franja(fecha, numero) {
  const base = parseInt(SUFIJO_ARCHIVO.slice(0, 2), 16) % 20
  const horas = (base + numero) % 24
  const minutos = parseInt(SUFIJO_ARCHIVO.slice(2, 4), 16) % 60
  const segundos = (parseInt(SUFIJO_ARCHIVO.slice(4, 6), 16) + numero * 7) % 60
  return {
    fecha,
    hora: `${dosDigitos(horas)}:${dosDigitos(minutos)}:${dosDigitos(segundos)}`,
  }
}

/**
 * Una fecha de 2099 (aleatoria) para no chocar con el seed. Las citas del seed
 * son de `current_date + N`.
 */
export function fechaDePrueba() {
  const mes = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')
  const dia = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')
  return `2099-${mes}-${dia}`
}
