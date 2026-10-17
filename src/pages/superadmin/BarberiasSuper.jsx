// src/pages/superadmin/BarberiasSuper.jsx
// Listado de TODAS las barberías del software, con sus números. Mismo sistema
// visual que el panel /admin (slate-50, superficies blancas, `primary`, `amber`
// para acentos, `font-serif` en títulos y cifras con `tabular-nums`).
//
// Los datos salen de UNA sola llamada a la RPC `superadmin_resumen_barberias()`:
// la función agrega por barbería los conteos (citas del mes, citas totales,
// servicios, barberos y productos), así que no hay N+1 ni varias consultas.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import BarberiaForm from './BarberiaForm'

const ITEMS_POR_PAGINA = 8

/* La dirección de una barbería es `https://<slug>.<VITE_DOMINIO_BASE>`.
   ⚠ **No se deduce del host actual contando sus partes**: `gools.com.mx` tiene tres
   etiquetas y una barbería serían cuatro, mientras que el dominio anterior tenía
   dos y una eran tres. El mismo cálculo era correcto con uno y falso con el otro.
   Ahora el dominio base es una variable de compilación (§14.1), igual que en
   `BarberiaProvider`: los dos componentes leen la misma fuente y no pueden
   discrepar. Sin la variable no hay dirección que abrir y el botón se deshabilita. */
function dominioBaseDeBarberias() {
  return String(import.meta.env.VITE_DOMINIO_BASE || '').trim().toLowerCase() || null
}

const DOMINIO_BASE = dominioBaseDeBarberias()

// `created_at` es timestamptz: se muestra en formato corto y en español.
function etiquetaFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function IconoBuscar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  )
}

function IconoTienda() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <path d="M3 21h18"/><path d="M4 21V10l8-6 8 6v11"/><path d="M9 21v-6h6v6"/>
    </svg>
  )
}

function IconoCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  )
}

function IconoPausa() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/><line x1="10" y1="8" x2="10" y2="16"/><line x1="14" y1="8" x2="14" y2="16"/>
    </svg>
  )
}

function IconoCalendario() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>
    </svg>
  )
}

function IconoEditar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
  )
}

function IconoPoder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path d="M12 3v9"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>
    </svg>
  )
}

function IconoExterno() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>
    </svg>
  )
}

