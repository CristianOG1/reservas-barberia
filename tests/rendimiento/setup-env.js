// Carga .env.test en process.env para rendimiento; Vitest no lo lee solo, se declara en setupFiles.
// Ninguna clave se imprime ni se registra.

import fs from 'node:fs'
import path from 'node:path'

const RUTA_ENV = path.resolve(process.cwd(), '.env.test')

if (!fs.existsSync(RUTA_ENV)) {
  throw new Error(
    '[rendimiento] No se encontro .env.test en la raiz del proyecto. ' +
      'Crea el archivo con TEST_SUPABASE_URL y TEST_SUPABASE_PUBLISHABLE_KEY.',
  )
}

const lineas = fs.readFileSync(RUTA_ENV, 'utf8').split(/\r?\n/)

for (const linea of lineas) {
  const limpia = linea.trim()
  if (!limpia || limpia.startsWith('#')) continue

  const igual = limpia.indexOf('=')
  if (igual === -1) continue

  const clave = limpia.slice(0, igual).trim()
  let valor = limpia.slice(igual + 1).trim()

  if (
    (valor.startsWith('"') && valor.endsWith('"')) ||
    (valor.startsWith("'") && valor.endsWith("'"))
  ) {
    valor = valor.slice(1, -1)
  }

  if (!(clave in process.env)) {
    process.env[clave] = valor
  }
}
