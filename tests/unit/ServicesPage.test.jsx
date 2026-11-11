// tests/unit/ServicesPage.test.jsx
// La página `/servicios`: el catálogo completo de la barbería.
//
// Matriz v3: F-02 «Consultar el catálogo de servicios del salón». Sus dos
// casos: CP-02-01 y CP-02-02.

import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import ServicesPage from '../../src/pages/ServicesPage'
import {
  SERVICIOS,
  llamadaDe,
  montarPublico,
} from '../helpers/fixturesPublico'

/** Muestra la ruta actual: sirve para observar la navegación a /agendar. */
function Ubicacion() {
  const { pathname, search } = useLocation()
  return <p data-testid="ruta">{pathname + search}</p>
}

describe('ServicesPage · catálogo (F-02)', () => {
  it('F-02 · CP-02-02 · cada ficha muestra nombre, categoría, descripción, duración y precio', async () => {
    montarPublico(<ServicesPage />, { ruta: '/servicios', tabla: 'servicios', datos: SERVICIOS })

    await screen.findByText('Corte de cabello')

    const ficha = screen.getByText('Corte de cabello').closest('div.bg-neutral-900')
    expect(ficha).toHaveTextContent('Cabello')
    expect(ficha).toHaveTextContent('Corte clasico con lavado.')
    expect(ficha).toHaveTextContent('30')
    expect(ficha).toHaveTextContent('$150 MXN')
  })

  it('F-02 · CP-02-02 · un servicio sin descripción lo dice en la ficha', async () => {
    montarPublico(<ServicesPage />, { ruta: '/servicios', tabla: 'servicios', datos: SERVICIOS })

    await screen.findByText('Perfilado de barba')
    expect(
      screen.getByText('Perfilado de barba').closest('div.bg-neutral-900')
    ).toHaveTextContent('Sin descripción disponible.')
  })

  it('F-02 · CP-02-01 · el catálogo se pide solo de la barbería del sitio', async () => {
    montarPublico(<ServicesPage />, { ruta: '/servicios', tabla: 'servicios', datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    expect(llamadaDe('servicios', 'select').filtros).toEqual([
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
  })

  it('F-02 · el botón de la ficha lleva a agendar con ese servicio', async () => {
    const user = userEvent.setup()
    montarPublico(
      <>
        <Ubicacion />
        <ServicesPage />
      </>,
      { ruta: '/servicios', tabla: 'servicios', datos: SERVICIOS }
    )

    await screen.findByText('Corte de cabello')
    await user.click(screen.getAllByRole('button', { name: 'AGENDAR ESTE SERVICIO' })[0])

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent(
        '/agendar?servicio=Corte%20de%20cabello'
      )
    })
  })

  it('F-02 · el botón de «Regresar» lleva a la portada', async () => {
    montarPublico(<ServicesPage />, { ruta: '/servicios', tabla: 'servicios', datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    expect(screen.getByRole('button', { name: '← Regresar' })).toBeInTheDocument()
  })
})

describe('ServicesPage · estados (F-02)', () => {
  it('F-02 · avisa cuando no hay servicios registrados', async () => {
    montarPublico(<ServicesPage />, { ruta: '/servicios', tabla: 'servicios', datos: [] })

    await waitFor(() => {
      expect(screen.getByText('No hay servicios registrados.')).toBeInTheDocument()
    })
  })

  it.fails('F-02 · avisa cuando la carga de los servicios falla', async () => {
    // HUECO REAL: `cargarServicios` revisa el `error` pero solo vacía la lista:
    // un fallo de red se ve EXACTAMENTE igual que una barbería sin catálogo, y
    // no hay ni mensaje ni botón de reintento (a diferencia de la portada,
    // que sí los tiene).
    montarPublico(<ServicesPage />, {
      ruta: '/servicios',
      tabla: 'servicios',
      error: { message: 'sin permiso' },
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(
      screen.queryByText('No hay servicios registrados.')
    ).not.toBeInTheDocument()
  })

  it.fails('F-02 · la duración se muestra con su unidad, como en la portada', async () => {
    // HUECO REAL: la página imprime `servicio.duracion` tal cual, así que un
    // servicio guardado como '30' se ve como «30» (sin «min») mientras que en
    // la portada el mismo servicio sale como «30 min». La columna `duracion`
    // es TEXT y puede traer '30' o '50 min': las dos vistas no coinciden.
    montarPublico(<ServicesPage />, { ruta: '/servicios', tabla: 'servicios', datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    const ficha = screen.getByText('Corte de cabello').closest('div.bg-neutral-900')
    expect(ficha).toHaveTextContent('30 min')
  })
})
