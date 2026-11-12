// tests/unit/LoginPage.test.jsx
// Inicio de sesión y registro.
//
// Matriz v3: F-01 «Acceder al sistema: registrarse, iniciar sesión y cerrar
// sesión». Sus dos casos: CP-01-01 (credenciales válidas → la pantalla que
// corresponde a su rol) y CP-01-02 (el caso que hoy falla: el cambio de
// cuenta muy rápido).
//
// ⚠ La numeración de los casos sigue a la **matriz v3**: F-01 → CP-01-01/02.
// El archivo `Casos_de_Prueba.md` de la bóveda todavía trae la numeración
// anterior, donde estos mismos casos son CP-01-01/CP-01-02.

import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import LoginPage from '../../src/pages/LoginPage'
import { renderWithProviders, authSimulado } from '../helpers/renderWithProviders'
import { supabaseMock } from '../mocks/supabaseClient'

vi.mock('../../src/context/useAuth', async (importOriginal) => {
  const real = await importOriginal()
  const { authSimulado } = await import('../helpers/renderWithProviders')
  return { ...real, useAuth: () => authSimulado.valor }
})

/** Muestra la ruta actual: sirve para observar a dónde lleva el login. */
function Ubicacion() {
  const { pathname } = useLocation()
  return <p data-testid="ruta">{pathname}</p>
}

/** Monta el login con un `login` simulado y un rol ya conocido. */
function montar({ login, rol = 'cliente' } = {}) {
  return renderWithProviders(
    <>
      <Ubicacion />
      <LoginPage />
    </>,
    {
      ruta: '/login',
      auth: {
        login: login || (async () => ({ error: null })),
        rol,
        cargandoRol: false,
      },
    }
  )
}

/** Escribe el correo y la contraseña y pulsa «Entrar». */
async function entrar(user, correo = 'dueno@ejemplo.com', password = 'Demo1234!') {
  await user.type(screen.getByPlaceholderText('Correo electrónico'), correo)
  await user.type(screen.getByPlaceholderText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('LoginPage · inicio de sesión (F-01)', () => {
  it('F-01 · CP-01-01 · con credenciales válidas entra al panel del admin', async () => {
    const user = userEvent.setup()
    const login = vi.fn(async () => ({ error: null }))
    montar({ login, rol: 'admin' })

    await entrar(user)

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/admin')
    })
    expect(login).toHaveBeenCalledWith('dueno@ejemplo.com', 'Demo1234!')
  })

  it('F-01 · CP-01-01 · un cliente entra a su portal, no al panel', async () => {
    const user = userEvent.setup()
    montar({ rol: 'cliente' })

    await entrar(user)

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/cliente')
    })
  })

  it('F-01 · CP-01-01 · el superadmin entra a su panel, no al de una barbería', async () => {
    const user = userEvent.setup()
    montar({ rol: 'superadmin' })

    await entrar(user)

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/superadmin')
    })
  })

  it('F-01 · CP-01-01 · con credenciales incorrectas avisa y no inicia sesión', async () => {
    const user = userEvent.setup()
    const login = vi.fn(async () => ({ error: { message: 'Invalid login credentials' } }))
    montar({ login, rol: 'admin' })

    await entrar(user, 'dueno@ejemplo.com', 'incorrecta')

    await waitFor(() => {
      expect(screen.getByText('Correo o contraseña incorrectos.')).toBeInTheDocument()
    })
    // No se navega a ninguna parte.
    expect(screen.getByTestId('ruta')).toHaveTextContent('/login')
  })
})

