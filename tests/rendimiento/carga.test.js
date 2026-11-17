// tests/rendimiento/carga.test.js
//
// Prueba de carga: N lecturas concurrentes del listado de citas de una
// barbería, midiendo mediana y p95. No satures: 30 lecturas en paralelo.
//
// Lee TEST_SUPABASE_URL y TEST_SUPABASE_PUBLISHABLE_KEY del entorno.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.TEST_SUPABASE_URL
const KEY = process.env.TEST_SUPABASE_PUBLISHABLE_KEY

if (!URL || !KEY) {
  throw new Error('Faltan TEST_SUPABASE_URL o TEST_SUPABASE_PUBLISHABLE_KEY')
}

const CORREO = 'proveedor@ejemplo.com'
const CLAVE = 'Demo1234!'

const CONCURRENTES = 30
const RESULTADOS_ARCHIVO = 'tests/rendimiento_resultados_carga.md'

function percentil(valores, p) {
  const ordenados = [...valores].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * ordenados.length) - 1
  return ordenados[Math.max(0, Math.min(idx, ordenados.length - 1))]
}

function mediana(valores) {
  return percentil(valores, 50)
}

let supabase = null
let BARBERIA_ID = null
let tiemposCarga = []

beforeAll(async () => {
  supabase = createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data } = await supabase.auth.signInWithPassword({
    email: CORREO,
    password: CLAVE,
  })
  if (!data?.session) throw new Error('No se pudo iniciar sesion como proveedor')

  const { data: barberias } = await supabase
    .from('barberias')
    .select('id')
    .like('nombre', 'int_%')
    .limit(1)
  if (!barberias || barberias.length === 0) {
    throw new Error('No hay barberias de prueba. Ejecute primero generar_datos.js')
  }
  BARBERIA_ID = barberias[0].id
  console.log(`Barberia de prueba para carga: ${BARBERIA_ID}`)
})

afterAll(async () => {
  const fs = await import('node:fs')
  const med = mediana(tiemposCarga).toFixed(0)
  const mn = Math.min(...tiemposCarga).toFixed(0)
  const mx = Math.max(...tiemposCarga).toFixed(0)
  const p95 = percentil(tiemposCarga, 95).toFixed(0)
  const lineas = [
    '# Resultados de rendimiento · carga concurrente',
    `Fecha: ${new Date().toISOString()}`,
    `Proyecto de pruebas: ${URL}`,
    `Lecturas concurrentes: ${CONCURRENTES}`,
    `Corridas totales: ${tiemposCarga.length}`,
    '',
    '| Metrica | Valor (ms) |',
    '|---|---|',
    `| Mediana | ${med} |`,
    `| Minimo | ${mn} |`,
    `| Maximo | ${mx} |`,
    `| p95 | ${p95} |`,
    '',
  ]
  fs.writeFileSync(RESULTADOS_ARCHIVO, lineas.join('\n'))
  console.log(
    `Carga: n=${tiemposCarga.length} mediana=${med}ms min=${mn}ms max=${mx}ms p95=${p95}ms`,
  )
  console.log(`Reporte escrito en ${RESULTADOS_ARCHIVO}`)
})

describe('Carga concurrente de lecturas', () => {
  it(`${CONCURRENTES} lecturas paralelas del listado de citas de una barberia`, async () => {
    const inicioGlobal = performance.now()
    const promises = []
    for (let i = 0; i < CONCURRENTES; i += 1) {
      promises.push(
        (async () => {
          const inicio = performance.now()
          const { error } = await supabase
            .from('citas')
            .select('*')
            .eq('barberia_id', BARBERIA_ID)
            .order('fecha', { ascending: true })
            .order('hora', { ascending: true })
          const fin = performance.now()
          if (error) throw error
          tiemposCarga.push(fin - inicio)
        })(),
      )
    }
    await Promise.all(promises)
    const finGlobal = performance.now()
    console.log(
      `  ${CONCURRENTES} lecturas concurrentes en ${(finGlobal - inicioGlobal).toFixed(0)}ms total`,
    )
  })
})

describe('Umbrales de carga', () => {
  it('la mediana de lecturas concurrentes es menor a 2000 ms', () => {
    expect(tiemposCarga.length).toBe(CONCURRENTES)
    expect(mediana(tiemposCarga)).toBeLessThan(2000)
  })
})
