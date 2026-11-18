// Configuración global de Vitest: matchers, env falso y mock de Supabase; ningún test toca la red.
// La app importa el mismo objeto que los tests configuran con supabaseMock.reset()/on().

import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { supabaseMock } from './mocks/supabaseClient'

vi.mock('../src/supabaseClient', async () => {
  const { supabaseMock: mock } = await import('./mocks/supabaseClient')
  return { supabase: mock }
})

// Env falso y reconocible; se repite en cada test para no contaminar al siguiente.
beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://proyecto-de-prueba.supabase.co')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_clave_falsa_de_prueba')
})

afterEach(() => {
  supabaseMock.reset()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})
