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
    await user.click(within(filaDe('Pomada mate')).getByRole('button', { name: 'Eliminar' }))

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
    await user.click(within(filaDe('Pomada mate')).getByRole('button', { name: 'Eliminar' }))

    expect(llamadaDe('productos', 'delete')).toBeUndefined()

    confirmar.mockRestore()
  })
})

describe('ProductosAdmin · abrir el formulario desde la tabla', () => {
  it('F-10 · el botón Editar abre el formulario con los datos del producto', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Pomada mate')
    await user.click(within(filaDe('Pomada mate')).getByRole('button', { name: 'Editar' }))

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

describe('ProductosAdmin · huecos', () => {
  it.fails('F-10 · el botón Ver abre el detalle del producto', async () => {
    // HUECO REAL: el boton "Ver" de la tabla no tiene `onClick`: no abre nada.
    // En `ServiciosAdmin` ese mismo boton abre el formulario en modo detalle;
    // aqui es un control muerto (AGENTS.md §18.36).
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Pomada mate')
    await user.click(within(filaDe('Pomada mate')).getByRole('button', { name: 'Ver' }))

    // En ServiciosAdmin el boton "Ver" abre el formulario en modo detalle.
    await waitFor(() => {
      expect(screen.getByDisplayValue('Pomada mate')).toBeInTheDocument()
    })
  })

  it.fails('F-10 · la tabla muestra la última venta de cada producto', async () => {
    // HUECO REAL: la columna "Ultima venta" esta Implementada con un guion
    // fijo ("—"): no hay ningun dato de ventas en el modelo, asi que la
    // columna no dice nada. El panel la muestra como si fuera informacion.
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Pomada mate')
    const celdas = filaDe('Pomada mate').querySelectorAll('td')
    // La quinta celda es la de "Ultima venta".
    expect(celdas[4].textContent).not.toBe('—')
  })

  it.fails('F-10 · avisa cuando la carga de los productos falla', async () => {
    // HUECO REAL: `cargarProductos` no revisa el `error`; hace
    // `setProductos(data || [])` y un fallo de red se ve EXACTAMENTE igual que
    // un catalogo vacio (AGENTS.md §13.A).
    montarProductosAdmin({ error: { message: 'sin permiso' } })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(
      screen.queryByText('Aún no hay productos que coincidan con la búsqueda.')
    ).not.toBeInTheDocument()
  })

  it.fails('F-10 · avisa cuando el borrado de un producto falla', async () => {
    // HUECO REAL: `handleEliminar` no revisa el `error` del `delete`: nunca se
    // dice que el borrado fallo (AGENTS.md §13.D).
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
    supabaseMock.on('productos', 'delete', { data: null, error: { message: 'sin permiso' } })
    montarProductosAdmin({ datos: PRODUCTOS })

    await screen.findByText('Pomada mate')
    await user.click(within(filaDe('Pomada mate')).getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('sin permiso')
    })

    confirmar.mockRestore()
  })
})
