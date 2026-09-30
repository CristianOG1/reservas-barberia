import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const links = [
  { to: '/admin', label: 'Resumen', fin: true },
  { to: '/admin/citas', label: 'Gestión de Citas' },
  { to: '/admin/servicios', label: 'Gestión de Servicios' },
  { to: '/admin/productos', label: 'Gestión de Productos' },
  { to: '/admin/barberos', label: 'Gestión de Barberos' },
]

const iconoNav = {
  Resumen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  'Gestión de Citas': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>,
  'Gestión de Servicios': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  'Gestión de Productos': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  'Gestión de Barberos': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
}

export default function AdminDashboard() {
  const { logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar fijo */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white lg:static">
        {/* Logo + identidad */}
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white font-serif text-sm">
              NB
            </div>
            <div>
              <p className="text-sm font-semibold text-navy leading-tight">Noble Blade</p>
              <p className="text-xs text-slate">Barbería Atelier</p>
            </div>
          </div>
          <span className="mt-3 inline-block rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary">
            ADMIN SUITE
          </span>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4">
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate">
            Operaciones Principales
          </p>
          <div className="space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.fin}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-slate hover:bg-slate-100 hover:text-navy'
                  }`
                }
              >
                {iconoNav[link.label]}
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Perfil + logout */}
        <div className="border-t border-slate-200 p-4">
          {/* <div className="mb-3 rounded-lg bg-slate-100 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-white text-sm font-semibold">
                A
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-navy">admin@kromatik.com</p>
                <p className="text-xs text-slate">Administrador</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                En línea
              </span>
              <span className="text-xs text-slate">v1.0</span>
            </div>
          </div> */}
          <button
            onClick={logout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Salir de la sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex flex-1 flex-col lg:ml-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
            {/* Buscador */}
            <div className="relative flex-1 max-w-lg">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </span>
              <input
                type="search"
                placeholder="Buscar clientes, citas, servicios o stock..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-16 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm text-navy transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:inline-flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
                Ver sitio web público
              </a>
              {/* Notificaciones */}
              <button className="relative rounded-lg border border-slate-200 p-2 text-slate transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Notificaciones">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-600" />
              </button>
              {/* Perfil */}
              {/* <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Mi perfil">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                  A
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-medium text-navy">admin@kromatik.com</p>
                  <p className="text-[11px] text-slate">Administrador</p>
                </div>
              </button> */}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}