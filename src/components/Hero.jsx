import { useNavigate } from 'react-router-dom'
export default function Hero() {
  const navigate = useNavigate()
    return (
      <section className="px-8 py-16 grid md:grid-cols-2 gap-12 items-center">
        {/* Columna izquierda: texto */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-neutral-400 text-xs">Estado de Mexico</span>
            <span className="bg-neutral-800 text-neutral-300 text-xs px-2 py-1 rounded-full">
              Nicolas Romero
            </span>
          </div>
  
          <h1 className="text-5xl font-bold text-white leading-tight">
            El arte de la
            <br />
            precisión
            <br />
            <span className="italic font-light text-amber-200">contemporánea</span>
          </h1>
  
          <p className="text-neutral-400 mt-6 max-w-md">
            Lorem, ipsum dolor sit amet consectetur adipisicing elit. Esse magni, exercitationem aperiam ipsam placeat, nemo optio molestiae possimus vitae quis eaque, vero laborum pariatur accusantium corporis. Minus quia maiores dolorem!
          </p>
  
          <div className="flex gap-4 mt-8">
            <button onClick={() => navigate('/agendar')} className="bg-white text-neutral-900 font-semibold px-5 py-3 rounded-md">
              AGENDAR CITA
            </button>
            <button className="bg-neutral-800 text-white font-semibold px-5 py-3 rounded-md">
              EXPLORAR SERVICIOS ↓
            </button>
          </div>

        </div>
  
        {/* Columna derecha: imagen */}
        <div className="relative rounded-2xl overflow-hidden">
        <img
            src="/barber.jpg"
            alt="Barbero cortando el cabello a un cliente"
            className="w-full h-[500px] object-cover"
        />

        {/* Marca de agua tipo logo, arriba a la derecha */}
        <div className="absolute top-6 right-6 text-right">
            <p className="text-white text-2xl font-light italic">Nombre</p>
            <p className="text-neutral-300 text-xs tracking-wide">Barberia</p>
        </div>

        {/* Barra inferior con las dos etiquetas */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm flex justify-between items-center px-5 py-3">
            <div className="flex items-center gap-2 text-white text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Tipo de Servicio
            </div>
            <span className="text-neutral-300 text-xs">Producto</span>
        </div>
        </div>
      </section>
    )
  }