// tests/rendimiento/generar_datos.js
//
// Carga un volumen ficticio realista en el proyecto de PRUEBAS de Supabase para
// las pruebas de rendimiento, o lo borra todo con --borrar.
//
// Lee TEST_SUPABASE_URL y TEST_SUPABASE_PUBLISHABLE_KEY del entorno (poblado
// desde .env.test cuando exista). Nunca apunta a produccion: el guard de
// tests/integration/setup.js solo valida integracion, asi que este script
// incluye su propia verificacion de que la URL no sea la de produccion.
//
// Uso:
//   TEST_SUPABASE_URL=https://... TEST_SUPABASE_PUBLISHABLE_KEY=... \
//     node tests/rendimiento/generar_datos.js
//   TEST_SUPABASE_URL=https://... TEST_SUPABASE_PUBLISHABLE_KEY=... \
//     node tests/rendimiento/generar_datos.js --borrar
//
// Al terminar la carga imprime la instruccion para correr
//   analyze public.citas;
// en el SQL Editor de Supabase.

import { createClient } from '@supabase/supabase-js'

const URL = process.env.TEST_SUPABASE_URL
const KEY = process.env.TEST_SUPABASE_PUBLISHABLE_KEY

const REF_PRODUCCION = 'jlwwdavshkvjqfbmyzeg'
const DOMINIO_PRODUCCION = 'gools.com.mx'

if (!URL || !KEY) {
  console.error('Faltan TEST_SUPABASE_URL o TEST_SUPABASE_PUBLISHABLE_KEY en el entorno')
  process.exit(1)
}

if (URL.includes(REF_PRODUCCION) || URL.includes(DOMINIO_PRODUCCION)) {
  console.error('ERROR: la URL apunta al proyecto de PRODUCCION. Abortado.')
  process.exit(1)
}

const borrar = process.argv.includes('--borrar')

const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const CORREO = 'proveedor@ejemplo.com'
const CLAVE = 'Demo1234!'
const PREFIJO = 'int_'
const LOTE = 500
const TOTAL_CITAS = 5000
const NUM_BARBERIAS = 3

const Estados = ['pendiente', 'confirmada', 'completada', 'cancelada']
const Servicios = ['Corte de cabello', 'Corte y barba', 'Barba']

function nuevaMarca() {
  return `${PREFIJO}${Math.random().toString(36).slice(2, 10)}`
}

function fechaAleatoria2099() {
  const mes = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')
  const dia = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')
  return `2099-${mes}-${dia}`
}

function horaAleatoria() {
  const h = String(Math.floor(Math.random() * 12) + 8).padStart(2, '0') // 08-19
  const m = String(Math.floor(Math.random() * 60)).padStart(2, '0')
  const s = String(Math.floor(Math.random() * 60)).padStart(2, '0')
  return `${h}:${m}:${s}`
}

async function iniciarSesion() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: CORREO,
    password: CLAVE,
  })
  if (error || !data?.session) {
    throw new Error(`No se pudo iniciar sesion como ${CORREO}: ${error?.message ?? 'sin sesion'}`)
  }
  console.log(`Sesion iniciada como ${CORREO} (proveedor / superadmin)`)
  return data.session
}

async function crearBarberias() {
  const ids = []
  for (let i = 0; i < NUM_BARBERIAS; i += 1) {
    const nombre = `${PREFIJO}Barberia Rendimiento ${i + 1}`
    const slug = `int-barberia-rendimiento-${i + 1}`
    const { data, error } = await supabase
      .from('barberias')
      .insert({
        nombre,
        slug,
        activa: true,
        zona_horaria: 'America/Mexico_City',
      })
      .select('id')
      .single()
    if (error) {
      // Si ya existe por slug duplicado de una corrida previa, la reutilizamos
      const { data: existente } = await supabase
        .from('barberias')
        .select('id')
        .eq('slug', slug)
        .single()
      if (existente) {
        ids.push(existente.id)
        console.log(`Barberia existente reutilizada: ${slug}`)
        continue
      }
      throw new Error(`No se pudo crear la barberia ${slug}: ${error.message}`)
    }
    ids.push(data.id)
    console.log(`Barberia creada: ${nombre} (${data.id})`)
  }
  return ids
}

async function crearConfiguracion(barberiaIds) {
  for (const id of barberiaIds) {
    await supabase.from('configuracion').insert({
      nombre: `${PREFIJO}Configuracion ${id}`,
      estado: 'Jalisco',
      municipio: 'Tonalá',
      descripcion: 'Configuracion de prueba para rendimiento.',
      recordatorios_activos: false,
      whatsapp_activo: false,
      barberia_id: id,
    })
  }
  console.log('Configuracion creada para', barberiaIds.length, 'barberias')
}

