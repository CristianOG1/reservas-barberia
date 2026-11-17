import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useBarberia } from '../context/useBarberia'

export default function ProductosPage() {
  // El catálogo es de UNA barbería: todo se filtra por su id.
  const { barberia } = useBarberia()
  const barberiaId = barberia?.id ?? null

  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState('nombre')

  const obtenerProductos = useCallback(async () => {
    setLoading(true)
    setError(false)

    const { data, error: errorSupabase } = await supabase
      .from('productos')
      .select('*')
      .eq('barberia_id', barberiaId)

    // Un fallo de red no puede verse como un catálogo sin productos.
    if (errorSupabase) {
      console.error(errorSupabase)
      setError(true)
      setProductos([])
      setLoading(false)
      return
    }

    setProductos(data || [])
    setLoading(false)
  }, [barberiaId])

  useEffect(() => {
    if (barberiaId) {
      // La carga se dispara FUERA del cuerpo síncrono del efecto: dentro de
      // un efecto, un `setState` síncrono provoca renders en cascada (regla
      // `react-hooks/set-state-in-effect`).
      Promise.resolve().then(obtenerProductos)
    }
  }, [barberiaId, obtenerProductos])

  if (loading) {
    return <h2>Cargando productos...</h2>
  }

  const productosFiltrados = productos.filter(producto => {

  const coincideCategoria =
    categoriaSeleccionada === 'Todos' ||
    producto.categoria === categoriaSeleccionada

  const coincideBusqueda =
    producto.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase())

  return coincideCategoria && coincideBusqueda
})

const productosOrdenados = [...productosFiltrados].sort((a, b) => {

  if (orden === 'precioMenor') {
    return a.precio - b.precio
  }

  if (orden === 'precioMayor') {
    return b.precio - a.precio
  }

  return a.nombre.localeCompare(b.nombre)
})

// Las categorías del filtro salen de los productos reales (más «Todos»).
const categorias = [
  'Todos',
  ...[...new Set(productos.map((p) => p.categoria).filter(Boolean))],
]

  return (
    <div className="bg-neutral-950 min-h-screen px-8 py-12">

      <h1 className="text-white text-5xl font-bold mb-3">
      Productos Premium
      </h1>

      <p className="text-neutral-400 mb-6">
      Selección profesional para el cuidado del cabello y la barba.
      </p>

<div className="flex flex-col md:flex-row gap-4 mb-6">

  <input
    type="text"
    placeholder="Buscar producto..."
    value={busqueda}
    onChange={(e) => setBusqueda(e.target.value)}
    className="
      flex-1
      bg-neutral-900
      border
      border-neutral-800
      rounded-xl
      px-4
      py-3
      text-white
      placeholder-neutral-500
      focus:outline-none
      focus:border-amber-500
    "
  />

  <select
    value={orden}
    onChange={(e) => setOrden(e.target.value)}
    className="
      bg-neutral-900
      border
      border-neutral-800
      rounded-xl
      px-4
      py-3
      text-white
      focus:outline-none
      focus:border-amber-500
    "
  >
    <option value="nombre">Nombre A-Z</option>
    <option value="precioMenor">Precio menor</option>
    <option value="precioMayor">Precio mayor</option>
  </select>

</div>

    {error ? (
      // Mismo patrón que la portada: el error sustituye al listado y ofrece
      // reintentar. Un fallo de red no puede verse como un catálogo vacío.
      <div className="text-sm">
        <p role="alert" className="text-neutral-400 mb-3">
          No pudimos cargar los productos.
        </p>
        <button
          onClick={obtenerProductos}
          className="text-white border border-neutral-700 hover:border-neutral-500 px-4 py-2 rounded-md transition-colors"
        >
          Reintentar
        </button>
      </div>
    ) : null}

    {!error && (
    <p className="text-neutral-400 mb-8">
  Mostrando {productosOrdenados.length} productos
    </p>
    )}

      <div className="flex flex-wrap gap-3 mb-8">

        {/* Las categorías salen de los DATOS: una línea que no exista en el
            catálogo no se puede filtrar. */}
        {categorias.map((categoria) => (

          <button
            key={categoria}
            onClick={() => setCategoriaSeleccionada(categoria)}
            className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${categoriaSeleccionada === categoria
                ? 'bg-amber-500 text-black font-semibold'
                : 'bg-neutral-800 text-white hover:bg-neutral-700'
              }`}
          >
            {categoria}
          </button>

        ))}

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

        {productosOrdenados.map((producto) => (

          <div
            key={producto.id}
            className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 hover:border-amber-500 transition-all duration-300"
          >

            <img
              src={producto.imagen}
              alt={producto.nombre}
              className="w-full h-64 object-cover rounded-lg mb-4"
            />

            <span className="inline-block bg-neutral-800 text-amber-400 text-xs px-3 py-1 rounded-full mb-4">
              {producto.categoria}
            </span>

            <h2 className="text-white text-xl font-semibold mb-2">
              {producto.nombre}
            </h2>

            <p className="text-neutral-400 mb-4">
              {producto.descripcion}
            </p>

            <div className="flex justify-between items-center">

              <span className="text-amber-400 text-xl font-bold">
                ${producto.precio}
              </span>

              <span className="text-neutral-500 text-sm">
                Stock: {producto.stock}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}