describe('LoginPage · registro (F-01)', () => {
  it('F-01 · al registrarse avisa y vuelve al modo iniciar sesión', async () => {
    const user = userEvent.setup()
    supabaseMock.onAuth('signUp', {
      data: { user: { identities: [{ id: 'u1' }] }, session: { access_token: 't' } },
      error: null,
    })
    montar()

    await user.click(screen.getByRole('button', { name: '¿No tienes cuenta? Regístrate aquí' }))
    await user.type(screen.getByPlaceholderText('Nombre completo'), 'Cliente Nuevo')
    await user.type(screen.getByPlaceholderText('Correo electrónico'), 'cliente@ejemplo.com')
    await user.type(screen.getByPlaceholderText('Contraseña'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Registrarme' }))

    await waitFor(() => {
      expect(
        screen.getByText('¡Cuenta creada con éxito! Ya puedes iniciar sesión.')
      ).toBeInTheDocument()
    })
    // Vuelve al modo iniciar sesión y no entra solo.
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByTestId('ruta')).toHaveTextContent('/login')
  })

  it('F-01 · el registro nunca pide un rol', async () => {
    const user = userEvent.setup()
    supabaseMock.onAuth('signUp', {
      data: { user: { identities: [{ id: 'u1' }] }, session: { access_token: 't' } },
      error: null,
    })
    montar()

    await user.click(screen.getByRole('button', { name: '¿No tienes cuenta? Regístrate aquí' }))
    await user.type(screen.getByPlaceholderText('Nombre completo'), 'Cliente Nuevo')
    await user.type(screen.getByPlaceholderText('Correo electrónico'), 'cliente@ejemplo.com')
    await user.type(screen.getByPlaceholderText('Contraseña'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Registrarme' }))

    await waitFor(() => {
      expect(
        screen.getByText('¡Cuenta creada con éxito! Ya puedes iniciar sesión.')
      ).toBeInTheDocument()
    })

    const llamada = supabaseMock.llamadas.find((c) => c.tipo === 'auth.signUp')
    expect(llamada).toBeDefined()
    // Solo el nombre: el rol lo pone el trigger de la base de datos.
    expect(llamada.argumentos.options.data).toEqual({ full_name: 'Cliente Nuevo' })
    expect(llamada.argumentos.options.data).not.toHaveProperty('role')
    expect(llamada.argumentos).not.toHaveProperty('role')
  })
})

describe('LoginPage · «correo ya registrado» (F-01)', () => {
  it('F-01 · CP-01-02 · si Supabase lo reporta como error, avisa y vuelve al login', async () => {
    const user = userEvent.setup()
    // Forma 1: con la confirmación de correo desactivada, Supabase devuelve un
    // error de «ya registrado».
    supabaseMock.onAuth('signUp', {
      data: null,
      error: { code: 'user_already_exists', message: 'User already registered' },
    })
    montar()

    await user.click(screen.getByRole('button', { name: '¿No tienes cuenta? Regístrate aquí' }))
    await user.type(screen.getByPlaceholderText('Nombre completo'), 'Cliente Nuevo')
    await user.type(screen.getByPlaceholderText('Correo electrónico'), 'cliente@ejemplo.com')
    await user.type(screen.getByPlaceholderText('Contraseña'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Registrarme' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Ya tienes una cuenta. Inicia sesión con tu contraseña y te agregamos a esta barbería.'
        )
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('F-01 · CP-01-02 · si Supabase lo reporta como éxito falso, avisa lo mismo', async () => {
    const user = userEvent.setup()
    // Forma 2: con la confirmación de correo activada, Supabase NO revela qué
    // correos existen: devuelve un «éxito» con la lista de identidades vacía.
    supabaseMock.onAuth('signUp', {
      data: { user: { identities: [] }, session: null },
      error: null,
    })
    montar()

    await user.click(screen.getByRole('button', { name: '¿No tienes cuenta? Regístrate aquí' }))
    await user.type(screen.getByPlaceholderText('Nombre completo'), 'Cliente Nuevo')
    await user.type(screen.getByPlaceholderText('Correo electrónico'), 'cliente@ejemplo.com')
    await user.type(screen.getByPlaceholderText('Contraseña'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Registrarme' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Ya tienes una cuenta. Inicia sesión con tu contraseña y te agregamos a esta barbería.'
        )
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('F-01 · el aviso de «correo ya registrado» no menciona ninguna otra barbería', async () => {
    const user = userEvent.setup()
    supabaseMock.onAuth('signUp', {
      data: null,
      error: { code: 'user_already_exists', message: 'User already registered' },
    })
    montar()

    await user.click(screen.getByRole('button', { name: '¿No tienes cuenta? Regístrate aquí' }))
    await user.type(screen.getByPlaceholderText('Nombre completo'), 'Cliente Nuevo')
    await user.type(screen.getByPlaceholderText('Correo electrónico'), 'cliente@ejemplo.com')
    await user.type(screen.getByPlaceholderText('Contraseña'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Registrarme' }))

    await waitFor(() => {
      expect(
        screen.getByText(/Ya tienes una cuenta\. Inicia sesión/)
      ).toBeInTheDocument()
    })
    expect(screen.queryByText(/barbería anterior|otra barbería/i)).not.toBeInTheDocument()
  })
})

describe('LoginPage · volver a agendar (F-01)', () => {
  /**
   * `volverA` viaja en el estado de la navegación, así que hace falta un
   * router con rutas: si el `LoginPage` siguiera montado tras navegar, su
   * efecto volvería a dispararse (el estado ya no existe) y se iría al panel
   * del rol. Con las rutas, al entrar en /agendar la pantalla de login se
   * desmonta, como en la aplicación.
   */
  function montarConVolverA() {
    return render(
      <MemoryRouter
        initialEntries={[{ pathname: '/login', state: { volverA: '/agendar' } }]}
      >
        <Routes>
          <Route
            path="/login"
            element={
              <>
                <Ubicacion />
                <LoginPage />
              </>
            }
          />
          <Route
            path="/agendar"
            element={
              <>
                <Ubicacion />
                <p>Pantalla de reserva</p>
              </>
            }
          />
          <Route
            path="/cliente"
            element={
              <>
                <Ubicacion />
                <p>Portal del cliente</p>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    )
  }

  it('F-01 · si veníamos de /agendar, avisa de que la selección sigue guardada', async () => {
    montarConVolverA()

    expect(
      screen.getByText(
        'Inicia sesión o crea tu cuenta para confirmar tu cita. Tu selección está guardada.'
      )
    ).toBeInTheDocument()
  })

  it('F-01 · si veníamos de /agendar, al entrar se vuelve a /agendar', async () => {
    const user = userEvent.setup()
    authSimulado.valor = {
      ...authSimulado.valor,
      rol: 'cliente',
      cargandoRol: false,
      login: async () => ({ error: null }),
    }
    montarConVolverA()

    await user.type(screen.getByPlaceholderText('Correo electrónico'), 'cliente@ejemplo.com')
    await user.type(screen.getByPlaceholderText('Contraseña'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/agendar')
    })
  })
})
