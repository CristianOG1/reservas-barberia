// tests/integration/setup.js
// Guard de seguridad de las pruebas de integracion.
//
// Las pruebas de integracion ESCRIBEN en la base (crean barberias, citas y
// membresias de prueba). Ejecutarlas contra produccion alteraria los datos
// reales del piloto, asi que aqui se aborta si:
//
//   1. falta TEST_SUPABASE_URL, o
//   2. la URL apunta al proyecto de produccion.
//
// Los datos que se crean usan el dominio reservado @ejemplo.com y se limpian
// al final de cada suite.

const REF_PRODUCCION = 'jlwwdavshkvjqfbmyzeg'
const DOMINIO_PRODUCCION = 'gools.com.mx'

const url = String(process.env.TEST_SUPABASE_URL || '').trim()

if (!url) {
  throw new Error(
    '[integracion] Falta TEST_SUPABASE_URL.\n' +
      '            Define la URL del proyecto de PRUEBAS de Supabase:\n' +
      '              TEST_SUPABASE_URL=https://<ref>.supabase.co pnpm test:integration\n' +
      '            NUNCA apunte al proyecto de produccion.'
  )
}

if (url.includes(REF_PRODUCCION) || url.includes(DOMINIO_PRODUCCION)) {
  throw new Error(
    '[integracion] TEST_SUPABASE_URL apunta al proyecto de PRODUCCION. Ejecucion abortada.\n' +
      `            URL recibida: ${url}\n` +
      '            Las pruebas de integracion escriben en la base: usa un proyecto de pruebas.'
  )
}

if (!/^https:\/\//.test(url)) {
  throw new Error(`[integracion] TEST_SUPABASE_URL no es una URL https valida: ${url}`)
}
