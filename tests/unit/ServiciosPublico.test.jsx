// tests/unit/ServiciosPublico.test.jsx
// El bloque «Servicios» de la portada: el catálogo que ve el visitante antes
// de entrar.
//
// Matriz v3: F-02 «Consultar el catálogo de servicios del salón». Sus dos
// casos: CP-02-01 (un cliente de otra barbería no debe ver los servicios
// ajenos) y CP-02-02 (un servicio sin descripción).
//
// ⚠ La numeración de los casos sigue a la **matriz v3**: F-02 → CP-02-01/02.

import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import Servicios from '../../src/components/Servicios'
import { supabaseMock } from '../mocks/supabaseClient'
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

describe('Servicios (portada) · catálogo (F-02)', () => {
  it('F-02 · CP-02-02 · cada tarjeta muestra nombre, categoría, duración y costo', async () => {
    montarPublico(<Servicios />, { tabla: 'servicios', datos: SERVICIOS })

    await screen.findByText('Corte de cabello')

    const tarjeta = screen.getByRole('button', { name: /Corte de cabello/ })
    expect(tarjeta).toHaveTextContent('Cabello')
    expect(tarjeta).toHaveTextContent('30 min')
    expect(tarjeta).toHaveTextContent('$150 MXN')
    expect(tarjeta).toHaveTextContent('Corte clasico con lavado.')
  })

  it('F-02 · CP-02-02 · un servicio sin descripción lo dice en la tarjeta', async () => {
    montarPublico(<Servicios />, { tabla: 'servicios', datos: SERVICIOS })

    await screen.findByText('Perfilado de barba')
    expect(screen.getByRole('button', { name: /Perfilado de barba/ })).toHaveTextContent(
      'Sin descripción disponible.'
    )
  })

  it('F-02 · la duración se muestra tal cual viene, con o sin unidad', async () => {
    montarPublico(<Servicios />, { tabla: 'servicios', datos: SERVICIOS })

    await screen.findByText('Perfilado de barba')
    expect(screen.getByRole('button', { name: /Perfilado de barba/ })).toHaveTextContent('50 min')
  })

  it('F-02 · CP-02-01 · el catálogo se pide solo de la barbería del sitio', async () => {
    montarPublico(<Servicios />, { tabla: 'servicios', datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    expect(llamadaDe('servicios', 'select').filtros).toEqual([
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
  })

  it('F-02 · al pulsar un servicio lleva a agendar con ese servicio', async () => {
    const user = userEvent.setup()
    montarPublico(
      <>
        <Ubicacion />
        <Servicios />
      </>,
      { tabla: 'servicios', datos: SERVICIOS }
    )

    await screen.findByText('Corte de cabello')
    await user.click(screen.getByRole('button', { name: /Corte de cabello/ }))

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent(
        '/agendar?servicio=Corte%20de%20cabello'
      )
    })
  })
})

describe('Servicios (portada) · estados (F-02)', () => {
  it('F-02 · avisa cuando todavía no hay servicios', async () => {
    montarPublico(<Servicios />, { tabla: 'servicios', datos: [] })

    await waitFor(() => {
      expect(
        screen.getByText('Pronto publicaremos nuestros servicios.')
      ).toBeInTheDocument()
    })
  })

  it('F-02 · avisa cuando la carga falla y ofrece reintentar', async () => {
    const user = userEvent.setup()
    montarPublico(<Servicios />, {
      tabla: 'servicios',
      error: { message: 'sin permiso' },
    })

    await waitFor(() => {
      expect(screen.getByText('No pudimos cargar los servicios.')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    // La segunda consulta se dispara (y el mock ya responde sin error).
    await waitFor(() => {
      expect(
        supabaseMock.llamadas.filter(
          (c) => c.tipo === 'query' && c.tabla === 'servicios' && c.operacion === 'select'
        ).length
      ).toBeGreaterThanOrEqual(2)
    })
  })

  it('F-02 · el enlace de abajo lleva a la página de servicios', async () => {
    montarPublico(<Servicios />, { tabla: 'servicios', datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    expect(screen.getByRole('link', { name: 'VER TODOS LOS SERVICIOS →' })).toHaveAttribute(
      'href',
      '/servicios'
    )
  })
})
