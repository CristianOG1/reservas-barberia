import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function ProductosPage() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState('nombre')

  useEffect(() => {
    obtenerProductos()
  }, [])

  async function obtenerProductos() {
    const { data, error } = await supabase
      .from('productos')
      .select('*')

    if (error) {
      console.error('Error:', error)
      setLoading(false)
      return
    }

    console.log(data)

    setProductos(data)
    setLoading(false)
  }

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

    <p className="text-neutral-400 mb-8">
  Mostrando {productosOrdenados.length} productos
    </p>

      <div className="flex flex-wrap gap-3 mb-8">

        {[
          'Todos',
          'Cabello',
          'Barba',
          'Cuidado Personal',
          'Accesorios'
        ].map((categoria) => (

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