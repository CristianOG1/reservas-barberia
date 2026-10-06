import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const navigate = useNavigate()
  const { session, logout } = useAuth()

  // Extraemos datos del usuario si existe sesión
  const user = session?.user
  const userRole = user?.user_metadata?.role || user?.role
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Mi Cuenta'

  const handleAuthClick = () => {
    if (!session) {
      navigate('/login')
      return
    }

    if (userRole === 'admin') {
      navigate('/admin')
    } else {
      // Redirige al Dashboard del cliente
      navigate('/cliente')
    }
  }

  return (
    <nav className="flex items-center justify-between px-8 py-4 border-b border-neutral-800 bg-neutral-950">
      {/* Logo */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-9 h-9 bg-amber-100 rounded-md flex items-center justify-center text-neutral-900 font-bold">
          K
        </div>
        <div>
          <p className="text-white text-sm font-semibold leading-tight">Nombre Barberia</p>
          <p className="text-neutral-400 text-xs leading-tight">Cortes de Cabello y Barba</p>
        </div>
      </div>

      {/* Links de navegación */}
      <div className="hidden md:flex items-center gap-8 text-sm">
        <Link to="/" className="text-white bg-neutral-800 px-4 py-2 rounded-full">Inicio</Link>
        <a href="servicios" className="text-neutral-300 hover:text-white transition-colors">Servicios</a>
        <a href="productos" className="text-neutral-300 hover:text-white transition-colors">Productos</a>
        <a href="contacto" className="text-neutral-300 hover:text-white transition-colors">Contacto</a>
      </div>

      {/* Sección Derecha (Login / Nombre de usuario + Agendar) */}
      <div className="flex items-center gap-4">
        {/* Botón de Iniciar Sesión o Nombre del Cliente */}
        {session ? (
          <div className="flex items-center gap-3">
            <button 
              onClick={handleAuthClick}
              className="text-amber-400 border border-amber-400/40 hover:bg-amber-400/10 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
              <span>👤</span>
              <span>{userName}</span>
            </button>
            <button 
              onClick={logout} 
              className="text-neutral-400 hover:text-red-400 text-xs underline"
            >
              Salir
            </button>
          </div>
        ) : (
          <button 
            onClick={() => navigate('/login')}
            className="text-neutral-300 hover:text-white text-sm px-3 py-1.5 rounded-md border border-neutral-700 hover:border-neutral-500 transition-colors"
          >
            Iniciar Sesión
          </button>
        )}

        <button 
          onClick={() => navigate('/agendar')} 
          className="bg-white hover:bg-neutral-200 text-neutral-900 text-sm font-semibold px-4 py-2 rounded-md transition-colors"
        >
          AGENDAR CITA
        </button>
      </div>
    </nav>
  )
}