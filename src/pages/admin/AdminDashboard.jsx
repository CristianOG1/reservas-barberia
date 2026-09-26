import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const links = [
  { to: '/admin', label: 'Resumen', fin: true },
  { to: '/admin/servicios', label: 'Servicios'},
  { to: '/admin/productos', label: 'Productos'},
  { to: '/admin/barberos', label: 'Barberos'},
  { to: '/admin/citas', label: 'Citas'},
]

export default function AdminDashboard() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-ink-950 lg:flex">
      {/* Shell: barra superior en <lg, rail lateral en lg+ */}
      <aside className="border-b border-ink-700 bg-ink-900 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        {/* Identidad + logout en móvil */}
        <div className="flex items-center justify-between gap-4 px-4 py-4 lg:block lg:px-5 lg:py-6">
          <div className="min-w-0">
            <p className="font-serif text-lg leading-none text-bone-100">Barberia</p>
            <p className="mt-1 text-xs text-bone-600">Admin</p>
          </div>

          <button
            onClick={logout}
            className="shrink-0 text-xs text-bone-600 hover:text-bone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60 lg:hidden"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Navegación: fila con scroll horizontal en <lg, columna en lg+ */}
        <nav className="flex gap-1 overflow-x-auto px-4 pb-4 lg:flex-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-3 lg:pb-0">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.fin}
              className={({ isActive }) =>
                `flex shrink-0 items-center whitespace-nowrap border-l-2 py-2 pl-3 pr-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60 ${
                  isActive
                    ? 'border-brass-400 text-bone-100'
                    : 'border-transparent text-bone-400 hover:bg-ink-800 hover:text-bone-100'
                }`
              }
            >
            {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout en escritorio, separado por filete */}
        <div className="hidden border-t border-ink-700 p-3 lg:block">
          <button
            onClick={logout}
            className="w-full px-3 py-2 text-left text-sm text-bone-600 hover:bg-ink-800 hover:text-bone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido de la sub-ruta */}
      <main className="min-w-0 flex-1 p-4 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
