// tests/unit/AuthContext.test.jsx
// Sesion, rol y barberia del usuario.
//
// Matriz v3: F-01 «Acceder al sistema: registrarse, iniciar sesion y cerrar
// sesion».
//
// Aqui se prueba el AuthProvider REAL, con el cliente de Supabase mockeado:
// lo que se observa es lo que el resto de la app veria a traves de useAuth().

import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../src/context/AuthContext'
import { supabaseMock } from '../mocks/supabaseClient'

/** Lee del contexto lo mismo que hacen el resto de componentes de la app. */
function Sonda() {
  const { session, rol, cargandoRol, barberiaId, logout, login, unirmeABarberia } = useAuth()
  return (
    <div>
      <p data-testid="sesion">{session ? session.user.email : 'sin-sesion'}</p>
      <p data-testid="rol">{rol ?? 'sin-rol'}</p>
      <p data-testid="barberia">{barberiaId ?? 'sin-barberia'}</p>
      <p data-testid="cargando-rol">{String(cargandoRol)}</p>
      <button onClick={() => logout()}>Cerrar sesion</button>
      <button onClick={() => login('dueno@ejemplo.com', 'Demo1234!')}>Entrar</button>
      <button onClick={() => unirmeABarberia('barberia-7')}>Unirse</button>
      <button onClick={() => unirmeABarberia(null)}>Unirse sin barberia</button>
    </div>
  )
}

const SESION = {
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: 'usuario-1', email: 'dueno@ejemplo.com', user_metadata: {} },
}

describe('AuthContext', () => {
  it('F-01 · expone la sesion que ya venia abierta', async () => {
    supabaseMock.onAuth('getSession', { data: { session: SESION }, error: null })
    supabaseMock.on('perfiles', 'select', { data: [{ rol: 'cliente', barberia_id: null }] })

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('sesion')).toHaveTextContent('dueno@ejemplo.com')
    })
  })

  it('F-01 · lee el rol y la barberia del usuario de la tabla perfiles', async () => {
    supabaseMock.onAuth('getSession', { data: { session: SESION }, error: null })
    supabaseMock.on('perfiles', 'select', {
      data: [{ rol: 'admin', barberia_id: 'barberia-7' }],
    })

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('rol')).toHaveTextContent('admin')
    })
    expect(screen.getByTestId('barberia')).toHaveTextContent('barberia-7')
    expect(screen.getByTestId('cargando-rol')).toHaveTextContent('false')
  })

  it('F-01 · si la lectura del perfil falla cae en el rol por defecto, cliente', async () => {
    const errorConsola = vi.spyOn(console, 'error').mockImplementation(() => {})
    supabaseMock.onAuth('getSession', { data: { session: SESION }, error: null })
    supabaseMock.on('perfiles', 'select', { data: null, error: { message: 'sin permiso' } })

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('rol')).toHaveTextContent('cliente')
    })
    expect(screen.getByTestId('barberia')).toHaveTextContent('sin-barberia')
    expect(errorConsola).toHaveBeenCalled()

    errorConsola.mockRestore()
  })

  it('F-01 · sin sesion no hay rol y no se consulta la tabla perfiles', async () => {
    supabaseMock.onAuth('getSession', { data: { session: null }, error: null })

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('cargando-rol')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('sesion')).toHaveTextContent('sin-sesion')
    expect(screen.getByTestId('rol')).toHaveTextContent('sin-rol')
    expect(screen.getByTestId('barberia')).toHaveTextContent('sin-barberia')

    const consultoPerfiles = supabaseMock.llamadas.some(
      (c) => c.tipo === 'query' && c.tabla === 'perfiles'
    )
    expect(consultoPerfiles).toBe(false)
  })

  it('F-01 · cerrar sesion llama a signOut de Supabase', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    supabaseMock.onAuth('getSession', { data: { session: SESION }, error: null })
    supabaseMock.on('perfiles', 'select', { data: [{ rol: 'cliente', barberia_id: null }] })
    supabaseMock.onAuth('signOut', { error: null })

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('rol')).toHaveTextContent('cliente')
    })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesion' }))

    await waitFor(() => {
      expect(supabaseMock.llamadas.some((c) => c.tipo === 'auth.signOut')).toBe(true)
    })
  })

  it('F-01 · iniciar sesion llama a signInWithPassword con el correo y la clave', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    supabaseMock.onAuth('getSession', { data: { session: null }, error: null })
    supabaseMock.onAuth('signInWithPassword', { data: { user: null, session: null }, error: null })

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('cargando-rol')).toHaveTextContent('false')
    })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      const llamada = supabaseMock.llamadas.find((c) => c.tipo === 'auth.signInWithPassword')
      expect(llamada).toBeDefined()
      expect(llamada.argumentos).toEqual({
        email: 'dueno@ejemplo.com',
        password: 'Demo1234!',
      })
    })
  })

  it('F-01 · un cambio de sesion emitido por Supabase actualiza la sesion del provider', async () => {
    const { act } = await import('@testing-library/react')
    supabaseMock.onAuth('getSession', { data: { session: null }, error: null })

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('sesion')).toHaveTextContent('sin-sesion')
    })

    await act(async () => {
      supabaseMock.callbackAuthStateChange('SIGNED_IN', SESION)
    })

    expect(screen.getByTestId('sesion')).toHaveTextContent('dueno@ejemplo.com')
  })

  it('F-01 · la alta de membresia llama a la RPC con la barberia recibida', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    supabaseMock.onAuth('getSession', { data: { session: SESION }, error: null })
    supabaseMock.on('perfiles', 'select', { data: [{ rol: 'cliente', barberia_id: null }] })
    supabaseMock.onRpc('unirme_a_barberia', { data: null, error: null })

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('rol')).toHaveTextContent('cliente')
    })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Unirse' }))

    await waitFor(() => {
      const llamada = supabaseMock.llamadas.find(
        (c) => c.tipo === 'rpc' && c.nombre === 'unirme_a_barberia'
      )
      expect(llamada).toBeDefined()
      expect(llamada.argumentos).toEqual({ p_barberia_id: 'barberia-7' })
    })
  })

  it('F-01 · un usuario sin fila en perfiles queda con el rol por defecto, cliente', async () => {
    supabaseMock.onAuth('getSession', { data: { session: SESION }, error: null })
    // El trigger de la base crea la fila, pero si el usuario se registro antes
    // de que existiera, puede no tener perfil: el rol debe caer en 'cliente',
    // que es el de menor privilegio.
    supabaseMock.on('perfiles', 'select', { data: [] })

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('rol')).toHaveTextContent('cliente')
    })
    expect(screen.getByTestId('barberia')).toHaveTextContent('sin-barberia')
  })

  it('sin barberia indicada la alta de membresia no llama a la RPC', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    supabaseMock.onAuth('getSession', { data: { session: SESION }, error: null })
    supabaseMock.on('perfiles', 'select', { data: [{ rol: 'cliente', barberia_id: null }] })

    render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('rol')).toHaveTextContent('cliente')
    })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Unirse sin barberia' }))

    const llamada = supabaseMock.llamadas.find(
      (c) => c.tipo === 'rpc' && c.nombre === 'unirme_a_barberia'
    )
    expect(llamada).toBeUndefined()
  })
})
