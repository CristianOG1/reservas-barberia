// src/pages/admin/BarberosAdmin.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import BarberoForm from './BarberoForm'

export default function BarberosAdmin() {
  const [barberos, setBarberos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [barberoEditando, setBarberoEditando] = useState(null)

  useEffect(() => {
    cargarBarberos()
  }, [])

  const cargarBarberos = async () => {
    setCargando(true)
    const { data } = await supabase.from('barberos').select('*').order('created_at', { ascending: false })
    setBarberos(data || [])
    setCargando(false)
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este barbero?')) return
    await supabase.from('barberos').delete().eq('id', id)
    cargarBarberos()
  }

  // Alta/baja rápida: actualiza en Supabase y en el estado local, sin recargar todo
  const toggleDisponible = async (barbero) => {
    const nuevoValor = !barbero.disponible
    setBarberos(barberos.map((b) => (b.id === barbero.id ? { ...b, disponible: nuevoValor } : b)))
    await supabase.from('barberos').update({ disponible: nuevoValor }).eq('id', barbero.id)
  }

  const abrirNuevo = () => { setBarberoEditando(null); setMostrarForm(true) }
  const abrirEditar = (barbero) => { setBarberoEditando(barbero); setMostrarForm(true) }
  const alGuardar = () => { setMostrarForm(false); cargarBarberos() }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-bone-100">Barberos</h1>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brass-400 px-4 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-brass-300 active:bg-brass-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
        >
          Agregar barbero
        </button>
      </div>

      {cargando ? (
        <p className="text-bone-400">Cargando...</p>
      ) : barberos.length === 0 ? (
        <div className="rounded-lg border border-ink-700 bg-ink-900 px-5 py-10 text-center">
          <p className="text-sm text-bone-600">Aún no hay barberos.</p>
          <button
            onClick={abrirNuevo}
            className="mt-4 rounded-md bg-brass-400 px-4 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-brass-300 active:bg-brass-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
          >
            Agregar barbero
          </button>
        </div>
      ) : (
        <div className="divide-y divide-ink-700 overflow-hidden rounded-lg border border-ink-700 bg-ink-900">
          {barberos.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-5 sm:py-4"
            >
              <img
                src={b.imagen || 'https://placehold.co/60x60?text=%20'}
                alt={b.nombre}
                className="h-12 w-12 shrink-0 rounded-full object-cover bg-ink-800 sm:h-14 sm:w-14"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-bone-100">{b.nombre}</p>
                <p className="text-sm text-bone-600">{b.especialidad || 'Sin especialidad'}</p>
              </div>

              {/* Switch de disponible/no disponible */}
              <button
                type="button"
                role="switch"
                aria-checked={b.disponible}
                onClick={() => toggleDisponible(b)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60 ${
                  b.disponible
                    ? 'border-brass-400/40 text-bone-100'
                    : 'border-ink-700 text-bone-600 hover:border-bone-600 hover:text-bone-400'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
                    b.disponible ? 'bg-brass-400' : 'bg-ink-800'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-3 w-3 rounded-full transition-all ${
                      b.disponible ? 'left-3.5 bg-ink-950' : 'left-0.5 bg-bone-600'
                    }`}
                  />
                </span>
                {b.disponible ? 'Disponible' : 'No disponible'}
              </button>

              <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
                <button
                  onClick={() => abrirEditar(b)}
                  className="rounded-md px-3 py-2 text-sm text-bone-400 transition-colors hover:bg-ink-800 hover:text-bone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleEliminar(b.id)}
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
        <BarberoForm barbero={barberoEditando} onClose={() => setMostrarForm(false)} onGuardado={alGuardar} />
      )}
    </div>
  )
}
