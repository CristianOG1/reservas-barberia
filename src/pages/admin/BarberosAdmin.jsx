// src/pages/admin/BarberosAdmin.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import BarberoForm from './BarberoForm'

/* ===== Íconos ===== */

function IconoBuscar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  )
}

function IconoEstrella() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function IconoAgenda() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
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

function IconoSillon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M5 3h14"/><path d="M5 3v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3"/><line x1="12" y1="3" x2="12" y2="20"/><line x1="6" y1="8" x2="0.01" y2="8"/><line x1="18" y1="8" x2="24" y2="8"/>
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

/* ===== Configuración ===== */

const CAPACIDAD_SLOTS_ESTIMADA = 8 // Datos de ejemplo: slots estimados por barbero por día

function Stars({ rating, total }) {
  const r = Math.round(rating)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= r ? 'text-amber' : 'text-slate-200'}>
          <IconoEstrella />
        </span>
      ))}
      {total > 0 && (
        <span className="ml-1 text-xs text-slate">{total} reseñas</span>
      )}
    </div>
  )
}

export default function BarberosAdmin() {
  const [barberos, setBarberos] = useState([])
  const [citasHoy, setCitasHoy] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [barberoEditando, setBarberoEditando] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos') // todos | disponibles | noDisponibles

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setCargando(true)

    const hoy = new Date().toISOString().split('T')[0]

    const [barberosRes, citasRes] = await Promise.all([
      supabase.from('barberos').select('*').order('created_at', { ascending: false }),
      supabase.from('citas').select('*').eq('fecha', hoy),
    ])

    setBarberos(barberosRes.data || [])
    setCitasHoy(citasRes.data || [])
    setCargando(false)
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este barbero?')) return
    await supabase.from('barberos').delete().eq('id', id)
    cargarDatos()
  }

  // Alta/baja rápida: actualiza en Supabase y en el estado local, sin recargar todo
  const toggleDisponible = async (barbero) => {
    const nuevoValor = !barbero.disponible
    setBarberos(barberos.map((b) => (b.id === barbero.id ? { ...b, disponible: nuevoValor } : b)))
    await supabase.from('barberos').update({ disponible: nuevoValor }).eq('id', barbero.id)
  }

  const abrirNuevo = () => { setBarberoEditando(null); setMostrarForm(true) }
  const abrirEditar = (barbero) => { setBarberoEditando(barbero); setMostrarForm(true) }
  const alGuardar = () => { setMostrarForm(false); cargarDatos() }

  /* ---- Métricas ---- */
  const disponibles = barberos.filter((b) => b.disponible).length
  const noDisponibles = barberos.filter((b) => !b.disponible).length
  const citasHoyCount = citasHoy.length
  const capacidadTotal = Math.max(barberos.length * CAPACIDAD_SLOTS_ESTIMADA, 1)
  const capacidadPct = Math.min(Math.round((citasHoyCount / capacidadTotal) * 100), 100)

  /* ---- Filtrado ---- */
  const filtrados = barberos.filter((b) => {
    const coincideBusqueda = !busqueda || [
      b.nombre, b.especialidad
    ].some((c) => c?.toLowerCase().includes(busqueda.toLowerCase()))
    const coincideTab = filtro === 'todos'
      ? true
      : filtro === 'disponibles'
        ? b.disponible
        : !b.disponible
    return coincideBusqueda && coincideTab
  })

  const citasPorBarbero = (barbero) =>
    citasHoy.filter((c) => c.barbero_id === barbero.id).length

  if (cargando) return <p className="text-slate-500">Cargando...</p>

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber mb-1">
            Barberos · Personas
          </p>
          <h1 className="font-serif text-3xl text-navy">Equipo de Barberos</h1>
          <p className="mt-1 text-sm text-slate">
            Gestiona reseñas, disponibilidad y asignación de sillones en tiempo real.
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Dar de Alta Barbero
        </button>
      </div>

      {/* 3 métricas */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {/* En la barbería hoy */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <p className="font-serif text-3xl text-navy">{disponibles}</p>
          <p className="mt-1 text-sm text-slate">En la Barbería Hoy</p>
          <p className="mt-2 text-xs text-slate">de un equipo de {barberos.length}</p>
        </div>

        {/* Pausa / Libre */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <p className="font-serif text-3xl text-navy">{noDisponibles}</p>
          <p className="mt-1 text-sm text-slate">Pausa / Libre</p>
          <p className="mt-2 text-xs text-slate">sin turno activo</p>
        </div>

        {/* Capacidad operativa */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <p className="font-serif text-3xl text-navy">{capacidadPct}%</p>
          <p className="mt-1 text-sm text-slate">Capacidad operativa</p>
          <p className="mt-2 text-xs text-slate">{citasHoyCount} de {capacidadTotal} slots ocupados</p>
          {/* Placeholder: sin datos reales de capacidad total configurables */}
        </div>
      </div>

      {/* Barra de búsqueda y tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="relative flex-1 min-w-52">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <IconoBuscar />
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, especialidad o sillón..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {[
            { k: 'todos', label: `Todos (${barberos.length})` },
            { k: 'disponibles', label: `Disponibles (${disponibles})` },
            { k: 'noDisponibles', label: `No dispo${disponibles}s (${noDisponibles})` },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setFiltro(t.k)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                filtro === t.k
                  ? 'bg-primary text-white'
                  : 'text-slate hover:text-navy'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de barberos */}
      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center">
          <p className="text-sm text-slate-500">
            {busqueda ? 'No hay barberos que coincidan con la búsqueda.' : 'Aún no hay barberos registrados.'}
          </p>
          {!busqueda && barberos.length === 0 && (
            <button
              onClick={abrirNuevo}
              className="mt-3 mx-auto block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Dar de Alta Barbero
            </button>
          )}
          {busqueda && (
            <button
              onClick={() => { setBusqueda(''); setFiltro('todos') }}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((b) => {
            const citasHoy_b = citasPorBarbero(b)
            return (
              <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-5">
                {/* Avatar + nombre */}
                <div className="mb-4 flex items-start gap-4">
                  <div className="relative">
                    <div className="h-14 w-14 shrink-0 rounded-full bg-slate-100 overflow-hidden">
                      {b.imagen ? (
                        <img src={b.imagen} alt={b.nombre} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-400">
                          {b.nombre?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    {/* Punto de estado */}
                    <span className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                      b.disponible ? 'bg-green-600' : 'bg-slate-400'
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy truncate">{b.nombre}</p>
                    <p className="text-sm text-slate">{b.especialidad || 'Sin especialidad'}</p>
                  </div>
                </div>

                {/* Rating */}
                {typeof b.rating === 'number' && (
                  <div className="mb-3">
                    <Stars rating={b.rating} total={b.total_resenas ?? 0} />
                  </div>
                )}

                {/* Sillón */}
                {b.sillon_numero != null && (
                  <div className="mb-3 flex items-center gap-2 text-sm text-slate">
                    <IconoSillon />
                    <span>Sillón N°{b.sillon_numero} · {b.sillon_nombre || 'Zona abierta'}</span>
                  </div>
                )}

                {/* Switch de disponibilidad */}
                <div className="mb-3">
                  <button
                    onClick={() => toggleDisponible(b)}
                    type="button"
                    role="switch"
                    aria-checked={b.disponible}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        b.disponible ? 'bg-primary' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          b.disponible ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </span>
                    <span className={b.disponible ? 'text-navy' : 'text-slate'}>
                      Disponible para Citas
                    </span>
                  </button>
                </div>

                {/* Barra de progreso de citas de hoy */}
                <div className="mb-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate">
                    <span>Citas para hoy</span>
                    <span className="font-medium text-navy">
                      {citasHoy_b} de {CAPACIDAD_SLOTS_ESTIMADA} slots
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min((citasHoy_b / CAPACIDAD_SLOTS_ESTIMADA) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Tags de especialidades */}
                {b.especialidad && (
                  <div className="mb-4 flex flex-wrap gap-1">
                    {b.servicios?.slice(0, 3).map((s, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Acciones */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                  <Link
                    to={`/admin/citas`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs text-navy transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-1 justify-center"
                  >
                    <IconoAgenda />
                    Ver Agenda Hoy
                  </Link>
                  <button
                    onClick={() => abrirEditar(b)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <IconoEditar />
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(b.id)}
                    aria-label="Eliminar"
                    className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <IconoEliminar />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {mostrarForm && (
        <BarberoForm
          barbero={barberoEditando}
          onClose={() => setMostrarForm(false)}
          onGuardado={alGuardar}
        />
      )}
    </div>
  )
}