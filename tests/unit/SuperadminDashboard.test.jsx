// tests/unit/SuperadminDashboard.test.jsx
// El shell del panel del proveedor del software.
//
// Matriz v3: F-15 «Administrar las barberías registradas». Esta prueba es del
// marco que rodea al listado: identidad, navegación y salida de sesión.

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, sesionSimulada } from '../helpers/renderWithProviders'
import SuperadminDashboard from '../../src/pages/superadmin/SuperadminDashboard'

vi.mock('../../src/context/AuthContext', async (importOriginal) => {
  const real = await importOriginal()
  const { authSimulado } = await import('../helpers/renderWithProviders')
  return { ...real, useAuth: () => authSimulado.valor }
})

/** Monta el shell con una sesión de superadmin. */
function montar({ sesion = sesionSimulada({ user: { email: 'dueno@ejemplo.com' } }), logout } = {}) {
  return renderWithProviders(<SuperadminDashboard />, {
    ruta: '/superadmin',
    auth: { session: sesion, logout: logout || (async () => ({ error: null })) },
  })
}

describe('SuperadminDashboard · identidad y navegación (F-15)', () => {
  it('F-15 · el panel muestra la identidad del software y la insignia de superadmin', () => {
    montar()

    expect(screen.getAllByText('Multi-Barbería').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Panel del software').length).toBeGreaterThan(0)
    expect(screen.getByText('SUPERADMIN')).toBeInTheDocument()
  })

  it('F-15 · el único enlace del menú es «Barberías» y apunta a su propia ruta', () => {
    montar()

    const enlaces = screen.getAllByRole('link', { name: /Barberías/ })
    expect(enlaces.length).toBeGreaterThan(0)
    for (const enlace of enlaces) {
      expect(enlace).toHaveAttribute('href', '/superadmin')
    }
    // Al estar en /superadmin, el enlace queda marcado como activo.
    expect(enlaces[0]).toHaveAttribute('aria-current', 'page')
  })

  it('F-15 · la tarjeta de perfil muestra el correo del superadmin', () => {
    montar()

    expect(screen.getAllByText('dueno@ejemplo.com').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Superadministrador').length).toBeGreaterThan(0)
  })

  it('F-15 · el enlace «Ver sitio web» apunta a la raíz', () => {
    montar()

    const enlace = screen.getByRole('link', { name: 'Ver sitio web' })
    expect(enlace).toHaveAttribute('href', '/')
  })
})

describe('SuperadminDashboard · sesión (F-15)', () => {
  it('F-15 · el botón de salir cierra la sesión', async () => {
    const user = userEvent.setup()
    const logout = vi.fn()
    montar({ logout })

    await user.click(screen.getAllByRole('button', { name: 'Salir de la sesión' })[0])

    expect(logout).toHaveBeenCalled()
  })

  it('F-15 · sin sesión no se muestra la tarjeta de perfil', () => {
    montar({ sesion: null })

    expect(screen.queryByText('Superadministrador')).not.toBeInTheDocument()
  })
})

describe('SuperadminDashboard · menú móvil (F-15)', () => {
  it('F-15 · el botón del menú declara su estado y el panel que controla', () => {
    montar()

    const boton = screen.getByRole('button', { name: 'Abrir menú' })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(boton).toHaveAttribute('aria-controls', 'menu-movil-superadmin')
  })

  it('F-15 · al abrir el menú aparece el panel con el enlace', async () => {
    const user = userEvent.setup()
    montar()

    expect(document.querySelector('#menu-movil-superadmin')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))

    const panel = await waitFor(() => {
      const el = document.querySelector('#menu-movil-superadmin')
      expect(el).not.toBeNull()
      return el
    })
    expect(within(panel).getByRole('link', { name: /Barberías/ })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Cerrar menú' })
    ).toHaveAttribute('aria-expanded', 'true')
  })

  it('F-15 · la tecla Escape cierra el menú', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    await waitFor(() => {
      expect(document.querySelector('#menu-movil-superadmin')).not.toBeNull()
    })

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(document.querySelector('#menu-movil-superadmin')).toBeNull()
    })
  })
})
