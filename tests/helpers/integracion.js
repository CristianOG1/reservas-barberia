// Utilidades de las pruebas de integración: Supabase real con el mismo cliente de la app (RLS, índices y RPC).
// Viven en helpers/ porque el config recolecta todo archivo de integration/; el guard de setup.js valida la URL y las claves no se imprimen.

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Prefijo de todo lo que crean las pruebas; cada prueba añade su marca y la limpieza solo toca la suya (archivos en paralelo).
export const PREFIJO = 'int_prueba'

// Contrasena ficticia del seed (`database/seed.sql`).
export const PASSWORD_SEED = 'Demo1234!'

export const USUARIOS = {
  proveedor: 'proveedor@ejemplo.com',      // superadmin
  dueno: 'dueno@ejemplo.com',              // admin de la barberia A
  duenoNorte: 'dueno.norte@ejemplo.com',    // admin de la barberia B
  cliente: 'cliente@ejemplo.com',          // cliente
}

export const BARBERIA_A = '11111111-1111-1111-1111-111111111111'  // Salon Demo (activa)
export const BARBERIA_B = '22222222-2222-2222-2222-222222222222'  // Barberia Norte Ficticia (activa)

// Ids en auth.users.
export const DUENO_ID = '88888888-8888-8888-8888-888888888888'
export const CLIENTE_ID = '33333333-3333-3333-3333-333333333333'

// Cita publica del seed: sin `cliente_id`, no es de nadie.
export const CITA_DE_OTRO = 'd3333333-3333-3333-3333-333333333333'

export const SERVICIO_DE_B = 'a4444444-4444-4444-4444-444444444444'

// Barberos del seed de la barberia A (ambos disponibles).
export const BARBERO_A_1 = 'c1111111-1111-1111-1111-111111111111'
export const BARBERO_A_2 = 'c2222222-2222-2222-2222-222222222222'

// Lee una variable de entorno tolerando valores ausentes o la cadena 'undefined'.
function leer(nombre) {
  const bruto = process.env[nombre]
  if (bruto === undefined || bruto === null) return ''
  const valor = String(bruto).trim()
  return valor === 'undefined' || valor === 'null' ? '' : valor
}

export function urlPruebas() {
  return leer('TEST_SUPABASE_URL').replace(/\/+$/, '')
}

// Clave publicable del proyecto de pruebas.
export function claveAnon() {
  return leer('TEST_SUPABASE_ANON_KEY')
}

// La `service_role` solo existe si el proyecto la ha compartido.
export function claveServiceRole() {
  return leer('TEST_SUPABASE_SERVICE_ROLE_KEY')
}

export function hayClaveAnon() {
  return Boolean(urlPruebas()) && Boolean(claveAnon())
}

export function hayServiceRole() {
  return Boolean(urlPruebas()) && Boolean(claveServiceRole())
}

export const MOTIVO_SIN_SERVICE_ROLE =
  'se salta: requiere TEST_SUPABASE_SERVICE_ROLE_KEY (crea y borra usuarios en auth.users)'

// En node no se persiste la sesión en disco.
export function crearCliente(clave = claveAnon()) {
  return createClient(urlPruebas(), clave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

// El login limita peticiones por IP: con archivos en paralelo, las sesiones se cachean
// en el temporal del sistema (1 h, lock `wx`, tokens nunca impresos), no en el repo.

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

function tokenEnCache(cache, correo) {
  const guardado = cache[urlPruebas()]?.[correo]
  if (!guardado) return null
  if (guardado.expira <= Date.now() + SEGUNDOS_DE_SEGURIDAD * 1000) return null
  return guardado
}

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

export async function clienteComo(correo) {
  const cliente = crearCliente()
  const cache = leerCache()

  const guardado = tokenEnCache(cache, correo)
  if (guardado) {
    const { error } = await cliente.auth.setSession({
      access_token: guardado.access_token,
      refresh_token: guardado.refresh_token,
    })
    if (!error) return cliente
  }

  // Inicio de sesión serializado; la espera se acota a ~20 s para no superar el hookTimeout de 30 s.
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

// `anon` sin sesión; `dueno`/`duenoNorte` admins A/B; `cliente`; `proveedor` superadmin; `service` puede ser null.
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

// Marca única de cada prueba: la llevan todas sus filas y la limpieza solo busca por ella.
export function nuevaMarca() {
  return `${PREFIJO}-${randomUUID().slice(0, 8)}`
}

// Todas las citas de prueba pasan por aquí para quedar marcadas y ser limpiadas.
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

// El superadmin es el único que puede crear barberías.
export async function crearBarberiaDePrueba(proveedor, { marca, activa = true } = {}) {
  const id = marca || nuevaMarca()
  // El CHECK exige ^[a-z0-9]+(-[a-z0-9]+)*$ (sin '_', 3-40); el nombre libre conserva la marca para limpiar.
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

// Borra solo las filas de una marca (ni seed ni pruebas paralelas), con el superadmin:
// es el único rol que escribe en todas las barberías.
export async function limpiar(sesiones, marca) {
  if (!sesiones || !marca) return
  const superadmin = sesiones.proveedor

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

  await superadmin.from('citas').delete().like('notas', `${marca}%`)
  await superadmin.from('servicios').delete().like('descripcion', `${marca}%`)
}

// Sufijo único por archivo: cada uno carga su propia copia del módulo, así dos pruebas
// en paralelo no piden la misma franja aunque coincidan las fechas.
const SUFIJO_ARCHIVO = randomUUID().replace(/-/g, '').slice(0, 6)

const dosDigitos = (n) => String(n).padStart(2, '0')

// Franja libre: la fecha la pasa el test (2099, fuera del seed) y la hora depende del archivo
// y del número de prueba para no colisionar entre pruebas simultáneas.
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

// Fecha aleatoria de 2099: el seed usa `current_date + N`.
export function fechaDePrueba() {
  const mes = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')
  const dia = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')
  return `2099-${mes}-${dia}`
}
