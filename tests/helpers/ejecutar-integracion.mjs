// tests/helpers/ejecutar-integracion.mjs
// Lanza la suite de integracion contra el proyecto de PRUEBAS.
//
// El guard de `tests/integration/setup.js` exige que `TEST_SUPABASE_URL` este
// definida en el ENTORNO (y que no apunte a produccion). Este script solo
// hace de puente: lee `.env.test` (que ya existe en el repo y es
// gitignored), exporta las tres variables y arranca vitest.
//
//   node tests/helpers/ejecutar-integracion.mjs
//
// ⚠ No imprime ninguna clave: solo dice si cada variable esta definida.

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.resolve(aqui, '..', '..')

/** Ref de produccion: el mismo que comprueba el guard. */
const REF_PRODUCCION = 'jlwwdavshkvjqfbmyzeg'
const DOMINIO_PRODUCCION = 'gools.com.mx'

/** Lee un archivo .env (formato KEY=VALUE). */
function leerEnv(archivo) {
  const vars = {}
  if (!fs.existsSync(archivo)) return vars
  for (const linea of fs.readFileSync(archivo, 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return vars
}

const fuente = leerEnv(path.join(raiz, '.env.test'))

const url = (
  process.env.TEST_SUPABASE_URL || fuente.TEST_SUPABASE_URL || fuente.VITE_SUPABASE_URL || ''
).trim()
const anon = (
  process.env.TEST_SUPABASE_ANON_KEY || fuente.TEST_SUPABASE_ANON_KEY || fuente.VITE_SUPABASE_PUBLISHABLE_KEY || ''
).trim()
const serviceRole = (
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ||
  fuente.TEST_SUPABASE_SERVICE_ROLE_KEY ||
  fuente.SUPABASE_SERVICE_ROLE_KEY ||
  ''
).trim()

// Defensa en profundidad: el guard tambien aborta, pero aqui el mensaje es
// mas claro y no se lanza nada.
if (!url) {
  console.error('[integracion] No hay URL del proyecto de pruebas.')
  console.error('            Defina TEST_SUPABASE_URL o complete .env.test con VITE_SUPABASE_URL.')
  process.exit(1)
}
if (url.includes(REF_PRODUCCION) || url.includes(DOMINIO_PRODUCCION)) {
  console.error('[integracion] La URL apunta a PRODUCCION. Ejecucion abortada.')
  process.exit(1)
}

process.env.TEST_SUPABASE_URL = url
process.env.TEST_SUPABASE_ANON_KEY = anon
if (serviceRole) process.env.TEST_SUPABASE_SERVICE_ROLE_KEY = serviceRole

console.log('[integracion] Proyecto de pruebas: listo.')
console.log('[integracion]   TEST_SUPABASE_URL:              definida')
console.log('[integracion]   TEST_SUPABASE_ANON_KEY:         ' + (anon ? 'definida' : 'FALTA (las pruebas se saltaran)'))
console.log('[integracion]   TEST_SUPABASE_SERVICE_ROLE_KEY: ' + (serviceRole ? 'definida' : 'no definida (se saltan INT-33 e INT-34)'))

const vitest = path.join(raiz, 'node_modules', 'vitest', 'vitest.mjs')
const hijo = spawn(
  process.execPath,
  [vitest, 'run', '--config', 'vitest.integration.config.js'],
  { cwd: raiz, stdio: 'inherit', env: process.env }
)

hijo.on('exit', (codigo) => process.exit(codigo ?? 1))
