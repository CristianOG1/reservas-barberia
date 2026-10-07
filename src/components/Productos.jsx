import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// `productos.precio` es numérico: lo mostramos como $350 MXN.
function formatoPrecio(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? `$${n.toLocaleString('es-MX')} MXN` : '—'
}

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    cargarProductos()
  }, [])

  const cargarProductos = async () => {
    setCargando(true)
    setError(false)

    const { data, error: errorSupabase } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: true })

    if (errorSupabase) {
      console.error(errorSupabase)
      setError(true)
      setProductos([])
    } else {
      setProductos(data || [])
    }
    setCargando(false)
  }

  return (
    <section id="productos" className="px-8 py-16 scroll-mt-4">
      {/* Encabezado */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-neutral-400 text-xs tracking-wide">PRODUCTOS DESTACADOS</span>
          </div>
          <h2 className="text-3xl font-bold text-white">
            Productos para el cuidado y estilo
          </h2>
        </div>
        <p className="text-neutral-400 text-sm self-end">
          Los mismos productos que usamos en la silla, disponibles para que los lleves a casa.
        </p>
      </div>

      {/* Estados: cargando / error / vacío / lista */}
      {cargando ? (
        <p className="text-neutral-400 text-sm">Cargando productos...</p>
      ) : error ? (
        <div className="text-sm">
          <p className="text-neutral-400 mb-3">No pudimos cargar los productos.</p>
          <button
            onClick={cargarProductos}
            className="text-white border border-neutral-700 hover:border-neutral-500 px-4 py-2 rounded-md transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : productos.length === 0 ? (
        <p className="text-neutral-400 text-sm">Pronto publicaremos nuestros productos.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {productos.map((p) => (
            <div
              key={p.id}
              className="rounded-xl p-5 border border-neutral-800 bg-neutral-900"
            >
              {p.imagen && (
                <img
                  src={p.imagen}
                  alt={p.nombre}
                  className="w-full h-40 object-cover rounded-lg mb-4"
                />
              )}

              {p.categoria && (
                <p className="text-neutral-500 text-xs mb-2">{p.categoria}</p>
              )}

              <h3 className="text-white font-semibold mb-2">{p.nombre}</h3>
              <p className="text-neutral-400 text-sm mb-6">
                {p.descripcion || 'Sin descripción disponible.'}
              </p>

              {/* Fila inferior: solo precio, sin compra en línea */}
              <div className="flex justify-between items-end border-t border-neutral-800 pt-4">
                <div>
                  <p className="text-neutral-500 text-[10px]">PRECIO</p>
                  <p className="text-amber-400 text-sm font-semibold">{formatoPrecio(p.precio)}</p>
                </div>
                <span className="text-neutral-500 text-[10px]">SOLO EN TIENDA</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link inferior */}
      <div className="text-right mt-8">
        <Link to="/productos" className="text-white text-sm font-semibold hover:text-amber-400 transition-colors">
          VER TODOS LOS PRODUCTOS →
        </Link>
      </div>
    </section>
  )
}
