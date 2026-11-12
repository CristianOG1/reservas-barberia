// tests/rendimiento/consultas.test.js
//
// Pruebas de rendimiento: tiempo de respuesta de consultas críticas contra
// el proyecto de PRUEBAS de Supabase.
//
// Cada consulta se ejecuta N >= 10 veces y se reporta mediana, minimo, maximo
// y p95. Los umbrales son holgados (mediana < 2000 ms): el objetivo es
// establecer una línea base, no fallar por margen estrecho.
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

const N_CORRIDAS = 12
const UMBRAL_MEDIANA_MS = 2000

let supabase = null
let BARBERIA_ID = null
const resultados = {} // nombre => array de ms

function percentil(valores, p) {
  const ordenados = [...valores].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * ordenados.length) - 1
  return ordenados[Math.max(0, Math.min(idx, ordenados.length - 1))]
}

function mediana(valores) {
  return percentil(valores, 50)
}

async function medir(nombre, fn) {
  const tiempos = []
  for (let i = 0; i < N_CORRIDAS; i += 1) {
    const inicio = performance.now()
    await fn()
    const fin = performance.now()
    tiempos.push(fin - inicio)
  }
  resultados[nombre] = tiempos
  const med = mediana(tiempos)
  const mn = Math.min(...tiempos)
  const mx = Math.max(...tiempos)
  const p95 = percentil(tiempos, 95)
  const estado = med < UMBRAL_MEDIANA_MS ? 'OK' : 'SOBRE UMBRAL'
  console.log(
    `  ${nombre}: n=${N_CORRIDAS} mediana=${med.toFixed(0)}ms min=${mn.toFixed(0)}ms max=${mx.toFixed(0)}ms p95=${p95.toFixed(0)}ms [${estado}]`,
  )
}

beforeAll(async () => {
  supabase = createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data } = await supabase.auth.signInWithPassword({
    email: CORREO,
    password: CLAVE,
  })
  if (!data?.session) throw new Error('No se pudo iniciar sesion como proveedor')

  // Elegir una barberia de prueba con citas para las consultas
  const { data: barberias } = await supabase
    .from('barberias')
    .select('id')
    .like('nombre', 'int_%')
    .limit(1)
  if (!barberias || barberias.length === 0) {
    throw new Error('No hay barberias de prueba. Ejecute primero generar_datos.js')
  }
  BARBERIA_ID = barberias[0].id
  console.log(`Barberia de pruebas para rendimiento: ${BARBERIA_ID}`)
})

afterAll(async () => {
  // Escribir resultados en el archivo de reporte
  const fs = await import('node:fs')
  const lineas = [
    '# Resultados de rendimiento · consultas',
    `Fecha: ${new Date().toISOString()}`,
    `Proyecto de pruebas: ${URL}`,
    `Corridas por consulta: ${N_CORRIDAS}`,
    `Umbral de mediana: < ${UMBRAL_MEDIANA_MS} ms`,
    '',
    '| Consulta | n | mediana (ms) | min (ms) | max (ms) | p95 (ms) | Estado |',
    '|---|---|---|---|---|---|---|',
  ]
  for (const [nombre, tiempos] of Object.entries(resultados)) {
    const med = mediana(tiempos).toFixed(0)
    const mn = Math.min(...tiempos).toFixed(0)
    const mx = Math.max(...tiempos).toFixed(0)
    const p95 = percentil(tiempos, 95).toFixed(0)
    const estado = med < UMBRAL_MEDIANA_MS ? 'OK' : 'SOBRE UMBRAL'
    lineas.push(`| ${nombre} | ${N_CORRIDAS} | ${med} | ${mn} | ${mx} | ${p95} | ${estado} |`)
  }
  lineas.push('')
  fs.writeFileSync('tests/rendimiento_resultados_consultas.md', lineas.join('\n'))
  console.log('Reporte escrito en tests/rendimiento_resultados_consultas.md')
})

describe('Consultas críticas (volumen de prueba)', () => {
  it('listado de citas de una barbería (consulta de CitasAdmin)', async () => {
    await medir('citas_por_barberia', async () => {
      const { error } = await supabase
        .from('citas')
        .select('*')
        .eq('barberia_id', BARBERIA_ID)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true })
      if (error) throw error
    })
  })

  it('RPC horas_ocupadas', async () => {
    await medir('horas_ocupadas', async () => {
      const { error } = await supabase.rpc('horas_ocupadas', {
        fecha_consulta: '2099-06-15',
        barberia_id: BARBERIA_ID,
        barbero_id: null,
      })
      if (error) throw error
    })
  })

  it('RPC superadmin_resumen_barberias', async () => {
    await medir('superadmin_resumen_barberias', async () => {
      const { error } = await supabase.rpc('superadmin_resumen_barberias')
      if (error) throw error
    })
  })
})

describe('Umbrales de rendimiento', () => {
  it('todas las consultas críticas tienen mediana por debajo del umbral', () => {
    for (const [, tiempos] of Object.entries(resultados)) {
      const med = mediana(tiempos)
      expect(med).toBeLessThan(UMBRAL_MEDIANA_MS)
    }
  })
})
