// tests/unit/ProductosPage.test.jsx
// La página `/productos`: el catálogo con buscador, orden y filtro de línea.
//
// Matriz v3: F-03 «Consultar el catálogo de productos del salón». Sus dos
// casos: CP-03-01 (precio y stock) y CP-03-02 (producto sin categoría).

import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProductosPage from '../../src/pages/ProductosPage'
import { supabaseMock } from '../mocks/supabaseClient'
import {
  PRODUCTOS,
  llamadaDe,
  montarPublico,
} from '../helpers/fixturesPublico'

/** Nombres de los productos en el orden en que se pintan. */
function nombresEnPantalla() {
  return screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
}

describe('ProductosPage · catálogo (F-03)', () => {
  it('F-03 · CP-03-01 · cada ficha muestra nombre, categoría, precio y stock', async () => {
    montarPublico(<ProductosPage />, { ruta: '/productos', tabla: 'productos', datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')

    const ficha = screen.getByText('Aceite para barba').closest('div.bg-neutral-900')
    expect(ficha).toHaveTextContent('Barba')
    expect(ficha).toHaveTextContent('$180')
    expect(ficha).toHaveTextContent('Stock: 12')
  })

  it('F-03 · CP-03-01 · el catálogo se pide solo de la barbería del sitio', async () => {
    montarPublico(<ProductosPage />, { ruta: '/productos', tabla: 'productos', datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')
    expect(llamadaDe('productos', 'select').filtros).toEqual([
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
  })

  it('F-03 · el buscador filtra por nombre', async () => {
    const user = userEvent.setup()
    montarPublico(<ProductosPage />, { ruta: '/productos', tabla: 'productos', datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')
    await user.type(screen.getByPlaceholderText('Buscar producto...'), 'shampoo')

    await waitFor(() => {
      expect(screen.getByText('Shampoo revitalizante')).toBeInTheDocument()
    })
    expect(screen.queryByText('Aceite para barba')).not.toBeInTheDocument()
    expect(screen.getByText(/Mostrando 1 productos/)).toBeInTheDocument()
  })

  it('F-03 · el filtro por línea deja solo esa categoría', async () => {
    const user = userEvent.setup()
    montarPublico(<ProductosPage />, { ruta: '/productos', tabla: 'productos', datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')
    await user.click(screen.getByRole('button', { name: 'Barba' }))

    await waitFor(() => {
      expect(screen.getByText(/Mostrando 1 productos/)).toBeInTheDocument()
    })
    expect(screen.getByText('Aceite para barba')).toBeInTheDocument()
    expect(screen.queryByText('Shampoo revitalizante')).not.toBeInTheDocument()
  })

  it('F-03 · el orden por precio menor y mayor funciona', async () => {
    const user = userEvent.setup()
    montarPublico(<ProductosPage />, { ruta: '/productos', tabla: 'productos', datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')
    // Por defecto van por nombre.
    expect(nombresEnPantalla()).toEqual(['Aceite para barba', 'Shampoo revitalizante'])

    await user.selectOptions(screen.getByRole('combobox'), 'precioMenor')
    await waitFor(() => {
      expect(nombresEnPantalla()).toEqual(['Aceite para barba', 'Shampoo revitalizante'])
    })

    await user.selectOptions(screen.getByRole('combobox'), 'precioMayor')
    await waitFor(() => {
      expect(nombresEnPantalla()).toEqual(['Shampoo revitalizante', 'Aceite para barba'])
    })
  })
})

describe('ProductosPage · estados (F-03)', () => {
  it('F-03 · avisa cuando no hay productos', async () => {
    montarPublico(<ProductosPage />, { ruta: '/productos', tabla: 'productos', datos: [] })

    await waitFor(() => {
      expect(screen.getByText(/Mostrando 0 productos/)).toBeInTheDocument()
    })
  })

  it('F-03 · avisa cuando la carga de los productos falla y ofrece reintentar', async () => {
    const user = userEvent.setup()
    montarPublico(<ProductosPage />, {
      ruta: '/productos',
      tabla: 'productos',
      error: { message: 'sin permiso' },
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No pudimos cargar los productos.'
      )
    })
    // Un fallo de red NO se ve como un catálogo vacío.
    expect(screen.queryByText(/Mostrando 0 productos/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(
        supabaseMock.llamadas.filter(
          (c) => c.tipo === 'query' && c.tabla === 'productos' && c.operacion === 'select'
        ).length
      ).toBeGreaterThanOrEqual(2)
    })
  })

  it('F-03 · se puede filtrar por la categoría de cualquier producto', async () => {
    // Las categorías del filtro estaban escritas a mano en el componente: un
    // producto de otra categoría (p. ej. 'Estilizado') no se podía filtrar.
    const user = userEvent.setup()
    const conCategoriaFuera = [
      { ...PRODUCTOS[0], id: 'p3', nombre: 'Pomada mate', categoria: 'Estilizado' },
      { ...PRODUCTOS[1], id: 'p4', nombre: 'Cera modeladora', categoria: 'Estilizado' },
    ]
    montarPublico(<ProductosPage />, {
      ruta: '/productos',
      tabla: 'productos',
      datos: conCategoriaFuera,
    })

    await screen.findByText('Pomada mate')
    await user.click(screen.getByRole('button', { name: 'Estilizado' }))

    await waitFor(() => {
      expect(screen.getByText(/Mostrando 2 productos/)).toBeInTheDocument()
    })
    expect(screen.getByText('Pomada mate')).toBeInTheDocument()
    expect(screen.getByText('Cera modeladora')).toBeInTheDocument()
  })

  it('F-03 · el filtro solo muestra las categorías que existen en el catálogo', async () => {
    montarPublico(<ProductosPage />, { ruta: '/productos', tabla: 'productos', datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')
    // 'Todos' + las dos categorías reales ('Barba' y 'Cabello').
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Barba' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cabello' })).toBeInTheDocument()
    // Las que estaban escritas a mano y no existen en los datos, no salen.
    expect(screen.queryByRole('button', { name: 'Accesorios' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cuidado Personal' })).not.toBeInTheDocument()
  })
})
