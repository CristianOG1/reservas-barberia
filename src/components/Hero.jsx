import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Hero() {
  const navigate = useNavigate()
  const { session } = useAuth()

  // Mismo criterio que el Navbar: admin al panel de admin, cliente a su dashboard.
  const user = session?.user
  const userRole = user?.user_metadata?.role || user?.role
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Mi cuenta'

  const irAServicios = () => {
    document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCuenta = () => {
    if (!session) {
      navigate('/login')
    } else if (userRole === 'admin') {
      navigate('/admin')
    } else {
      navigate('/cliente')
    }
  }

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
          Cortes de cabello y arreglo de barba hechos con calma y atención al detalle.
          Elige tu servicio, escoge a tu barbero y reserva tu horario en línea.
        </p>

        <div className="flex flex-wrap gap-4 mt-8">
          <button
            onClick={() => navigate('/agendar')}
            className="bg-white hover:bg-neutral-200 text-neutral-900 font-semibold px-5 py-3 rounded-md transition-colors"
          >
            AGENDAR CITA
          </button>
          <button
            onClick={irAServicios}
            className="bg-neutral-800 hover:bg-neutral-700 text-white font-semibold px-5 py-3 rounded-md transition-colors"
          >
            EXPLORAR SERVICIOS ↓
          </button>
        </div>

        {/* Acceso a la cuenta: iniciar sesión, o ir al dashboard si ya hay sesión */}
        <button
          onClick={handleCuenta}
          className="mt-6 text-sm text-neutral-300 hover:text-white underline underline-offset-4 transition-colors"
        >
          {session
            ? `Hola, ${userName}. Ir a mi panel`
            : '¿Ya tienes cuenta? Iniciar sesión'}
        </button>
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
