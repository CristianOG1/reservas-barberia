import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useBarberia } from '../context/useBarberia'
import { formatoDuracion } from '../utils/formato'

export default function ServicesPage() {
  const navigate = useNavigate()
  // El catálogo es de UNA barbería: todo se filtra por su id.
  const { barberia } = useBarberia()
  const barberiaId = barberia?.id ?? null

  const [servicios, setServicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  const cargarServicios = useCallback(async () => {
    setCargando(true)
    setError(false)

    const { data, error: errorSupabase } = await supabase
      .from('servicios')
      .select('*')
      .eq('barberia_id', barberiaId)

    // Un fallo de red no puede verse como una barbería sin servicios.
    if (errorSupabase) {
      console.error(errorSupabase)
      setError(true)
      setServicios([])
    } else {
      setServicios(data || [])
    }
    setCargando(false)
  }, [barberiaId])

  useEffect(() => {
    if (barberiaId) {
      // La carga se dispara FUERA del cuerpo síncrono del efecto: dentro de
      // un efecto, un `setState` síncrono provoca renders en cascada (regla
      // `react-hooks/set-state-in-effect`).
      Promise.resolve().then(cargarServicios)
    }
  }, [barberiaId, cargarServicios])

  return (
    <div className="bg-neutral-950 min-h-screen text-white">

      {/* Encabezado */}
      <div className="px-8 py-12 border-b border-neutral-800">
        <button
          onClick={() => navigate('/')}
          className="text-neutral-400 hover:text-white text-sm mb-6"
        >
          ← Regresar
        </button>

        <p className="text-amber-400 text-xs tracking-widest mb-3">
          NUESTROS SERVICIOS
        </p>

        <h1 className="text-4xl font-bold mb-4">
          Servicios de la Barbería
        </h1>

        <p className="text-neutral-400 max-w-2xl">
          Conoce todos los servicios disponibles, su duración,
          descripción y precio.
        </p>
      </div>

      {/* Servicios */}
      <div className="px-8 py-12">

        {cargando ? (
          <p className="text-neutral-400">
            Cargando servicios...
          </p>
        ) : error ? (
          // Mismo patrón que la portada: el error sustituye al listado y ofrece
          // reintentar. Un fallo de red no puede verse como una barbería sin
          // servicios.
          <div className="text-sm">
            <p role="alert" className="text-neutral-400 mb-3">
              No pudimos cargar los servicios.
            </p>
            <button
              onClick={cargarServicios}
              className="text-white border border-neutral-700 hover:border-neutral-500 px-4 py-2 rounded-md transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : servicios.length === 0 ? (
          <p className="text-neutral-400">
            No hay servicios registrados.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

            {servicios.map((servicio) => (
              <div
                key={servicio.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
              >

                {/* Imagen */}
                {servicio.imagen && (
                  <img
                    src={servicio.imagen}
                    alt={servicio.nombre}
                    className="w-full h-52 object-cover"
                  />
                )}

                <div className="p-6">

                  {/* Categoría */}
                  <p className="text-amber-400 text-xs tracking-widest mb-2">
                    {servicio.categoria}
                  </p>

                  {/* Nombre */}
                  <h2 className="text-xl font-semibold mb-3">
                    {servicio.nombre}
                  </h2>

                  {/* Descripción */}
                  <p className="text-neutral-400 text-sm mb-6">
                    {servicio.descripcion || 'Sin descripción disponible.'}
                  </p>

                  {/* Duración y precio */}
                  <div className="grid grid-cols-2 gap-4 border-t border-neutral-800 pt-4">

                    <div>
                      <p className="text-neutral-500 text-xs">
                        DURACIÓN
                      </p>

                      <p className="text-white text-sm mt-1">
                        {formatoDuracion(servicio.duracion)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-neutral-500 text-xs">
                        PRECIO
                      </p>

                      <p className="text-white font-semibold mt-1">
                        ${servicio.costo} MXN
                      </p>
                    </div>

                  </div>

                  {/* Botón */}
                  <button
                    onClick={() =>
                      navigate(
                        `/agendar?servicio=${encodeURIComponent(servicio.nombre)}`
                      )
                    }
                    className="w-full mt-6 bg-white text-neutral-900 font-semibold py-2 rounded-md hover:bg-neutral-200"
                  >
                    AGENDAR ESTE SERVICIO
                  </button>

                </div>
              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  )
}