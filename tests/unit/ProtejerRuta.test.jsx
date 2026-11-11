// tests/unit/ProtejerRuta.test.jsx
// Guard de rutas de /admin, /cliente y /superadmin.
//
// Matriz v3: F-01 «Acceder al sistema: registrarse, iniciar sesión y cerrar
// sesión» cubre el destino segun el rol y el acceso denegado. Los casos de
// guard que no encajan en F-01 llevan nombre descriptivo.
//
// `AuthContext` no exporta su contexto, asi que se sustituye el modulo para
// poder inyectar la sesion y el rol simulados.

import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import ProtectedRoute from '../../src/components/ProtejerRuta'
import {
  renderWithProviders,
  sesionSimulada,
} from '../helpers/renderWithProviders'

vi.mock('../../src/context/AuthContext', async (importOriginal) => {
  const real = await importOriginal()
  const { authSimulado } = await import('../helpers/renderWithProviders')
  return { ...real, useAuth: () => authSimulado.valor }
})

/** Muestra la ruta actual: sirve para observar a donde redirige el guard. */
function Ubicacion() {
  const { pathname } = useLocation()
  return <p data-testid="ruta">{pathname}</p>
}

function Contenido() {
  return <p>Contenido protegido</p>
}

describe('ProtectedRoute', () => {
  it('F-01 · sin sesion redirige a /login y no muestra el contenido', () => {
    renderWithProviders(
      <>
        <Ubicacion />
        <ProtectedRoute roles={['admin']}>
          <Contenido />
        </ProtectedRoute>
      </>,
      { ruta: '/admin', auth: { session: null, cargando: false, rol: null } }
    )

    expect(screen.getByTestId('ruta')).toHaveTextContent('/login')
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('mientras carga la sesion muestra Cargando... y no deja pasar el contenido', () => {
    renderWithProviders(
      <>
        <Ubicacion />
        <ProtectedRoute roles={['admin']}>
          <Contenido />
        </ProtectedRoute>
      </>,
      { ruta: '/admin', auth: { session: null, cargando: true, cargandoRol: true } }
    )

    expect(screen.getByText('Cargando...')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('F-01 · el admin en una zona de admin ve el contenido', () => {
    renderWithProviders(
      <>
        <Ubicacion />
        <ProtectedRoute roles={['admin']}>
          <Contenido />
        </ProtectedRoute>
      </>,
      {
        ruta: '/admin',
        auth: { session: sesionSimulada(), rol: 'admin', cargandoRol: false, barberiaId: 'b1' },
        barberia: { barberia: { id: 'b1', nombre: 'Salon Demo' }, cargando: false },
      }
    )

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
    expect(screen.getByTestId('ruta')).toHaveTextContent('/admin')
  })

  it('F-01 · el cliente que entra a una zona de admin es devuelto a su propia pantalla', () => {
    renderWithProviders(
      <>
        <Ubicacion />
        <ProtectedRoute roles={['admin']}>
          <Contenido />
        </ProtectedRoute>
      </>,
      { ruta: '/admin', auth: { session: sesionSimulada(), rol: 'cliente', cargandoRol: false } }
    )

    expect(screen.getByTestId('ruta')).toHaveTextContent('/cliente')
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('F-01 · el superadmin entra a su panel sin esperar a que se resuelva la barberia', () => {
    // La zona del superadmin no pertenece a ninguna barberia: si el guard
    // esperara a `cargandoBarberia`, el panel se quedaria en "Cargando..."
    // para siempre.
    renderWithProviders(
      <>
        <Ubicacion />
        <ProtectedRoute roles={['superadmin']}>
          <Contenido />
        </ProtectedRoute>
      </>,
      {
        ruta: '/superadmin',
        auth: { session: sesionSimulada(), rol: 'superadmin', cargandoRol: false },
        barberia: { barberia: null, cargando: true },
      }
    )

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })

  it('un rol desconocido no entra y cae en la pantalla de admin', () => {
    // rutaInicioPorRol no reconoce 'barbero' y devuelve '/admin'.
    renderWithProviders(
      <>
        <Ubicacion />
        <ProtectedRoute roles={['admin']}>
          <Contenido />
        </ProtectedRoute>
      </>,
      { ruta: '/admin', auth: { session: sesionSimulada(), rol: 'barbero', cargandoRol: false } }
    )

    expect(screen.getByTestId('ruta')).toHaveTextContent('/admin')
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('con sesion pero sin rol todavia espera en vez de dejar pasar', () => {
    // El rol se lee despues que la sesion: mientras no llegue, el guard
    // muestra "Cargando..." para no expulsar a un superadmin por un falso null.
    renderWithProviders(
      <>
        <Ubicacion />
        <ProtectedRoute roles={['admin']}>
          <Contenido />
        </ProtectedRoute>
      </>,
      { ruta: '/admin', auth: { session: sesionSimulada(), rol: null, cargandoRol: false } }
    )

    expect(screen.getByText('Cargando...')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('el admin de otra barberia ve el aviso de que la cuenta no es de esta', () => {
    renderWithProviders(
      <>
        <Ubicacion />
        <ProtectedRoute roles={['admin']}>
          <Contenido />
        </ProtectedRoute>
      </>,
      {
        ruta: '/admin',
        auth: { session: sesionSimulada(), rol: 'admin', cargandoRol: false, barberiaId: 'b-otra' },
        barberia: { barberia: { id: 'b1', nombre: 'Salon Demo' }, cargando: false },
      }
    )

    expect(
      screen.getByText('Esta cuenta no pertenece a esta barbería')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('el superadmin con la sesion todavia cargando ve el aviso de carga en tema claro', () => {
    // La zona del superadmin es clara: el texto blanco de las zonas oscuras no
    // se veria ahi.
    renderWithProviders(
      <>
        <Ubicacion />
        <ProtectedRoute roles={['superadmin']}>
          <Contenido />
        </ProtectedRoute>
      </>,
      {
        ruta: '/superadmin',
        auth: { session: null, cargando: true, rol: null, cargandoRol: true },
        barberia: { barberia: null, cargando: true },
      }
    )

    const aviso = screen.getByText('Cargando...')
    expect(aviso).toHaveClass('text-slate')
    expect(aviso).not.toHaveClass('text-white')
  })

  it('el boton de cerrar sesion del aviso llama al cierre de sesion del contexto', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const logout = vi.fn()

    renderWithProviders(
      <>
        <Ubicacion />
        <ProtectedRoute roles={['admin']}>
          <Contenido />
        </ProtectedRoute>
      </>,
      {
        ruta: '/admin',
        auth: {
          session: sesionSimulada(),
          rol: 'admin',
          cargandoRol: false,
          barberiaId: 'b-otra',
          logout,
        },
        barberia: { barberia: { id: 'b1', nombre: 'Salon Demo' }, cargando: false },
      }
    )

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(logout).toHaveBeenCalledTimes(1)
  })
})
