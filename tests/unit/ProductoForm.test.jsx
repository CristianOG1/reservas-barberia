// tests/unit/ProductoForm.test.jsx
// Modal de alta y edicion de un producto.
//
// Matriz v3: F-10 «Gestionar los productos y su inventario».

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabaseMock } from '../mocks/supabaseClient'
import {
  PRODUCTOS,
  llamadaDe,
  montarProductoForm,
  stubObjectUrl,
  usarRelojFijo,
} from '../helpers/fixturesCatalogo'

usarRelojFijo()

/** Rellena el formulario con los datos de un producto nuevo. */
async function rellenar(user, { nombre = 'Cera nueva', categoria = 'Estilizado', precio = '90' } = {}) {
  await user.type(screen.getByLabelText('Nombre *'), nombre)
  await user.type(screen.getByLabelText('Categoría *'), categoria)
  await user.type(screen.getByLabelText('Descripción'), 'Producto de prueba.')
  await user.type(screen.getByLabelText('Precio de venta (MXN) *'), precio)
}

describe('ProductoForm · alta', () => {
  it('F-10 · guarda el producto nuevo con el precio en número y la barbería de la fila', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const guardado = vi.fn()
    montarProductoForm({ onGuardado: guardado })

    await rellenar(user)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(guardado).toHaveBeenCalled()
    })

    const llamada = llamadaDe('productos', 'insert')
    expect(llamada.carga[0]).toEqual({
      nombre: 'Cera nueva',
      categoria: 'Estilizado',
      descripcion: 'Producto de prueba.',
      precio: 90,
      imagen: null,
      barberia_id: 'b1',
    })
  })

  it('F-10 · el título del modal es el de un producto nuevo', () => {
    montarProductoForm()

    expect(screen.getByText('Nuevo Producto')).toBeInTheDocument()
    expect(screen.queryByText('Editar Producto')).not.toBeInTheDocument()
  })

  it('F-10 · si la escritura falla, sale el aviso y no se avisa de guardado', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const guardado = vi.fn()
    supabaseMock.on('productos', 'insert', { data: null, error: { message: 'duplicado' } })
    montarProductoForm({ onGuardado: guardado })

    await rellenar(user)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal, intenta de nuevo.')
    })
    expect(guardado).not.toHaveBeenCalled()
  })
})

describe('ProductoForm · edición', () => {
  it('F-10 · la edición carga los datos del producto y actualiza solo ese registro', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const guardado = vi.fn()
    const producto = {
      id: 'p1', nombre: 'Aceite para barba', categoria: 'Barba',
      descripcion: 'Aceite nutritivo.', precio: 180, stock: 12,
      imagen: 'https://ejemplo.com/foto.png',
    }
    montarProductoForm({ producto, onGuardado: guardado })

    expect(screen.getByLabelText('Nombre *')).toHaveValue('Aceite para barba')
    expect(screen.getByLabelText('Precio de venta (MXN) *')).toHaveValue(180)
    expect(screen.getByText('Editar Producto')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Precio de venta (MXN) *'))
    await user.type(screen.getByLabelText('Precio de venta (MXN) *'), '195')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(guardado).toHaveBeenCalled()
    })

    const llamada = llamadaDe('productos', 'update')
    expect(llamada.carga).toEqual({
      nombre: 'Aceite para barba',
      categoria: 'Barba',
      descripcion: 'Aceite nutritivo.',
      precio: 195,
      imagen: 'https://ejemplo.com/foto.png',
    })
    expect(llamada.filtros).toEqual([{ op: 'eq', columna: 'id', valor: 'p1' }])
  })

  it('F-10 · al elegir una imagen se sube a la carpeta de la barbería y se guarda su URL', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const url = stubObjectUrl()
    montarProductoForm()

    await rellenar(user)
    await user.upload(
      screen.getByLabelText('Imagen del producto'),
      new File(['contenido'], 'aceite.png', { type: 'image/png' })
    )
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(llamadaDe('productos', 'insert')).toBeDefined()
    })
    const guardada = llamadaDe('productos', 'insert').carga[0].imagen
    expect(guardada).toContain('/imagenes/b1/productos/')
    expect(guardada).toContain('-aceite.png')

    url.restaurar()
  })
})

describe('ProductoForm · huecos', () => {
  it.fails('F-10 · la edición acota la escritura a la barbería', async () => {
    // HUECO REAL: el alta mete `barberia_id` en el insert y el listado borra
    // con `.eq('id').eq('barberia_id')`, pero la EDICION solo filtra por
    // `.eq('id')`. La RLS lo impide de todos modos (AGENTS.md §10.5): no es una
    // fuga de datos, es que la consulta no lleva el mismo acotado que el resto
    // de escrituras del panel.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarProductoForm({ producto: PRODUCTOS[0] })

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(llamadaDe('productos', 'update')).toBeDefined()
    })
    expect(llamadaDe('productos', 'update').filtros).toEqual([
      { op: 'eq', columna: 'id', valor: 'p1' },
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
  })

  it.fails('F-10 · el formulario deja cambiar las unidades que hay en stock', async () => {
    // HUECO REAL: `productos.stock` existe en la base, el panel lo muestra y
    // hasta avisa de que hay que reponer, pero el formulario NO tiene campo
    // para cambiarlo: el stock solo se puede tocar por SQL.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarProductoForm({ producto: PRODUCTOS[1] })

    const campo = screen.queryByLabelText(/stock/i)
    expect(campo).toBeInTheDocument()

    if (campo) {
      await user.clear(campo)
      await user.type(campo, '25')
      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      await waitFor(() => {
        expect(llamadaDe('productos', 'update')).toBeDefined()
      })
      expect(llamadaDe('productos', 'update').carga.stock).toBe(25)
    }
  })
})
