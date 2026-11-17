// tests/unit/Navbar.test.jsx
// La barra de navegación del sitio público: enlaces, menú de celular y el
// acceso a la cuenta.
//
// Matriz v3: F-01 «Acceder al sistema: registrarse, iniciar sesión y cerrar
// sesión». Aquí se comprueba la parte que vive en la barra: a dónde lleva el
// botón de cuenta según el rol.
//
// ⚠ La sesión se declara aquí y no se importa de `renderWithProviders`: en este
// archivo el binding de ese import no llega al módulo (bug de transformación
// de Vitest, no del proyecto). Los datos son los mismos.

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import Navbar from '../../src/components/Navbar'
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

/** Monta la barra con la sesión y el rol indicados. */
function montar({ sesion = null, rol = null, logout } = {}) {
  return renderWithProviders(
    <>
      <Ubicacion />
      <Navbar />
    </>,
    {
      ruta: '/',
      barberia: { barberia: BARBERIA, cargando: false, slug: 'kromatik', sinSlug: false },
      auth: {
        session: sesion,
        rol,
        cargandoRol: false,
        logout: logout || (async () => ({ error: null })),
      },
    }
  )
}

describe('Navbar · enlaces (F-01)', () => {
  it('F-01 · los cuatro enlaces del sitio apuntan a sus rutas', () => {
    montar()

    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Servicios' })).toHaveAttribute('href', '/servicios')
    expect(screen.getByRole('link', { name: 'Productos' })).toHaveAttribute('href', '/productos')
    expect(screen.getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '/contacto')
  })

  it('F-01 · el enlace de la ruta actual queda marcado como activo', () => {
    montar({ sesion: SESION, rol: 'cliente' })

    // En `/` el enlace activo es el de Inicio, no el de las secciones.
    expect(screen.getAllByRole('link', { name: 'Inicio' })[0]).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getAllByRole('link', { name: 'Servicios' })[0]).not.toHaveAttribute(
      'aria-current'
    )
  })

  it('F-01 · la barra muestra el nombre de la barbería', () => {
    montar()

    expect(screen.getAllByText('Salon Demo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cortes de Cabello y Barba').length).toBeGreaterThan(0)
  })

  it('F-01 · el enlace «AGENDAR CITA» lleva a la reserva', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getAllByRole('button', { name: 'AGENDAR CITA' })[0])

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/agendar')
    })
  })

  it('F-01 · el logo lleva a la portada', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getByText('Salon Demo'))

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/')
    })
  })
})

describe('Navbar · la cuenta (F-01)', () => {
  it('F-01 · sin sesión, el botón lleva al inicio de sesión', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getAllByRole('button', { name: 'Iniciar Sesión' })[0])

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/login')
    })
  })

  it('F-01 · con sesión de admin, el botón lleva a /admin', async () => {
    const user = userEvent.setup()
    montar({ sesion: SESION, rol: 'admin' })

    await user.click(screen.getAllByRole('button', { name: /Cliente Nuevo/ })[0])

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/admin')
    })
  })

  it('F-01 · con sesión de cliente, el botón lleva a /cliente', async () => {
    const user = userEvent.setup()
    montar({ sesion: SESION, rol: 'cliente' })

    await user.click(screen.getAllByRole('button', { name: /Cliente Nuevo/ })[0])

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/cliente')
    })
  })

  it('F-01 · con sesión de superadmin, el botón lleva a /superadmin', async () => {
    const user = userEvent.setup()
    montar({ sesion: SESION, rol: 'superadmin' })

    await user.click(screen.getAllByRole('button', { name: /Cliente Nuevo/ })[0])

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/superadmin')
    })
  })

  it('F-01 · el botón «Salir» cierra la sesión', async () => {
    const user = userEvent.setup()
    const logout = vi.fn()
    montar({ sesion: SESION, rol: 'cliente', logout })

    await user.click(screen.getAllByRole('button', { name: 'Salir' })[0])

    expect(logout).toHaveBeenCalled()
  })
})

describe('Navbar · el menú de celular (F-01)', () => {
  it('F-01 · el botón del menú declara su estado y el panel que controla', () => {
    montar()

    const boton = screen.getByRole('button', { name: 'Abrir menú' })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(boton).toHaveAttribute('aria-controls', 'menu-movil-publico')
  })

  it('F-01 · al abrirlo aparecen los enlaces, el teléfono y la reserva', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))

    const panel = await waitFor(() => {
      const el = document.querySelector('#menu-movil-publico')
      expect(el).not.toBeNull()
      return el
    })
    expect(within(panel).getByRole('link', { name: 'Servicios' })).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: '+00 00000000' })).toHaveAttribute(
      'href',
      'tel:+0000000000'
    )
    expect(within(panel).getByRole('button', { name: 'AGENDAR CITA' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Cerrar menú' })
    ).toHaveAttribute('aria-expanded', 'true')
  })

  it('F-01 · el «Iniciar Sesión» del menú móvil lleva al login', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    const panel = await waitFor(() => {
      const el = document.querySelector('#menu-movil-publico')
      expect(el).not.toBeNull()
      return el
    })
    await user.click(within(panel).getByRole('button', { name: 'Iniciar Sesión' }))

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/login')
    })
  })

  it('F-01 · la tecla Escape cierra el menú', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    await waitFor(() => {
      expect(document.querySelector('#menu-movil-publico')).not.toBeNull()
    })

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(document.querySelector('#menu-movil-publico')).toBeNull()
    })
  })
})
