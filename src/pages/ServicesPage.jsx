import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ServicesPage() {
  const navigate = useNavigate()

  const [servicios, setServicios] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarServicios()
  }, [])

  const cargarServicios = async () => {
    setCargando(true)

    const { data, error } = await supabase
      .from('servicios')
      .select('*')

       if (error) {
        setServicios([])
    } else {
        setServicios(data || [])
    }
    setCargando(false)
  }

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
                        {servicio.duracion}
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