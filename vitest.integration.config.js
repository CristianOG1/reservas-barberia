// vitest.integration.config.js
// Configuracion de las pruebas de INTEGRACION contra el proyecto de pruebas de
// Supabase.
//
// No se ejecuta contra produccion: tests/integration/setup.js aborta si falta
// TEST_SUPABASE_URL o si la URL apunta al proyecto real.
//
//   TEST_SUPABASE_URL=https://<ref>.supabase.co \
//   TEST_SUPABASE_ANON_KEY=<anon> \
//   TEST_SUPABASE_SERVICE_ROLE_KEY=<service_role> \
//   pnpm test:integration
//
// Solo se exponen variables TEST_*: el entorno de integracion no hereda el
// VITE_* del frontend, para que un test no pueda confundirse con el navegador.

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**'],
    // El setup no es un archivo de pruebas: se excluye del include.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/integration/setup.js'],
    setupFiles: ['tests/integration/setup.js'],
    env: {
      TEST_SUPABASE_URL: process.env.TEST_SUPABASE_URL,
      TEST_SUPABASE_ANON_KEY: process.env.TEST_SUPABASE_ANON_KEY,
      TEST_SUPABASE_SERVICE_ROLE_KEY: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY,
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
