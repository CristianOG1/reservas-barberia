// tests/unit/ProductosAdmin.test.jsx
// Catalogo de productos e inventario del panel.
//
// Matriz v3: F-10 «Gestionar los productos y su inventario».

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabaseMock } from '../mocks/supabaseClient'
import {
  PRODUCTOS,
  llamadaDe,
  montarProductosAdmin,
  tarjetaDe,
  usarRelojFijo,
} from '../helpers/fixturesCatalogo'

usarRelojFijo()

/** Devuelve la fila de la tabla de un producto. */
function filaDe(producto) {
  return screen.getByText(producto).closest('tr')
}

describe('ProductosAdmin · catalogo', () => {
  it('F-10 · carga solo los productos de la barbería activa', async () => {
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')

    const llamada = llamadaDe('productos', 'select')
    expect(llamada.filtros).toEqual([{ op: 'eq', columna: 'barberia_id', valor: 'b1' }])
    expect(llamada.orden).toEqual([
      { columna: 'created_at', opciones: { ascending: false } },
    ])
  })

  it('F-10 · cada fila muestra el precio y el estado del stock', async () => {
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')

    expect(filaDe('Aceite para barba')).toHaveTextContent('$180 MXN')
    expect(filaDe('Aceite para barba')).toHaveTextContent('En Stock: 12 uds')
    // Con 5 unidades o menos el panel avisa de que hay que reponer.
    expect(filaDe('Shampoo revitalizante')).toHaveTextContent('Stock Bajo: 3 uds')
    expect(filaDe('Pomada mate')).toHaveTextContent('Agotado')
  })

  it('F-10 · las métricas salen de los datos reales del inventario', async () => {
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')

    expect(tarjetaDe('Catálogo')).toHaveTextContent('3')
    expect(tarjetaDe('Catálogo')).toHaveTextContent('3 activos')
    // 180x12 + 220x3 + 150x0 = 2.820 pesos.
    expect(tarjetaDe('Valor total del inventario (costo)').textContent).toMatch(
      /\$\s?2,?820\s?MXN/
    )
    expect(tarjetaDe('Valor total del inventario (costo)')).toHaveTextContent('15 unidades en total')
    // Los dos productos con 5 unidades o menos.
    expect(tarjetaDe('Alerta de reabastecimiento')).toHaveTextContent('2')
    expect(tarjetaDe('Alerta de reabastecimiento')).toHaveTextContent('5 o menos por unidad')
  })

  it('F-10 · el buscador filtra por nombre', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')
    await user.type(
      screen.getByPlaceholderText('Filtrar por nombre, marca, SKU o ingrediente'),
      'pomada'
    )

    await waitFor(() => {
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('1–1')
    })
    expect(screen.getByText('Pomada mate')).toBeInTheDocument()
    expect(screen.queryByText('Aceite para barba')).not.toBeInTheDocument()
  })

  it('F-10 · el filtro por línea deja solo esa categoría', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')
    await user.selectOptions(screen.getByRole('combobox'), 'Cabello')

    await waitFor(() => {
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('1–1')
    })
    expect(screen.getByText('Shampoo revitalizante')).toBeInTheDocument()
    expect(screen.queryByText('Pomada mate')).not.toBeInTheDocument()
  })

  it('F-10 · avisa cuando nada coincide y ofrece limpiar los filtros', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Aceite para barba')
    await user.type(
      screen.getByPlaceholderText('Filtrar por nombre, marca, SKU o ingrediente'),
      'zzz'
    )

    await waitFor(() => {
      expect(
        screen.getByText('Aún no hay productos que coincidan con la búsqueda.')
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    await waitFor(() => {
      expect(screen.getByText('Pomada mate')).toBeInTheDocument()
    })
  })

  it('F-10 · la tabla pagina de seis en seis', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const muchos = Array.from({ length: 7 }, (_, i) => ({
      id: `p${i}`,
      nombre: `Producto ${i}`,
      categoria: 'Cabello',
      descripcion: '',
      precio: 100,
      stock: 10,
      imagen: null,
      created_at: '2026-03-01T00:00:00Z',
    }))
    montarProductosAdmin({ datos: muchos })

    await screen.findByText('Producto 0')
    expect(screen.getByText(/Mostrando/)).toHaveTextContent('1–6')

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    await waitFor(() => {
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('7–7')
    })
    expect(screen.getByText('Producto 6')).toBeInTheDocument()
  })
})

