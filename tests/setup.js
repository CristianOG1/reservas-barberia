// tests/setup.js
// Configuracion global de Vitest para las pruebas unitarias.
//
// - Registra los matchers de Testing Library (toBeInTheDocument, etc.).
// - Fija variables de entorno FALSAS: ninguna prueba debe tocar la red.
// - Mockea el cliente de Supabase para que ningun test alcance la base real.
//
// El mock se registra aqui con `vi.mock`, asi que aplica a todos los archivos
// de tests/unit/. El objeto que la aplicacion importa (`supabase`) ES el mismo
// que los tests configuran con `supabaseMock.reset()` + `supabaseMock.on(...)`.

import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { supabaseMock } from './mocks/supabaseClient'

vi.mock('../src/supabaseClient', async () => {
  const { supabaseMock: mock } = await import('./mocks/supabaseClient')
  return { supabase: mock }
})

// Valores falsos por defecto. Se repiten en cada test para que uno no
// contamine al siguiente. La clave tiene un formato reconocible como falso.
beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://proyecto-de-prueba.supabase.co')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_clave_falsa_de_prueba')
})

afterEach(() => {
  supabaseMock.reset()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})
