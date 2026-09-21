// Productos.jsx
const productos = [
  {
    numero: '01',
    categoria: 'CUIDADO',
    badge: ' Favorito',
    titulo: 'Aceite para Barba',
    descripcion: 'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Hic culpa fugiat assumenda.',
    precio: '$350 MXN',
    destacado: false,
  },
  {
    numero: '02',
    categoria: 'PEINADO',
    badge: 'Nuevo',
    titulo: 'Cera Mate',
    descripcion: 'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Hic culpa fugiat assumenda.',
    precio: '$280 MXN',
    destacado: false,
  },
  {
    numero: '03',
    categoria: 'CUIDADO',
    badge: 'Más vendido',
    titulo: 'Shampoo Carbón',
    descripcion: 'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Hic culpa fugiat assumenda.',
    precio: '$320 MXN',
    destacado: true,
  },
  {
    numero: '04',
    categoria: 'ACABADO',
    badge: 'Clásico',
    titulo: 'Aftershave',
    descripcion: 'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Hic culpa fugiat assumenda.',
    precio: '$400 MXN',
    destacado: false,
  },
]

export default function Productos() {
  return (
    <section className="px-8 py-16">
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
          Lorem ipsum dolor sit, amet consectetur adipisicing elit. Hic culpa fugiat assumenda. Quis dicta autem doloremque adipisci distinctio natus minima aliquid debitis! Ipsa illo ab, dolores in deleniti ex veritatis?
        </p>
      </div>

      {/* Grid de tarjetas */}
      <div className="grid md:grid-cols-4 gap-4">
        {productos.map((p) => (
          <div
            key={p.numero}
            className={`rounded-xl p-5 border-3 ${
              p.destacado
                ? 'bg-neutral-900 border-yellow-950'
                : 'bg-neutral-900 border-neutral-800'
            }`}
          >
            {/* Fila superior: número / categoría + badge */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-neutral-500 text-xs">
                {p.numero} / {p.categoria}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  p.destacado
                    ? 'bg-yellow-700 text-white'
                    : 'bg-neutral-800 text-neutral-300'
                }`}
              >
                {p.badge}
              </span>
            </div>

            <h3 className="text-white font-semibold mb-2">{p.titulo}</h3>
            <p className="text-neutral-400 text-sm mb-6">{p.descripcion}</p>

            {/* Fila inferior: solo precio, sin compra */}
            <div className="flex justify-between items-end border-t border-neutral-800 pt-4">
              <div>
                <p className="text-neutral-500 text-[10px]">PRECIO</p>
                <p className={`text-sm font-semibold ${p.destacado ? 'text-yellow-600' : 'text-white'}`}>
                  {p.precio}
                </p>
              </div>
              <span className="text-neutral-500 text-[10px]">SOLO EN TIENDA</span>
            </div>
          </div>
        ))}
      </div>

      {/* Link inferior */}
      <div className="text-right mt-8">
        <a href="#" className="text-white text-sm font-semibold">
          VER TODOS LOS PRODUCTOS →
        </a>
      </div>
    </section>
  )
}