async function crearServiciosYProductos(barberiaIds) {
  for (const id of barberiaIds) {
    for (let i = 0; i < Servicios.length; i += 1) {
      await supabase.from('servicios').insert({
        nombre: Servicios[i],
        categoria: i === 0 ? 'Cabello' : i === 1 ? 'Combo' : 'Barba',
        descripcion: `${PREFIJO} servicio de prueba`,
        costo: 150 + i * 50,
        duracion: String(30 + i * 30),
        imagen: null,
        barberia_id: id,
      })
    }
    for (let i = 0; i < 5; i += 1) {
      await supabase.from('productos').insert({
        nombre: `${PREFIJO}Producto ${i + 1}`,
        descripcion: 'Producto de prueba para rendimiento.',
        categoria: 'Accesorios',
        precio: 100 + i * 20,
        imagen: null,
        stock: 10,
        barberia_id: id,
      })
    }
  }
  console.log('Servicios y productos creados para', barberiaIds.length, 'barberias')
}

async function crearCitas(barberiaIds) {
  // Set de (barberia_id, fecha, hora) ya usados para respetar citas_slot_unico
  const usadas = new Set()
  let insertadas = 0
  const porBarberia = Math.ceil(TOTAL_CITAS / barberiaIds.length)

  for (const barberiaId of barberiaIds) {
    let porInsertar = porBarberia
    while (porInsertar > 0) {
      const lote = Math.min(LOTE, porInsertar)
      const filas = []
      let intentos = 0
      while (filas.length < lote && intentos < lote * 10) {
        const fecha = fechaAleatoria2099()
        const hora = horaAleatoria()
        const clave = `${barberiaId}|${fecha}|${hora}`
        if (usadas.has(clave)) {
          intentos += 1
          continue
        }
        usadas.add(clave)
        const estado = Estados[Math.floor(Math.random() * Estados.length)]
        const conBarbero = Math.random() > 0.3
        const conCliente = Math.random() > 0.4
        const correo = `${PREFIJO}${nuevaMarca()}@ejemplo.com`
        filas.push({
          nombre: `${PREFIJO}Cliente`,
          telefono: '5512345678',
          servicio: Servicios[Math.floor(Math.random() * Servicios.length)],
          fecha,
          hora,
          notas: nuevaMarca(),
          estado,
          barberia_id: barberiaId,
          barbero_id: conBarbero ? null : null, // se rellena abajo si aplica
          cliente_id: conCliente ? null : null,
          correo,
          productos: '[]',
          total: 150,
        })
        intentos += 1
      }
      if (filas.length === 0) {
        throw new Error('No se pudieron generar franjas unicas para el lote')
      }
      const { error } = await supabase.from('citas').insert(filas)
      if (error) {
        throw new Error(`Error insertando lote de citas: ${error.message}`)
      }
      insertadas += filas.length
      porInsertar -= filas.length
      console.log(`  Citas insertadas: ${insertadas}/${TOTAL_CITAS}`)
    }
  }
  console.log(`Total citas insertadas: ${insertadas}`)
}

async function borrarTodo() {
  // No hay ON DELETE CASCADE en citas.barberia_id (schema.sql linea 198:
  // uuid not null references public.barberias(id)), asi que hay que borrar
  // las citas antes de las barberias para no dejar restos ni violar FK.
  console.log('Borrando citas de prueba...')
  await supabase.from('citas').delete().like('notas', `${PREFIJO}%`)
  console.log('Borrando servicios, productos, barberos de prueba...')
  await supabase.from('servicios').delete().like('descripcion', `${PREFIJO}%`)
  await supabase.from('productos').delete().like('nombre', `${PREFIJO}%`)
  await supabase.from('barberos').delete().like('nombre', `${PREFIJO}%`)
  console.log('Borrando configuracion de prueba...')
  await supabase.from('configuracion').delete().like('nombre', `${PREFIJO}%`)
  console.log('Borrando barberias de prueba...')
  await supabase.from('barberias').delete().like('nombre', `${PREFIJO}%`)
  console.log('Borrado completo.')
}

async function main() {
  if (borrar) {
    await borrarTodo()
    return
  }

  await iniciarSesion()
  const barberiaIds = await crearBarberias()
  await crearConfiguracion(barberiaIds)
  await crearServiciosYProductos(barberiaIds)
  await crearCitas(barberiaIds)

  console.log(`
================================================================
CARGA COMPLETADA
================================================================
Para actualizar las estadisticas del planificador, corra en el
SQL Editor de Supabase:

  analyze public.citas;

Despues puede ejecutar las pruebas de rendimiento con:

  pnpm test:rendimiento
`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
