// vitest.rendimiento.config.js
//
// Configuracion de las pruebas DE RENDIMIENTO contra el proyecto de pruebas de
// Supabase. Proyecto aparte de Vitest: no se mezcla con las unitarias
// (tests/unit) ni con las de integracion (tests/integration).
//
//   TEST_SUPABASE_URL=https://... TEST_SUPABASE_PUBLISHABLE_KEY=... \
//     pnpm test:rendimiento
//
// El guard de seguridad de integracion (tests/integration/setup.js) NO se
// aplica aqui: este script lee directamente las variables de entorno y aborta
// si apuntan a produccion (ver tests/rendimiento/generar_datos.js).

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rendimiento/**'],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/rendimiento/generar_datos.js', 'tests/rendimiento/setup-env.js'],
    setupFiles: ['./tests/rendimiento/setup-env.js'],
    testTimeout: 60000,
    hookTimeout: 30000,
  },
})
