// tests/unit/Contacto.test.jsx
// La página `/contacto`: las sedes del salón y el contacto.
//
// Matriz v3: F-04 «Consultar los datos de contacto y las sedes del salón». Sus
// dos casos: CP-04-01 (una sede con los datos completos) y CP-04-02 (el mapa
// embebido sin destino).
//
// ⚠ La numeración de los casos sigue a la **matriz v3**: F-04 → CP-04-01/02.

import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import ContactoPage from '../../src/components/Contacto'
import { montarPublico } from '../helpers/fixturesPublico'

describe('Contacto · sedes (F-04)', () => {
  it('F-04 · la página lista las sedes del salón', () => {
    montarPublico(<ContactoPage />, { ruta: '/contacto' })

    expect(screen.getByText('SEDE 01')).toBeInTheDocument()
    expect(screen.getByText('SEDE 02')).toBeInTheDocument()
    expect(screen.getByText('SEDES METROPOLITANAS')).toBeInTheDocument()
  })

  it('F-04 · cada sede tiene su mapa y su enlace a Google Maps', () => {
    montarPublico(<ContactoPage />, { ruta: '/contacto' })

    const mapas = document.querySelectorAll('iframe')
    expect(mapas).toHaveLength(2)
    for (const mapa of mapas) {
      expect(mapa).toHaveAttribute('src', expect.stringContaining('google.com/maps'))
    }
    expect(
      screen.getAllByRole('link', { name: 'ABRIR EN GOOGLE MAPS ↗' })
    ).toHaveLength(2)
  })

  it('F-04 · la página ofrece el acceso directo a la reserva', () => {
    montarPublico(<ContactoPage />, { ruta: '/contacto' })

    const enlaces = screen.getAllByRole('link', { name: /AGENDAR CITA AHORA →/ })
    expect(enlaces.length).toBeGreaterThan(0)
    for (const enlace of enlaces) {
      expect(enlace).toHaveAttribute('href', '/agendar')
    }
  })

  it('F-04 · la página explica las garantías del salón', () => {
    montarPublico(<ContactoPage />, { ruta: '/contacto' })

    expect(screen.getByText('Puntualidad & Barra de Cortesía')).toBeInTheDocument()
    expect(screen.getByText('Política de Cambios y Cancelación')).toBeInTheDocument()
  })
})

describe('Contacto · huecos (F-04)', () => {
  it.fails('F-04 · cada sede muestra su nombre, dirección, horarios y teléfono', async () => {
    // HUECO REAL: los datos de las dos sedes están como placeholders vacíos en
    // el propio componente (`nombre: '', direccion: '', horarios: ['']`,
    // `telefono: ''`). La pantalla se ve montada pero no dice dónde está el
    // salón: es el caso CP-04-01, pendiente en la matriz.
    montarPublico(<ContactoPage />, { ruta: '/contacto' })

    const sede = screen.getByText('SEDE 01').closest('article')
    expect(sede).toHaveTextContent('Nicolás Romero')
    expect(sede).toHaveTextContent('5555 0000')
  })

  it.fails('F-04 · el mapa no pide una búsqueda con la cadena vacía', async () => {
    // HUECO REAL: los `<iframe>` piden `?q=&output=embed`, es decir una
    // búsqueda con la cadena vacía, así que el mapa no muestra la ubicación
    // real de la sede. Es el caso CP-04-02, que la matriz da por fallido.
    montarPublico(<ContactoPage />, { ruta: '/contacto' })

    const mapas = document.querySelectorAll('iframe')
    for (const mapa of mapas) {
      expect(mapa.getAttribute('src')).not.toContain('q=&')
    }
  })
})
