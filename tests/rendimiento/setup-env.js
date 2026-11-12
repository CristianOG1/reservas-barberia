// tests/rendimiento/setup-env.js
//
// Carga las variables de entorno desde .env.test para las pruebas de
// rendimiento de Vitest. Vitest no lee automaticamente este archivo, por lo
// que se declara en setupFiles de vitest.rendimiento.config.js.
//
// No se imprime ni se registra ninguna clave. Solo se asignan a process.env
// para que los archivos de prueba las lean mediante process.env.X.

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
  // Ignorar lineas vacias y comentarios
  if (!limpia || limpia.startsWith('#')) continue

  const igual = limpia.indexOf('=')
  if (igual === -1) continue

  const clave = limpia.slice(0, igual).trim()
  let valor = limpia.slice(igual + 1).trim()

  // Quitar comillas si las hay
  if (
    (valor.startsWith('"') && valor.endsWith('"')) ||
    (valor.startsWith("'") && valor.endsWith("'"))
  ) {
    valor = valor.slice(1, -1)
  }

  // Solo asignar si la variable ya no esta definida en el entorno
  if (!(clave in process.env)) {
    process.env[clave] = valor
  }
}
