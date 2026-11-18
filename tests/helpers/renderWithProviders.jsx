// Render con BarberiaContext y ConfiguracionContext inyectables y router en memoria.
// AuthContext no se exporta: se simula con vi.mock de src/context/useAuth (`authSimulado`); Supabase se moca en tests/setup.js.

import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BarberiaContext } from '../../src/context/barberia'
import { ConfiguracionContext } from '../../src/context/configuracion'

// Cada render copia este objeto, no el anterior: si no, un `cargando: true` se hereda al siguiente test.
const AUTH_POR_DEFECTO = {
  session: null,
  cargando: false,
  login: async () => ({ error: null }),
  logout: async () => ({ error: null }),
  rol: null,
  cargandoRol: false,
  barberiaId: null,
  unirmeABarberia: async () => ({ error: null }),
}

// Los tests con sesión apuntan su mock de `useAuth` a este valor.
export const authSimulado = {
  valor: { ...AUTH_POR_DEFECTO },
}

export const BARBERIA_POR_DEFECTO = {
  barberia: null,
  cargando: false,
  noEncontrada: false,
  slug: null,
  sinSlug: true,
  sitioPrincipal: false,
}

export const CONFIGURACION_POR_DEFECTO = {
  configuracion: {
    id: null,
    barberia_id: null,
    nombre: '',
    estado: '',
    municipio: '',
    logo: '',
    descripcion: '',
  },
  cargando: false,
  refrescar: async () => {},
}

// Con la forma que devuelve Supabase Auth.
export function sesionSimulada(overrides = {}) {
  return {
    access_token: 'token-de-prueba',
    refresh_token: 'refresh-de-prueba',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'usuario-1',
      email: 'demo@ejemplo.com',
      user_metadata: { full_name: 'Usuario de prueba' },
      ...(overrides.user || {}),
    },
    ...overrides,
  }
}

// `auth` se simula vía authSimulado; los demás contextos se inyectan como Provider.
export function renderWithProviders(ui, opciones = {}) {
  const { ruta = '/', auth, barberia, configuracion } = opciones

  if (auth !== undefined) {
    authSimulado.valor = { ...AUTH_POR_DEFECTO, ...auth }
  }

  const valorBarberia = barberia ?? BARBERIA_POR_DEFECTO
  const valorConfiguracion = configuracion ?? CONFIGURACION_POR_DEFECTO

  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <BarberiaContext.Provider value={valorBarberia}>
        <ConfiguracionContext.Provider value={valorConfiguracion}>
          {ui}
        </ConfiguracionContext.Provider>
      </BarberiaContext.Provider>
    </MemoryRouter>
  )
}