function IconoChevron({ style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" style={style} aria-hidden="true">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

export default function BarberiasSuper() {
  const [barberias, setBarberias] = useState([])
  const [cargando, setCargando] = useState(true)
  // Los tres mensajes viven separados: la carga, las escrituras y el aviso de
  // éxito no se pisan entre sí.
  const [errorCarga, setErrorCarga] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [aviso, setAviso] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todas')
  const [pagina, setPagina] = useState(1)

  const [formAbierto, setFormAbierto] = useState(false)
  const [barberiaEditando, setBarberiaEditando] = useState(null)
  // Id de la barbería con una escritura en curso (deshabilita sus botones).
  const [ocupada, setOcupada] = useState(null)

  const cargarBarberias = useCallback(async () => {
    const { data, error } = await supabase.rpc('superadmin_resumen_barberias')
    if (error) {
      console.error(error)
      setErrorCarga('No pudimos cargar las barberías. Intenta de nuevo.')
      setBarberias([])
    } else {
      setErrorCarga('')
      setBarberias(data || [])
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarBarberias()
  }, [cargarBarberias])

  /* ---- Modal ---- */
  const abrirNueva = () => {
    setAviso('')
    setBarberiaEditando(null)
    setFormAbierto(true)
  }

  const abrirEditar = (b) => {
    setAviso('')
    setBarberiaEditando(b)
    setFormAbierto(true)
  }

  const cerrarForm = () => {
    setFormAbierto(false)
    setBarberiaEditando(null)
  }

  const alGuardar = () => {
    // `barberiaEditando` dice si era alta o edición; se lee antes de cerrar.
    const eraAlta = !barberiaEditando
    cerrarForm()
    if (eraAlta) {
      setAviso('Barbería creada. Pásale al dueño su correo y la contraseña temporal.')
    }
    cargarBarberias()
  }

  /* ---- Activar / desactivar ---- */
  const cambiarActiva = async (b) => {
    const desactivar = b.activa
    const pregunta = desactivar
      ? `¿Desactivar "${b.nombre}"? Su sitio dejará de estar disponible para el público.`
      : `¿Activar "${b.nombre}"? Su sitio volverá a estar disponible para el público.`
    if (!confirm(pregunta)) return

    setErrorAccion('')
    setAviso('')
    setOcupada(b.id)
    // `count` a propósito: un UPDATE que RLS no deja pasar afecta 0 filas sin
    // lanzar error (§10.5).
    const { error, count } = await supabase
      .from('barberias')
      .update({ activa: !b.activa }, { count: 'exact' })
      .eq('id', b.id)
    setOcupada(null)

    if (error) {
      console.error(error)
      setErrorAccion(`No se pudo ${desactivar ? 'desactivar' : 'activar'} la barbería: ${error.message}`)
      return
    }
    if (!count) {
      setErrorAccion('No se cambió nada. Revisa que tu cuenta siga siendo la del superadmin.')
      return
    }
    cargarBarberias()
  }

  /* ---- Abrir el sitio público de la barbería ---- */
  const abrirSitio = (b) => {
    if (!DOMINIO_BASE) return
    window.open(`https://${b.slug}.${DOMINIO_BASE}`, '_blank', 'noopener,noreferrer')
  }

  /* ---- Filtros + métricas + paginación ---- */
  const filtradas = barberias.filter((b) => {
    const q = busqueda.trim().toLowerCase()
    const coincideBusqueda = !q ||
      b.nombre?.toLowerCase().includes(q) ||
      b.slug?.toLowerCase().includes(q)
    const coincideEstado = estadoFiltro === 'todas' ||
      (estadoFiltro === 'activas' ? b.activa : !b.activa)
    return coincideBusqueda && coincideEstado
  })

  const total = barberias.length
  const activas = barberias.filter((b) => b.activa).length
  const inactivas = total - activas
  const citasMes = barberias.reduce((suma, b) => suma + Number(b.citas_mes || 0), 0)

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / ITEMS_POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const paginadas = filtradas.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  )
  const desde = filtradas.length === 0 ? 0 : (paginaActual - 1) * ITEMS_POR_PAGINA + 1
  const hasta = Math.min(paginaActual * ITEMS_POR_PAGINA, filtradas.length)

  const hayFiltros = Boolean(busqueda) || estadoFiltro !== 'todas'
  const limpiarFiltros = () => { setBusqueda(''); setEstadoFiltro('todas'); setPagina(1) }

  if (cargando) return <p className="text-slate-500">Cargando...</p>

  return (
    <div>
      {/* ===== Header ===== */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber">
            Superadmin
          </p>
          <h1 className="font-serif text-3xl text-navy">Barberías</h1>
          <p className="mt-1 text-sm text-slate">
            Todas las barberías del software: alta, estado y actividad.
          </p>
        </div>
        <button
          onClick={abrirNueva}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          + Nueva barbería
        </button>
      </div>

      {/* ===== 4 métricas ===== */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary">
            <IconoTienda />
          </div>
          <p className="font-serif text-3xl tabular-nums text-navy">{total}</p>
          <p className="mt-1 text-sm text-slate">Barberías</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary">
            <IconoCheck />
          </div>
          <p className="font-serif text-3xl tabular-nums text-navy">{activas}</p>
          <p className="mt-1 text-sm text-slate">Activas</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber">
            <IconoPausa />
          </div>
          <p className="font-serif text-3xl tabular-nums text-navy">{inactivas}</p>
          <p className="mt-1 text-sm text-slate">Inactivas</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber">
            <IconoCalendario />
          </div>
          <p className="font-serif text-3xl tabular-nums text-navy">{citasMes}</p>
          <p className="mt-1 text-sm text-slate">Citas del mes</p>
        </div>
      </div>

      {/* ===== Avisos ===== */}
      {aviso && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <p role="status" className="text-sm text-navy">{aviso}</p>
          <button
            type="button"
            onClick={() => setAviso('')}
            aria-label="Cerrar aviso"
            className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Cerrar
          </button>
        </div>
      )}

      {errorAccion && (
        <p role="alert" className="mb-4 rounded-xl border border-red-600/30 bg-white p-4 text-sm text-red-600">
          {errorAccion}
        </p>
      )}

      {errorCarga && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-600/30 bg-white p-4">
          <p role="alert" className="text-sm text-red-600">{errorCarga}</p>
          <button
            onClick={cargarBarberias}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-navy transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Reintentar
          </button>
        </div>
      )}

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
            placeholder="Filtrar por nombre o slug..."
            aria-label="Filtrar por nombre o slug"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <select
          value={estadoFiltro}
          onChange={(e) => { setEstadoFiltro(e.target.value); setPagina(1) }}
          aria-label="Filtrar por estado"
          className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary-100"
        >
          <option value="todas">Todas</option>
          <option value="activas">Activas</option>
          <option value="inactivas">Inactivas</option>
        </select>
        <p className="ml-auto text-sm text-slate">
          Mostrando <strong className="text-navy">{desde}–{hasta}</strong> de{' '}
          <strong className="text-navy">{filtradas.length}</strong> registros
        </p>
      </div>

      {/* ===== Tabla ===== */}
      {filtradas.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center">
          <p className="text-sm text-slate-500">
            {total === 0
              ? 'Aún no hay barberías registradas.'
              : 'Ninguna barbería coincide con los filtros.'}
          </p>
          {total === 0 ? (
            <button
              onClick={abrirNueva}
              className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              + Nueva barbería
            </button>
          ) : (
            hayFiltros && (
              <button
                onClick={limpiarFiltros}
                className="mt-3 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Limpiar filtros
              </button>
            )
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Nombre</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Slug</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Estado</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Citas del mes</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Servicios / Barberos</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Alta</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginadas.map((b) => {
                  const enCurso = ocupada === b.id
                  return (
                    <tr key={b.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      {/* Nombre */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-serif text-sm text-slate">
                            {b.nombre?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-navy">{b.nombre}</p>
                            {/* `citas_total` y `productos` vienen en el resumen de la RPC. */}
                            <p className="truncate text-xs text-slate">
                              {Number(b.citas_total || 0)} citas en total · {Number(b.productos || 0)} productos
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="px-5 py-3.5">
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate">{b.slug}</code>
                      </td>

                      {/* Estado: punto + etiqueta, sin pills grandes (§11.3) */}
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`h-2 w-2 shrink-0 rounded-full ${b.activa ? 'bg-green-600' : 'bg-slate-300'}`}
                          />
                          <span className="text-sm text-slate">{b.activa ? 'Activa' : 'Inactiva'}</span>
                        </span>
                      </td>

                      {/* Citas del mes */}
                      <td className="px-5 py-3.5">
                        <p className="text-sm tabular-nums text-navy">{Number(b.citas_mes || 0)}</p>
                      </td>

                      {/* Servicios / barberos */}
                      <td className="px-5 py-3.5">
                        <p className="text-sm tabular-nums text-navy">
                          {Number(b.servicios || 0)} / {Number(b.barberos || 0)}
                        </p>
                      </td>

                      {/* Alta */}
                      <td className="px-5 py-3.5">
                        <p className="text-sm tabular-nums text-slate">{etiquetaFecha(b.created_at)}</p>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => abrirEditar(b)}
                            disabled={enCurso}
                            aria-label={`Editar ${b.nombre}`}
                            title="Editar"
                            className="rounded-lg border border-slate-200 p-1.5 text-slate transition-colors hover:bg-slate-100 hover:text-navy disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <IconoEditar />
                          </button>
                          <button
                            onClick={() => cambiarActiva(b)}
                            disabled={enCurso}
                            aria-label={b.activa ? `Desactivar ${b.nombre}` : `Activar ${b.nombre}`}
                            title={b.activa ? 'Desactivar' : 'Activar'}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate transition-colors hover:bg-slate-100 hover:text-navy disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <IconoPoder />
                          </button>
                          <button
                            onClick={() => abrirSitio(b)}
                            disabled={!DOMINIO_BASE}
                            aria-label={`Abrir el sitio de ${b.nombre}`}
                            title={DOMINIO_BASE
                              ? `Abrir ${b.slug}.${DOMINIO_BASE}`
                              : 'Define VITE_DOMINIO_BASE para poder abrir el sitio de una barbería.'}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate transition-colors hover:bg-slate-100 hover:text-navy disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <IconoExterno />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación (solo si hay más de una página) */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <p className="text-sm text-slate">
                Página <strong className="text-navy">{paginaActual}</strong> de{' '}
                <strong className="text-navy">{totalPaginas}</strong>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagina(Math.max(1, paginaActual - 1))}
                  disabled={paginaActual === 1}
                  aria-label="Anterior"
                  className="rounded-lg border border-slate-200 p-1.5 text-slate transition-colors hover:bg-slate-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <IconoChevron style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button
                  onClick={() => setPagina(Math.min(totalPaginas, paginaActual + 1))}
                  disabled={paginaActual === totalPaginas}
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

      {formAbierto && (
        <BarberiaForm
          barberia={barberiaEditando}
          onClose={cerrarForm}
          onGuardado={alGuardar}
        />
      )}
    </div>
  )
}
