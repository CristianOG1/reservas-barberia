// src/pages/admin/ProductosAdmin.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import ProductoForm from './ProductoForm'

/* ===== Íconos ===== */

function IconoExportar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function IconoBuscar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  )
}

function IconoEditar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function IconoVer() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function IconoEliminar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  )
}

function IconoChevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function IconoLote() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  )
}

const COLORES_CATEGORIA = ['bg-primary', 'bg-amber', 'bg-green-600', 'bg-red-600', 'bg-slate-400']

const ITEMS_POR_PAGINA = 6
const STOCK_MINIMO = 5

export default function ProductosAdmin() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [productoEditando, setProductoEditando] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    cargarProductos()
  }, [])

  const cargarProductos = async () => {
    setCargando(true)
    const { data } = await supabase.from('productos').select('*').order('created_at', { ascending: false })
    setProductos(data || [])
    setCargando(false)
    setPagina(1)
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return
    await supabase.from('productos').delete().eq('id', id)
    cargarProductos()
  }

  const abrirNuevo = () => { setProductoEditando(null); setMostrarForm(true) }
  const abrirEditar = (producto) => { setProductoEditando(producto); setMostrarForm(true) }
  const alGuardar = () => { setMostrarForm(false); cargarProductos() }

  /* ---- Métricas vía query real ---- */
  const totalValorInventario = productos.reduce((acc, p) => acc + (p.precio * (p.stock ?? 0)), 0)
  const stockBajo = productos.filter(p => (p.stock ?? 0) < STOCK_MINIMO).length

  /* ---- Filtro + búsqueda ---- */
  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))]

  const productosFiltrados = productos.filter(p => {
    const matchesBusqueda = !busqueda || [
      p.nombre, p.categoria, p.descripcion
    ].some(campo => campo?.toLowerCase().includes(busqueda.toLowerCase()))
    const matchesCategoria = !categoriaFiltro || p.categoria === categoriaFiltro
    return matchesBusqueda && matchesCategoria
  })

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / ITEMS_POR_PAGINA))
  const paginados = productosFiltrados.slice(
    (pagina - 1) * ITEMS_POR_PAGINA,
    pagina * ITEMS_POR_PAGINA
  )
  const desde = productosFiltrados.length === 0 ? 0 : (pagina - 1) * ITEMS_POR_PAGINA + 1
  const hasta = Math.min(pagina * ITEMS_POR_PAGINA, productosFiltrados.length)

  if (cargando) return <p className="text-slate-500">Cargando...</p>

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber mb-1">
            Control de Productos y Precios
          </p>
          <h1 className="font-serif text-3xl text-navy">Catálogo de Productos & Inventario</h1>
          <p className="mt-1 text-sm text-slate">
            Gestiona tus productos, categorías, precios y niveles de stock.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={abrirNuevo}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            + Agregar Nuevo Producto
          </button>
        </div>
      </div>

      {/* 3 métricas */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
          <p className="font-serif text-3xl text-navy">{productos.length}</p>
          <p className="mt-1 text-sm text-slate">Catálogo</p>
          <p className="mt-2 text-xs text-slate">{productos.length} activos</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <p className="font-serif text-3xl text-navy">${totalValorInventario.toLocaleString()} MXN</p>
          <p className="mt-1 text-sm text-slate">Valor total del inventario (costo)</p>
          <p className="mt-2 text-xs text-slate">
            {productos.reduce((a, p) => a + (p.stock ?? 0), 0)} unidades en total
          </p>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <p className="font-serif text-3xl text-navy">{stockBajo}</p>
          <p className="mt-1 text-sm text-slate">Alerta de reabastecimiento</p>
          <p className="mt-2 text-xs text-slate">{STOCK_MINIMO} o menos por unidad</p>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="relative flex-1 min-w-52">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <IconoBuscar />
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
            placeholder="Filtrar por nombre, marca, SKU o ingrediente"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <select
          value={categoriaFiltro}
          onChange={(e) => { setCategoriaFiltro(e.target.value); setPagina(1) }}
          className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary-100"
        >
          <option value="">Todas las líneas</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <p className="ml-auto text-sm text-slate">
          Mostrando <strong className="text-navy">{desde}–{hasta}</strong> de <strong className="text-navy">{productosFiltrados.length}</strong> registros
        </p>
      </div>

      {/* Tabla */}
      {productosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center">
          <p className="text-sm text-slate-500">Aún no hay productos que coincidan con la búsqueda.</p>
          <button
            onClick={() => { setBusqueda(''); setCategoriaFiltro(''); setPagina(1) }}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Producto</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Categoría</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Precio de venta</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Estado de stock</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Última venta</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginados.map((p) => {
                const stock = p.stock ?? 0
                const categoriaIdx = categorias.indexOf(p.categoria)
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    {/* Producto */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                          {p.imagen
                            ? <img src={p.imagen} alt={p.nombre} className="h-full w-full object-cover" />
                            : <span className="text-xs text-slate-400">{p.nombre?.charAt(0) || '?'}</span>
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium text-navy">{p.nombre}</p>
                          <p className="text-xs text-slate">{p.categoria}</p>
                        </div>
                      </div>
                    </td>
                    {/* Categoría */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${COLORES_CATEGORIA[categoriaIdx % COLORES_CATEGORIA.length]}`} />
                        <span className="text-sm text-slate">{p.categoria}</span>
                      </div>
                    </td>
                    {/* Precio */}
                    <td className="px-5 py-3.5">
                      <p className="text-sm tabular-nums text-navy">${p.precio} MXN</p>
                    </td>
                    {/* Estado de stock */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                        stock === 0
                          ? 'bg-red-50 text-red-600'
                          : stock <= STOCK_MINIMO
                            ? 'bg-amber-100 text-amber'
                            : 'bg-primary-50 text-primary'
                      }`}>
                        {stock === 0
                          ? 'Agotado'
                          : stock <= STOCK_MINIMO
                            ? `Stock Bajo: ${stock} uds`
                            : `En Stock: ${stock} uds`}
                      </span>
                    </td>
                    {/* Última venta */}
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-slate">—</p>
                    </td>
                    {/* Acciones */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => abrirEditar(p)}
                          aria-label="Editar"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <IconoEditar />
                        </button>
                        <button
                          aria-label="Ver"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <IconoVer />
                        </button>
                        <button
                          onClick={() => handleEliminar(p.id)}
                          aria-label="Eliminar"
                          className="rounded-lg border border-transparent p-1.5 text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          <IconoEliminar />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <p className="text-sm text-slate">
                Página <strong className="text-navy">{pagina}</strong> de <strong className="text-navy">{totalPaginas}</strong>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate transition-colors hover:bg-slate-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Anterior"
                >
                  <IconoChevron style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate transition-colors hover:bg-slate-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Siguiente"
                >
                  <IconoChevron />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mostrarForm && (
        <ProductoForm
          producto={productoEditando}
          categorias={categorias}
          onClose={() => setMostrarForm(false)}
          onGuardado={alGuardar}
        />
      )}
    </div>
  )
}