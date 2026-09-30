// src/pages/admin/ServiciosAdmin.jsx
// Catálogo de Servicios: la carta que el barbero consulta para saber qué ofrece,
// cuánto dura y cuánto cuesta. Mismo sistema visual que Resumen, Productos,
// Barberos y Citas (fondo slate-50, superficies blancas, acento primary).
import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import ServicioForm from './ServicioForm'

/* ===== Configuración ===== */

const ITEMS_POR_PAGINA = 8

// Paleta de puntos por categoría, igual que en ProductosAdmin. El índice es la
// posición de la categoría dentro del catálogo, así el color es estable entre
// recargas mientras no se agreguen categorías nuevas.
const COLORES_CATEGORIA = ['bg-primary', 'bg-amber', 'bg-green-600', 'bg-red-600', 'bg-slate-400']

// `duracion` es una columna TEXT: hoy guarda '30', pero el formulario aceptaba
// '50 min'. Para promediar se extrae el primer número que aparezca.
function aMinutos(valor) {
  const n = parseInt(String(valor ?? '').match(/\d+/)?.[0] ?? '', 10)
  return Number.isFinite(n) ? n : null
}

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
      <path d="M18.5 2.5a1.21 1.21 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
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

function IconoCapas() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  )
}

function IconoTarifa() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  )
}

function IconoReloj() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>
    </svg>
  )
}

