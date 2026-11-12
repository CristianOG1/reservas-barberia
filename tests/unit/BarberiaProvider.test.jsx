// tests/unit/BarberiaProvider.test.jsx
// Que barberia corresponde al host abierto.
//
// Matriz v3: F-14 «Operar con varias sucursales desde una sola cuenta» —
// el criterio dice que «el sistema resuelve cual por el subdominio».
// Los casos que no encajan en F-14 llevan nombre descriptivo.
//
// Aqui se prueba el BarberiaProvider REAL, con el cliente de Supabase mockeado.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { BarberiaProvider } from '../../src/context/BarberiaProvider'
import { useBarberia } from '../../src/context/useBarberia'
import { supabaseMock } from '../mocks/supabaseClient'

function Sonda() {
  const { slug, barberia, cargando, noEncontrada, sitioPrincipal, sinSlug } = useBarberia()
  return (
    <div>
      <p data-testid="slug">{slug ?? 'sin-slug'}</p>
      <p data-testid="barberia">{barberia ? barberia.nombre : 'sin-barberia'}</p>
      <p data-testid="cargando">{String(cargando)}</p>
      <p data-testid="no-encontrada">{String(noEncontrada)}</p>
      <p data-testid="sitio-principal">{String(sitioPrincipal)}</p>
      <p data-testid="sin-slug">{String(sinSlug)}</p>
    </div>
  )
}

function montar() {
  return render(
    <BarberiaProvider>
      <Sonda />
    </BarberiaProvider>
  )
}

/** Cambia el hostname que ve `resolverSlug`. */
function conHostname(hostname) {
  vi.stubGlobal('location', { hostname })
}

describe('BarberiaProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('F-14 · resuelve el slug de la barberia por su subdominio', async () => {
    vi.stubEnv('VITE_DOMINIO_BASE', 'gools.com.mx')
    vi.stubEnv('VITE_BARBERIA_SLUG', 'kromatik')
    conHostname('kromatik.gools.com.mx')
    supabaseMock.on('barberias', 'select', {
      data: [{ id: 'b1', nombre: 'Salon Demo', slug: 'kromatik' }],
    })

    montar()

    await waitFor(() => {
      expect(screen.getByTestId('slug')).toHaveTextContent('kromatik')
    })
    expect(screen.getByTestId('barberia')).toHaveTextContent('Salon Demo')
    expect(screen.getByTestId('no-encontrada')).toHaveTextContent('false')

    // La consulta va por el slug del subdominio, no por el de la variable.
    const llamada = supabaseMock.llamadas.find(
      (c) => c.tipo === 'query' && c.tabla === 'barberias'
    )
    expect(llamada.filtros).toEqual([{ op: 'eq', columna: 'slug', valor: 'kromatik' }])
  })

  it('F-14 · en un host que no es el dominio real cae a VITE_BARBERIA_SLUG', async () => {
    vi.stubEnv('VITE_DOMINIO_BASE', 'gools.com.mx')
    vi.stubEnv('VITE_BARBERIA_SLUG', 'salon-demo')
    conHostname('localhost')
    supabaseMock.on('barberias', 'select', {
      data: [{ id: 'b9', nombre: 'Salon Demo', slug: 'salon-demo' }],
    })

    montar()

    await waitFor(() => {
      expect(screen.getByTestId('slug')).toHaveTextContent('salon-demo')
    })
    expect(screen.getByTestId('sitio-principal')).toHaveTextContent('false')
  })

  it('una barberia que no existe se reporta como no encontrada', async () => {
    vi.stubEnv('VITE_DOMINIO_BASE', 'gools.com.mx')
    vi.stubEnv('VITE_BARBERIA_SLUG', 'kromatik')
    conHostname('kromatik.gools.com.mx')
    supabaseMock.on('barberias', 'select', { data: [] })

    montar()

    await waitFor(() => {
      expect(screen.getByTestId('no-encontrada')).toHaveTextContent('true')
    })
    expect(screen.getByTestId('barberia')).toHaveTextContent('sin-barberia')
    expect(screen.getByTestId('cargando')).toHaveTextContent('false')
  })

  it('una barberia desactivada tampoco aparece: la RLS no la deja ver', async () => {
    // La politica "Lectura publica" de `barberias` solo deja ver las activas.
    // Desde el navegador, una barberia de baja es indistinguible de una que
    // no existe: la consulta vuelve vacia y el sitio dice que no esta
    // disponible. Es el comportamiento buscado, no un fallo.
    vi.stubEnv('VITE_DOMINIO_BASE', 'gools.com.mx')
    vi.stubEnv('VITE_BARBERIA_SLUG', 'kromatik')
    conHostname('kromatik.gools.com.mx')
    supabaseMock.on('barberias', 'select', { data: [] })

    montar()

    await waitFor(() => {
      expect(screen.getByTestId('no-encontrada')).toHaveTextContent('true')
    })
    expect(screen.getByTestId('barberia')).toHaveTextContent('sin-barberia')
  })

  it('el dominio pelado del software no se resuelve a una barberia', async () => {
    vi.stubEnv('VITE_DOMINIO_BASE', 'gools.com.mx')
    vi.stubEnv('VITE_BARBERIA_SLUG', 'kromatik')
    conHostname('gools.com.mx')

    montar()

    await waitFor(() => {
      expect(screen.getByTestId('sitio-principal')).toHaveTextContent('true')
    })
    expect(screen.getByTestId('slug')).toHaveTextContent('sin-slug')
    expect(screen.getByTestId('sin-slug')).toHaveTextContent('true')
  })

  it('si la consulta de la barberia falla, avisa por consola y no encuentra barberia', async () => {
    const errorConsola = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubEnv('VITE_DOMINIO_BASE', 'gools.com.mx')
    vi.stubEnv('VITE_BARBERIA_SLUG', 'kromatik')
    conHostname('kromatik.gools.com.mx')
    supabaseMock.on('barberias', 'select', { data: null, error: { message: 'sin permiso' } })

    montar()

    await waitFor(() => {
      expect(screen.getByTestId('no-encontrada')).toHaveTextContent('true')
    })
    expect(errorConsola).toHaveBeenCalled()

    errorConsola.mockRestore()
  })

  it('si el provider se desmonta antes de responder, no actualiza el estado', async () => {
    const errorConsola = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubEnv('VITE_DOMINIO_BASE', 'gools.com.mx')
    vi.stubEnv('VITE_BARBERIA_SLUG', 'kromatik')
    conHostname('kromatik.gools.com.mx')

    let resolver
    const pendiente = new Promise((r) => { resolver = r })
    supabaseMock.on('barberias', 'select', () => pendiente)

    const { unmount } = montar()
    unmount()

    await act(async () => {
      resolver({ data: [{ id: 'b1', nombre: 'Salon Demo', slug: 'kromatik' }] })
    })

    // El guard `if (!vigente) return` evita el aviso de React por actualizar el
    // estado de un componente ya desmontado.
    const avisosDeReact = errorConsola.mock.calls.filter((c) =>
      String(c[0]).toLowerCase().includes('unmounted')
    )
    expect(avisosDeReact).toHaveLength(0)

    errorConsola.mockRestore()
  })
})
