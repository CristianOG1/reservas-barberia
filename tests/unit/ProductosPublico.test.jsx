// tests/unit/ProductosPublico.test.jsx
// El bloque «Productos» de la portada: el catálogo que ve el visitante.
//
// Matriz v3: F-03 «Consultar el catálogo de productos del salón». Sus dos
// casos: CP-03-01 (crear un producto con precio y stock) y CP-03-02 (producto
// sin categoría).
//
// ⚠ La numeración de los casos sigue a la **matriz v3**: F-03 → CP-03-01/02.

import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import Productos from '../../src/components/Productos'
import {
  PRODUCTOS,
  llamadaDe,
  montarPublico,
} from '../helpers/fixturesPublico'

describe('Productos (portada) · catálogo (F-03)', () => {
  it('F-03 · CP-03-01 · cada tarjeta muestra nombre, categoría, precio y disponibilidad', async () => {
    montarPublico(<Productos />, { tabla: 'productos', datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')

    expect(screen.getByText('Aceite para barba')).toBeInTheDocument()
    expect(screen.getByText('Barba')).toBeInTheDocument()
    expect(screen.getByText('$180 MXN')).toBeInTheDocument()
    // No hay compra en línea: el producto se lleva en la tienda.
    expect(screen.getAllByText('SOLO EN TIENDA')).toHaveLength(2)
  })

  it('F-03 · un producto sin descripción lo dice en la tarjeta', async () => {
    montarPublico(<Productos />, { tabla: 'productos', datos: PRODUCTOS })

    await screen.findByText('Shampoo revitalizante')
    expect(screen.getByText('Sin descripción disponible.')).toBeInTheDocument()
  })

  it('F-03 · el catálogo se pide solo de la barbería del sitio', async () => {
    montarPublico(<Productos />, { tabla: 'productos', datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')
    expect(llamadaDe('productos', 'select').filtros).toEqual([
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
  })

  it('F-03 · no hay ningún botón de compra: el producto se lleva en la tienda', async () => {
    montarPublico(<Productos />, { tabla: 'productos', datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')
    // No hay checkout en el proyecto: ninguna tarjeta es pulsable.
    expect(screen.queryByRole('button', { name: /comprar|añadir|carrito/i })).not.toBeInTheDocument()
  })

  it('F-03 · el enlace de abajo lleva a la página de productos', async () => {
    montarPublico(<Productos />, { tabla: 'productos', datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')
    expect(screen.getByRole('link', { name: 'VER TODOS LOS PRODUCTOS →' })).toHaveAttribute(
      'href',
      '/productos'
    )
  })
})

describe('Productos (portada) · estados (F-03)', () => {
  it('F-03 · avisa cuando todavía no hay productos', async () => {
    montarPublico(<Productos />, { tabla: 'productos', datos: [] })

    await waitFor(() => {
      expect(
        screen.getByText('Pronto publicaremos nuestros productos.')
      ).toBeInTheDocument()
    })
  })

  it('F-03 · avisa cuando la carga falla y ofrece reintentar', async () => {
    montarPublico(<Productos />, {
      tabla: 'productos',
      error: { message: 'sin permiso' },
    })

    await waitFor(() => {
      expect(screen.getByText('No pudimos cargar los productos.')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
