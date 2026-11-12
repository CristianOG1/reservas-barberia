// tests/unit/Hero.test.jsx
// El hero de la portada: las dos llamadas a la acción y el acceso a la cuenta.
//
// Matriz v3: F-01 «Acceder al sistema: registrarse, iniciar sesión y cerrar
// sesión». Aquí se comprueba la parte que vive en el hero: a dónde lleva el
// botón de cuenta según el rol.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import Hero from '../../src/components/Hero'
import { renderWithProviders } from '../helpers/renderWithProviders'

vi.mock('../../src/context/useAuth', async (importOriginal) => {
  const real = await importOriginal()
  const { authSimulado } = await import('../helpers/renderWithProviders')
  return { ...real, useAuth: () => authSimulado.valor }
})

/** Sesión simulada con la forma que devuelve Supabase Auth. */
const SESION = {
  access_token: 'token-de-prueba',
  refresh_token: 'refresh-de-prueba',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'usuario-1',
    email: 'demo@ejemplo.com',
    user_metadata: { full_name: 'Cliente Nuevo' },
  },
}

const BARBERIA = { id: 'b1', nombre: 'Salon Demo', slug: 'kromatik' }

/** Muestra la ruta actual: sirve para observar la navegación. */
function Ubicacion() {
  const { pathname } = useLocation()
  return <p data-testid="ruta">{pathname}</p>
}

/** Monta el hero con la sesión y el rol indicados. */
function montar({ sesion = null, rol = null } = {}) {
  return renderWithProviders(
    <>
      <Ubicacion />
      <Hero />
    </>,
    {
      ruta: '/',
      barberia: { barberia: BARBERIA, cargando: false, slug: 'kromatik', sinSlug: false },
      auth: { session: sesion, rol, cargandoRol: false },
    }
  )
}

// jsdom no implementa `scrollIntoView`: se define aquí para poder observar
// la llamada sin que reviente.
let scrollIntoView
beforeEach(() => {
  scrollIntoView = vi.fn()
  window.HTMLElement.prototype.scrollIntoView = scrollIntoView
})
afterEach(() => {
  delete window.HTMLElement.prototype.scrollIntoView
})

describe('Hero · llamadas a la acción (F-01)', () => {
  it('F-01 · el botón de agendar lleva a la reserva', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getByRole('button', { name: 'AGENDAR CITA' }))

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/agendar')
    })
  })

  it('F-01 · el botón de explorar servicios baja a la sección de servicios', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <Ubicacion />
        <Hero />
        <div id="servicios">Sección de servicios</div>
      </>,
      {
        ruta: '/',
        barberia: { barberia: BARBERIA, cargando: false, slug: 'kromatik', sinSlug: false },
        auth: { session: null, rol: null, cargandoRol: false },
      }
    )

    await user.click(screen.getByRole('button', { name: 'EXPLORAR SERVICIOS ↓' }))

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  it('F-01 · el hero enseña el nombre de la barbería', () => {
    montar()

    expect(screen.getByText('Salon Demo')).toBeInTheDocument()
    expect(screen.getByText('Barberia')).toBeInTheDocument()
  })
})

describe('Hero · la cuenta (F-01)', () => {
  it('F-01 · sin sesión, el botón lleva al inicio de sesión', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(
      screen.getByRole('button', { name: '¿Ya tienes cuenta? Iniciar sesión' })
    )

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/login')
    })
  })

  it('F-01 · con sesión de cliente, el botón lleva a /cliente', async () => {
    const user = userEvent.setup()
    montar({ sesion: SESION, rol: 'cliente' })

    await user.click(screen.getByRole('button', { name: /Ir a mi panel/ }))

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/cliente')
    })
  })

  it('F-01 · con sesión de admin, el botón lleva a /admin', async () => {
    const user = userEvent.setup()
    montar({ sesion: SESION, rol: 'admin' })

    await user.click(screen.getByRole('button', { name: /Ir a mi panel/ }))

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/admin')
    })
  })

  it('F-01 · con sesión de superadmin, el botón lleva a /superadmin', async () => {
    const user = userEvent.setup()
    montar({ sesion: SESION, rol: 'superadmin' })

    await user.click(screen.getByRole('button', { name: /Ir a mi panel/ }))

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/superadmin')
    })
  })

  it('F-01 · con sesión, el botón saluda al cliente por su nombre', () => {
    montar({ sesion: SESION, rol: 'cliente' })

    expect(screen.getByRole('button', { name: /Hola, Cliente Nuevo/ })).toBeInTheDocument()
  })
})
