import { useState } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Íconos del menú móvil. SVG inline: el proyecto no usa librerías de iconos.
function IconoHamburguesa() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

function IconoCerrar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

// Fuente única de los links: la usan la fila de `md+` y el panel de `<md`, así que
// no pueden desincronizarse. `fin: true` solo en "Inicio" para que no quede activo
// en el resto de rutas públicas.
const enlaces = [
  { to: '/', label: 'Inicio', fin: true },
  { to: '/servicios', label: 'Servicios' },
  { to: '/productos', label: 'Productos' },
  { to: '/contacto', label: 'Contacto' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const { session, logout } = useAuth()

  // Extraemos datos del usuario si existe sesión
  const user = session?.user
  const userRole = user?.user_metadata?.role || user?.role
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Mi Cuenta'

  // Menú desplegable en celulares; en md+ queda oculto y no se monta nada.
  const [menuAbierto, setMenuAbierto] = useState(false)

  const cerrarMenu = () => setMenuAbierto(false)

  const handleAuthClick = () => {
    cerrarMenu()
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

  const irA = (destino) => () => {
    cerrarMenu()
    navigate(destino)
  }

  // Escape cierra el menú. Va como handler en el <nav> (no useEffect): funciona
  // siempre que el foco esté dentro, que es justo cuando el menú está abierto.
  const manejarTeclas = (e) => {
    if (e.key === 'Escape' && menuAbierto) cerrarMenu()
  }

  const irAlInicio = () => {
    cerrarMenu()
    navigate('/')
  }

  return (
    <nav
      onKeyDown={manejarTeclas}
      className="relative z-40 border-b border-neutral-800 bg-neutral-950"
    >
      <div className="relative z-40 flex items-center justify-between gap-4 px-4 py-4 md:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={irAlInicio}>
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
          {enlaces.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.fin}
              className={({ isActive }) =>
                isActive
                  ? 'text-white bg-neutral-800 px-4 py-2 rounded-full'
                  : 'text-neutral-300 hover:text-white transition-colors'
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Sección Derecha (Login / Nombre de usuario + Agendar) */}
        <div className="hidden md:flex items-center gap-4">
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

        {/* Hamburguesa (solo <md) */}
        <button
          type="button"
          onClick={() => setMenuAbierto((v) => !v)}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          aria-controls="menu-movil-publico"
          className="rounded-md border border-neutral-700 p-2 text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 md:hidden"
        >
          {menuAbierto ? <IconoCerrar /> : <IconoHamburguesa />}
        </button>
      </div>

      {/* Capa invisible que cierra el menú al tocar fuera (solo <md).
          Va en z-30, por debajo del panel y de la propia barra (z-40). */}
      {menuAbierto && (
        <div
          onClick={cerrarMenu}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
        />
      )}

      {/* Panel desplegable (solo <md) */}
      {menuAbierto && (
        <div className="relative z-40 border-t border-neutral-800 md:hidden">
          <div
            id="menu-movil-publico"
            className="flex flex-col gap-1 px-4 py-4"
          >
            {enlaces.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.fin}
                onClick={cerrarMenu}
                className={({ isActive }) =>
                  isActive
                    ? 'rounded-md px-3 py-2.5 text-sm font-medium text-white bg-neutral-800 transition-colors'
                    : 'rounded-md px-3 py-2.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white'
                }
              >
                {l.label}
              </NavLink>
            ))}

            {/* Teléfono */}
            <a
              href="tel:+0000000000"
              onClick={cerrarMenu}
              className="rounded-md px-3 py-2.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
            >
              +00 00000000
            </a>

            {session ? (
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-neutral-800 pt-3">
                <button
                  onClick={handleAuthClick}
                  className="flex items-center gap-2 rounded-md border border-amber-400/40 px-3 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-400/10"
                >
                  <span>👤</span>
                  <span className="truncate">{userName}</span>
                </button>
                <button
                  onClick={() => { cerrarMenu(); logout() }}
                  className="shrink-0 text-xs text-neutral-400 underline transition-colors hover:text-red-400"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={irA('/login')}
                className="mt-2 w-full rounded-md border border-neutral-700 px-3 py-2.5 text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
              >
                Iniciar Sesión
              </button>
            )}

            <button
              onClick={irA('/agendar')}
              className="mt-1 w-full rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-200"
            >
              AGENDAR CITA
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}