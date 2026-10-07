import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// `duracion` es TEXT en la base de datos: puede venir '30' o '50 min'.
function formatoDuracion(valor) {
  const s = String(valor ?? '').trim()
  return /^\d+$/.test(s) ? `${s} min` : s || '—'
}

// `servicios.costo` es numérico: lo mostramos como $650 MXN.
function formatoPrecio(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? `$${n.toLocaleString('es-MX')} MXN` : '—'
}

export default function Servicios() {
  const navigate = useNavigate()

  const [servicios, setServicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    cargarServicios()
  }, [])

  const cargarServicios = async () => {
    setCargando(true)
    setError(false)

    const { data, error: errorSupabase } = await supabase
      .from('servicios')
      .select('*')
      .order('created_at', { ascending: true })

    if (errorSupabase) {
      console.error(errorSupabase)
      setError(true)
      setServicios([])
    } else {
      setServicios(data || [])
    }
    setCargando(false)
  }

  return (
    // id="servicios" es el destino del botón "Explorar servicios" del Hero.
    <section id="servicios" className="px-8 py-16 scroll-mt-4">
      {/* Encabezado */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-neutral-400 text-xs tracking-wide">SERVICIOS DISTINTIVOS</span>
          </div>
          <h2 className="text-3xl font-bold text-white">
            Experiencias en cortes de Cabello y Barba
          </h2>
        </div>
        <p className="text-neutral-400 text-sm self-end">
          Elige tu servicio, revisa cuánto dura y cuánto cuesta, y agenda tu cita en un par de pasos.
        </p>
      </div>

      {/* Estados: cargando / error / vacío / lista */}
      {cargando ? (
        <p className="text-neutral-400 text-sm">Cargando servicios...</p>
      ) : error ? (
        <div className="text-sm">
          <p className="text-neutral-400 mb-3">No pudimos cargar los servicios.</p>
          <button
            onClick={cargarServicios}
            className="text-white border border-neutral-700 hover:border-neutral-500 px-4 py-2 rounded-md transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : servicios.length === 0 ? (
        <p className="text-neutral-400 text-sm">Pronto publicaremos nuestros servicios.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {servicios.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(`/agendar?servicio=${encodeURIComponent(s.nombre)}`)}
              className="text-left rounded-xl p-5 border border-neutral-800 bg-neutral-900 hover:border-amber-400/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            >
              {/* Fila superior: número / categoría */}
              <div className="mb-4">
                <span className="text-neutral-500 text-xs">
                  {String(i + 1).padStart(2, '0')}
                  {s.categoria ? ` / ${s.categoria}` : ''}
                </span>
              </div>

              <h3 className="text-white font-semibold mb-2">{s.nombre}</h3>
              <p className="text-neutral-400 text-sm mb-6">
                {s.descripcion || 'Sin descripción disponible.'}
              </p>

              {/* Fila inferior: duración / precio */}
              <div className="flex justify-between items-end border-t border-neutral-800 pt-4">
                <div>
                  <p className="text-neutral-500 text-[10px]">DURACIÓN</p>
                  <p className="text-white text-sm">{formatoDuracion(s.duracion)}</p>
                </div>
                <div className="text-right">
                  <p className="text-neutral-500 text-[10px]">PRECIO</p>
                  <p className="text-amber-400 text-sm font-semibold">{formatoPrecio(s.costo)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Link inferior */}
      <div className="text-right mt-8">
        <Link to="/servicios" className="text-white text-sm font-semibold hover:text-amber-400 transition-colors">
          VER TODOS LOS SERVICIOS →
        </Link>
      </div>
    </section>
  )
}