export default function ServiciosAdmin() {
  const [servicios, setServicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [servicioEditando, setServicioEditando] = useState(null)
  const [soloLectura, setSoloLectura] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    cargarServicios()
  }, [])

  const cargarServicios = async () => {
    setCargando(true)
    const { data } = await supabase.from('servicios').select('*').order('created_at', { ascending: false })
    setServicios(data || [])
    setCargando(false)
    setPagina(1)
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este servicio?')) return
    await supabase.from('servicios').delete().eq('id', id)
    cargarServicios()
  }

  const cerrarForm = () => {
    setMostrarForm(false)
    setServicioEditando(null)
    setSoloLectura(false)
  }

  const abrirNuevo = () => {
    setServicioEditando(null)
    setSoloLectura(false)
    setMostrarForm(true)
  }

  const abrirEditar = (servicio) => {
    setServicioEditando(servicio)
    setSoloLectura(false)
    setMostrarForm(true)
  }

  // No hay vista de detalle en el proyecto, así que "ver" abre el mismo formulario
  // en modo lectura. Mejor eso que un ícono muerto que no hace nada.
  const abrirDetalle = (servicio) => {
    setServicioEditando(servicio)
    setSoloLectura(true)
    setMostrarForm(true)
  }

  const alGuardar = () => {
    cerrarForm()
    cargarServicios()
  }

  /* ---- Filtro + búsqueda ---- */
  const categorias = [...new Set(servicios.map((s) => s.categoria).filter(Boolean))]

  const serviciosFiltrados = servicios.filter((s) => {
    const coincideBusqueda = !busqueda || [s.nombre, s.categoria, s.descripcion]
      .some((campo) => campo?.toLowerCase().includes(busqueda.toLowerCase()))
    const coincideCategoria = !categoriaFiltro || s.categoria === categoriaFiltro
    return coincideBusqueda && coincideCategoria
  })

  /* ---- Métricas ---- */
  const costos = servicios.map((s) => Number(s.costo)).filter(Number.isFinite)
  const tarifaPromedio = costos.length > 0
    ? Math.round(costos.reduce((a, b) => a + b, 0) / costos.length)
    : 0
  const tarifaMin = costos.length > 0 ? Math.min(...costos) : 0
  const tarifaMax = costos.length > 0 ? Math.max(...costos) : 0

  const duraciones = servicios.map((s) => aMinutos(s.duracion)).filter((n) => n != null)
  const duracionPromedio = duraciones.length > 0
    ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length)
    : 0
  const duracionMin = duraciones.length > 0 ? Math.min(...duraciones) : 0
  const duracionMax = duraciones.length > 0 ? Math.max(...duraciones) : 0

  /* ---- Paginación ---- */
  const totalPaginas = Math.max(1, Math.ceil(serviciosFiltrados.length / ITEMS_POR_PAGINA))
  const paginados = serviciosFiltrados.slice(
    (pagina - 1) * ITEMS_POR_PAGINA,
    pagina * ITEMS_POR_PAGINA
  )
  const desde = serviciosFiltrados.length === 0 ? 0 : (pagina - 1) * ITEMS_POR_PAGINA + 1
  const hasta = Math.min(pagina * ITEMS_POR_PAGINA, serviciosFiltrados.length)

  // Exporta exactamente lo que el barbero está viendo, con los filtros aplicados.
  // `;` porque así lo abre Excel en español, y BOM para que respete acentos.
  const exportarCarta = () => {
    const encabezado = ['Servicio', 'Categoría', 'Duración (min)', 'Tarifa (MXN)', 'Descripción']
    const filas = serviciosFiltrados.map((s) => [
      s.nombre,
      s.categoria,
      aMinutos(s.duracion) ?? '',
      Number(s.costo),
      s.descripcion || '',
    ])
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = 'carta-servicios.csv'
    enlace.click()
    URL.revokeObjectURL(url)
  }

  if (cargando) return <p className="text-slate-500">Cargando...</p>

  return (
    <div>
      {/* ===== Header ===== */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber">
            Servicios
          </p>
          <h1 className="font-serif text-3xl text-navy">Catálogo de Servicios</h1>
          <p className="mt-1 text-sm text-slate">
            Gestiona los tiempos de atención de cada servicio de la barberia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={abrirNuevo}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            + Agregar Nuevo Servicio
          </button>
        </div>
      </div>

      {/* ===== 3 métricas ===== */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary">
            <IconoCapas />
          </div>
          <p className="font-serif text-3xl tabular-nums text-navy">{servicios.length}</p>
          <p className="mt-1 text-sm text-slate">Catálogo</p>
          <p className="mt-2 text-xs text-slate">
            {categorias.length} {categorias.length === 1 ? 'categoría' : 'categorías'} en la carta
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber">
            <IconoTarifa />
          </div>
          <p className="font-serif text-3xl tabular-nums text-navy">${tarifaPromedio} MXN</p>
          <p className="mt-1 text-sm text-slate">Tarifa promedio</p>
          <p className="mt-2 text-xs text-slate">
            {costos.length > 0
              ? `rango de $${tarifaMin} a $${tarifaMax} MXN`
              : 'sin tarifas capturadas'}
          </p>
        </div>

        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-1">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary">
            <IconoReloj />
          </div>
          <p className="font-serif text-3xl tabular-nums text-navy">
            {duraciones.length > 0 ? `${duracionPromedio} min` : '—'}
          </p>
          <p className="mt-1 text-sm text-slate">Duración promedio</p>
          <p className="mt-2 text-xs text-slate">
            {duraciones.length > 0
              ? `servicios de ${duracionMin} a ${duracionMax} min`
              : 'sin duraciones capturadas'}
          </p>
        </div>
      </div>

      {/* ===== Barra de filtros ===== */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="relative min-w-52 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <IconoBuscar />
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
            placeholder="Filtrar por nombre o categoría..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <select
          value={categoriaFiltro}
          onChange={(e) => { setCategoriaFiltro(e.target.value); setPagina(1) }}
          aria-label="Filtrar por categoría"
          className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary-100"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <p className="ml-auto text-sm text-slate">
          Mostrando <strong className="text-navy">{desde}–{hasta}</strong> de{' '}
          <strong className="text-navy">{serviciosFiltrados.length}</strong> registros
        </p>
      </div>

      {/* ===== Tabla ===== */}
      {serviciosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center">
          <p className="text-sm text-slate-500">
            {servicios.length === 0
              ? 'Aún no hay servicios en el catálogo.'
              : 'Ningún servicio coincide con los filtros.'}
          </p>
          {servicios.length === 0 ? (
            <button
              onClick={abrirNuevo}
              className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              + Agregar Nuevo Servicio
            </button>
          ) : (
            <button
              onClick={() => { setBusqueda(''); setCategoriaFiltro(''); setPagina(1) }}
              className="mt-3 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Servicio</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Categoría</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Duración</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Tarifa</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginados.map((s) => {
                  const minutos = aMinutos(s.duracion)
                  return (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      {/* Servicio */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                            {s.imagen ? (
                              <img src={s.imagen} alt={s.nombre} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-semibold text-slate-400">{s.nombre?.charAt(0) || '?'}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-navy">{s.nombre}</p>
                            <p className="truncate text-xs text-slate">
                              {s.descripcion || 'Sin descripción'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              COLORES_CATEGORIA[categorias.indexOf(s.categoria) % COLORES_CATEGORIA.length]
                            }`}
                          />
                          <span className="text-sm text-slate">{s.categoria}</span>
                        </div>
                      </td>

                      {/* Duración */}
                      <td className="px-5 py-3.5">
                        <p className="text-sm tabular-nums text-navy">
                          {minutos == null ? '—' : `${minutos} min`}
                        </p>
                      </td>

                      {/* Tarifa */}
                      <td className="px-5 py-3.5">
                        <p className="text-sm tabular-nums text-navy">${Number(s.costo)} MXN</p>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => abrirEditar(s)}
                            aria-label={`Editar ${s.nombre}`}
                            title="Editar"
                            className="rounded-lg border border-slate-200 p-1.5 text-slate transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <IconoEditar />
                          </button>
                          <button
                            onClick={() => abrirDetalle(s)}
                            aria-label={`Ver ${s.nombre}`}
                            title="Ver"
                            className="rounded-lg border border-slate-200 p-1.5 text-slate transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <IconoVer />
                          </button>
                          <button
                            onClick={() => handleEliminar(s.id)}
                            aria-label={`Eliminar ${s.nombre}`}
                            title="Eliminar"
                            className="rounded-lg border border-transparent p-1.5 text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
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
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <p className="text-sm text-slate">
                Página <strong className="text-navy">{pagina}</strong> de{' '}
                <strong className="text-navy">{totalPaginas}</strong>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  aria-label="Anterior"
                  className="rounded-lg border border-slate-200 p-1.5 text-slate transition-colors hover:bg-slate-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <IconoChevron style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  aria-label="Siguiente"
                  className="rounded-lg border border-slate-200 p-1.5 text-slate transition-colors hover:bg-slate-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <IconoChevron />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mostrarForm && (
        <ServicioForm
          servicio={servicioEditando}
          categorias={categorias}
          soloLectura={soloLectura}
          onClose={cerrarForm}
          onGuardado={alGuardar}
        />
      )}
    </div>
  )
}
