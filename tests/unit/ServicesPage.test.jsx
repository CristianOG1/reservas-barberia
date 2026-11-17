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

  it('F-02 · avisa cuando la carga de los servicios falla y ofrece reintentar', async () => {
    const user = userEvent.setup()
    montarPublico(<ServicesPage />, {
      ruta: '/servicios',
      tabla: 'servicios',
      error: { message: 'sin permiso' },
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No pudimos cargar los servicios.'
      )
    })
    // Un fallo de red NO se ve como una barbería sin catálogo.
    expect(screen.queryByText('No hay servicios registrados.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(
        supabaseMock.llamadas.filter(
          (c) => c.tipo === 'query' && c.tabla === 'servicios' && c.operacion === 'select'
        ).length
      ).toBeGreaterThanOrEqual(2)
    })
  })

  it('F-02 · la duración se muestra con su unidad, como en la portada', async () => {
    // La página imprimía `servicio.duracion` tal cual: un servicio guardado
    // como '30' se veía como «30» y en la portada como «30 min».
    montarPublico(<ServicesPage />, { ruta: '/servicios', tabla: 'servicios', datos: SERVICIOS })

    await screen.findByText('Corte de cabello')
    const ficha = screen.getByText('Corte de cabello').closest('div.bg-neutral-900')
    expect(ficha).toHaveTextContent('30 min')
    // Y el que viene con la unidad dentro se respeta igual.
    const otra = screen.getByText('Perfilado de barba').closest('div.bg-neutral-900')
    expect(otra).toHaveTextContent('50 min')
  })
})
