// src/pages/admin/ProductosAdmin.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import ProductoForm from './ProductoForm'

export default function ProductosAdmin() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [productoEditando, setProductoEditando] = useState(null)

  useEffect(() => {
    cargarProductos()
  }, [])

  const cargarProductos = async () => {
    setCargando(true)
    const { data } = await supabase.from('productos').select('*').order('created_at', { ascending: false })
    setProductos(data || [])
    setCargando(false)
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return
    await supabase.from('productos').delete().eq('id', id)
    cargarProductos()
  }

  const abrirNuevo = () => { setProductoEditando(null); setMostrarForm(true) }
  const abrirEditar = (producto) => { setProductoEditando(producto); setMostrarForm(true) }
  const alGuardar = () => { setMostrarForm(false); cargarProductos() }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-bone-100">Productos</h1>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brass-400 px-4 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-brass-300 active:bg-brass-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
        >
          Agregar producto
        </button>
      </div>

      {cargando ? (
        <p className="text-bone-400">Cargando...</p>
      ) : productos.length === 0 ? (
        <div className="rounded-lg border border-ink-700 bg-ink-900 px-5 py-10 text-center">
          <p className="text-sm text-bone-600">Aún no hay productos.</p>
          <button
            onClick={abrirNuevo}
            className="mt-4 rounded-md bg-brass-400 px-4 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-brass-300 active:bg-brass-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
          >
            Agregar producto
          </button>
        </div>
      ) : (
        <div className="divide-y divide-ink-700 overflow-hidden rounded-lg border border-ink-700 bg-ink-900">
          {productos.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-5 sm:py-4"
            >
              <img
                src={p.imagen || 'https://placehold.co/60x60?text=%20'}
                alt={p.nombre}
                className="h-12 w-12 shrink-0 rounded-md object-cover bg-ink-800 sm:h-14 sm:w-14"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-bone-100">{p.nombre}</p>
                <p className="text-sm text-bone-600">{p.categoria}</p>
              </div>

              <p className="ml-auto shrink-0 tabular-nums text-bone-400">${p.precio} MXN</p>

              <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
                <button
                  onClick={() => abrirEditar(p)}
                  className="rounded-md px-3 py-2 text-sm text-bone-400 transition-colors hover:bg-ink-800 hover:text-bone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleEliminar(p.id)}
                  className="rounded-md px-3 py-2 text-sm text-cancelada transition-colors hover:bg-cancelada/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cancelada/60"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarForm && (
        <ProductoForm producto={productoEditando} onClose={() => setMostrarForm(false)} onGuardado={alGuardar} />
      )}
    </div>
  )
}
