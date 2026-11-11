// tests/helpers/renderWithProviders.jsx
// Envoltorio de render para las pruebas de componentes que dependen de los
// contextos de la app.
//
// Cubre tres contextos:
//   - AuthContext    -> NO se exporta desde `src/context/AuthContext.jsx`, asi
//                        que no se puede inyectar con un Provider. El archivo
//                        de prueba lo sustituye con un mock del modulo (ver
//                        `authSimulado` mas abajo).
//   - BarberiaContext-> SI se exporta (`src/context/barberia.js`).
//   - ConfiguracionContext -> SI se exporta (`src/context/configuracion.js`).
//
// Uso tipico en un archivo de prueba:
//
//   import { authSimulado, renderWithProviders } from '../helpers/renderWithProviders'
//
//   vi.mock('../../src/context/AuthContext', async (importOriginal) => {
//     const real = await importOriginal()
//     const { authSimulado } = await import('../helpers/renderWithProviders')
//     return { ...real, useAuth: () => authSimulado.valor }
//   })
//
//   renderWithProviders(<ProtectedRoute roles={['admin']}><Hijo /></ProtectedRoute>, {
//     ruta: '/admin',
//     auth: { session: SESION, rol: 'admin' },
//     barberia: { barberia: { id: 'b1' }, cargando: false },
//   })
//
// El mock de `supabaseClient` se registra globalmente en `tests/setup.js`, asi
// que ningun test toca la red.

import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BarberiaContext } from '../../src/context/barberia'
import { ConfiguracionContext } from '../../src/context/configuracion'

/**
 * Valor base de `useAuth()`. Cada render parte de una copia de ESTE objeto,
 * nunca del valor anterior: si no, un test que fija `cargando: true` se lo
 * heredaria al siguiente y todos verian "Cargando...".
 */
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

/**
 * Valor simulado que devuelve `useAuth()`. Los archivos de prueba que
 * inyectan una sesión deben apuntar su `useAuth` aqui.
 */
export const authSimulado = {
  valor: { ...AUTH_POR_DEFECTO },
}

/** Valor por defecto de `useBarberia()`: barbería aún no resuelta. */
export const BARBERIA_POR_DEFECTO = {
  barberia: null,
  cargando: false,
  noEncontrada: false,
  slug: null,
  sinSlug: true,
  sitioPrincipal: false,
}

/** Valor por defecto de `useConfiguracion()`. */
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

/** Sesión simulada con la forma que devuelve Supabase Auth. */
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

/**
 * Renderiza `ui` dentro de un router en memoria y de los contextos que se
 * pueden inyectar.
 *
 * @param {React.ReactElement} ui        Lo que se quiere renderizar
 * @param {object} opciones
 * @param {string} opciones.ruta          Ruta inicial del router (por defecto '/')
 * @param {object} opciones.auth         Valores simulados de AuthContext
 * @param {object} opciones.barberia     Valores simulados de BarberiaContext
 * @param {object} opciones.configuracion Valores simulados de ConfiguracionContext
 */
export function renderWithProviders(ui, opciones = {}) {
  const { ruta = '/', auth, barberia, configuracion } = opciones

  if (auth !== undefined) {
    // Se parte siempre del valor base, no del anterior: asi un test no
    // hereda el `cargando` o el `rol` que fijo el test previo.
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