describe('ProductosAdmin · eliminar', () => {
  it('F-10 · eliminar pide confirmación y borra acotado a la barbería', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Pomada mate')
    await user.click(within(filaDe('Pomada mate')).getByRole('button', { name: 'Eliminar Pomada mate' }))

    await waitFor(() => {
      expect(llamadaDe('productos', 'delete')).toBeDefined()
    })
    expect(confirmar).toHaveBeenCalledWith('¿Eliminar este producto?')
    expect(llamadaDe('productos', 'delete').filtros).toEqual([
      { op: 'eq', columna: 'id', valor: 'p3' },
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])

    confirmar.mockRestore()
  })

  it('F-10 · si se cancela la confirmación, no borra nada', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Pomada mate')
    await user.click(within(filaDe('Pomada mate')).getByRole('button', { name: 'Eliminar Pomada mate' }))

    expect(llamadaDe('productos', 'delete')).toBeUndefined()

    confirmar.mockRestore()
  })
})

describe('ProductosAdmin · abrir el formulario desde la tabla', () => {
  it('F-10 · el botón Editar abre el formulario con los datos del producto', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Pomada mate')
    await user.click(within(filaDe('Pomada mate')).getByRole('button', { name: 'Editar Pomada mate' }))

    expect(screen.getByText('Editar Producto')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre *')).toHaveValue('Pomada mate')
    expect(screen.getByLabelText('Precio de venta (MXN) *')).toHaveValue(150)
  })

  it('F-10 · el botón de alta abre el formulario vacío', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Pomada mate')
    await user.click(screen.getByRole('button', { name: '+ Agregar Nuevo Producto' }))

    expect(screen.getByText('Nuevo Producto')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre *')).toHaveValue('')
  })

  it('F-10 · al guardar desde la tabla, el modal se cierra y la lista se recarga', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    supabaseMock.on('productos', 'insert', { data: null, error: null })
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Pomada mate')
    await user.click(screen.getByRole('button', { name: '+ Agregar Nuevo Producto' }))
    await user.type(screen.getByLabelText('Nombre *'), 'Producto nuevo')
    await user.type(screen.getByLabelText('Categoría *'), 'Cabello')
    await user.type(screen.getByLabelText('Precio de venta (MXN) *'), '80')
    await user.type(screen.getByLabelText('Unidades en stock *'), '5')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(screen.queryByText('Nuevo Producto')).not.toBeInTheDocument()
    })
    const selects = supabaseMock.llamadas.filter(
      (c) => c.tipo === 'query' && c.tabla === 'productos' && c.operacion === 'select'
    )
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })
})

describe('ProductosAdmin · los botones de la fila', () => {
  it('F-10 · ningún botón visible de la fila se queda sin acción', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Pomada mate')
    const fila = filaDe('Pomada mate')

    // 1) "Editar" abre el formulario con los datos del producto.
    await user.click(within(fila).getByRole('button', { name: 'Editar Pomada mate' }))
    await waitFor(() => {
      expect(screen.getByText('Editar Producto')).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Nombre *')).toHaveValue('Pomada mate')
    expect(screen.getByLabelText('Nombre *')).toBeEnabled()

    // 2) "Ver" abre el mismo formulario en modo detalle (sin campos editables).
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(within(filaDe('Pomada mate')).getByRole('button', { name: 'Ver Pomada mate' }))
    await waitFor(() => {
      expect(screen.getByText('Detalle del Producto')).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Nombre *')).toHaveValue('Pomada mate')
    expect(screen.getByLabelText('Nombre *')).toBeDisabled()
    // En detalle no hay botón de guardar ni selector de imagen.
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Imagen del producto')).not.toBeInTheDocument()

    // 3) "Eliminar" pide confirmación antes de borrar.
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    await user.click(
      within(filaDe('Pomada mate')).getByRole('button', { name: 'Eliminar Pomada mate' })
    )
    expect(confirmar).toHaveBeenCalledWith('¿Eliminar este producto?')

    confirmar.mockRestore()
  })
})

describe('ProductosAdmin · errores', () => {
  it('F-10 · avisa cuando la carga de los productos falla y ofrece reintentar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarProductosAdmin({ error: { message: 'sin permiso' } })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No pudimos cargar los productos. Intenta de nuevo.'
      )
    })
    // Un fallo de red NO se ve como un catálogo vacío.
    expect(
      screen.queryByText('Aún no hay productos que coincidan con la búsqueda.')
    ).not.toBeInTheDocument()
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

  it('F-10 · avisa cuando el borrado de un producto falla', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
    supabaseMock.on('productos', 'delete', { data: null, error: { message: 'sin permiso' } })
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Pomada mate')
    await user.click(within(filaDe('Pomada mate')).getByRole('button', { name: 'Eliminar Pomada mate' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudo eliminar el producto: sin permiso'
      )
    })
    // El producto sigue en la lista: no se finge el borrado.
    expect(screen.getByText('Pomada mate')).toBeInTheDocument()

    confirmar.mockRestore()
  })
})
