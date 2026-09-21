import { useNavigate } from 'react-router-dom'
export default function Navbar() {
  const navigate = useNavigate()
  return (
    
    <nav className="flex items-center justify-between px-8 py-4 border-b border-neutral-800">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-amber-100 rounded-md flex items-center justify-center text-neutral-900 font-bold">
          K
        </div>
        <div>
          <p className="text-white text-sm font-semibold leading-tight">Nombre Barberia</p>
          <p className="text-neutral-400 text-xs leading-tight">Cortes de Cabello y Barba</p>
        </div>
      </div>

      {/* Links */}
      <div className="hidden md:flex items-center gap-8 text-sm">
        <a href="#" className="text-white bg-neutral-800 px-4 py-2 rounded-full">Inicio</a>
        <a href="#" className="text-neutral-300 hover:text-white">Servicios</a>
        <a href="#" className="text-neutral-300 hover:text-white">Productos</a>
        <a href="#" className="text-neutral-300 hover:text-white">Contacto</a>
      </div>

      {/* Derecha */}
      <div className="flex items-center gap-4">
        <span className="hidden lg:block text-neutral-300 text-sm">+00 00000000</span>
        <button onClick={() => navigate('/agendar')} className="bg-white text-neutral-900 text-sm font-semibold px-4 py-2 rounded-md">
          AGENDAR CITA
        </button>
      </div>
    </nav>
  )
}