// src/pages/superadmin/SuperadminDashboard.jsx
// Shell del panel del superadmin: el dueño del software, que administra TODAS
// las barberías. Misma estructura responsive que AdminDashboard (rail lateral en
// lg+, barra superior con menú hamburguesa en celulares, logout) y el mismo
// sistema visual del panel (slate-50 de fondo, superficies blancas, `primary`).
//
// Lo que NO se copia del admin y por qué:
//  - no lee `configuracion`: esa fila es POR barbería y aquí no hay ninguna;
//  - no lleva el buscador decorativo ni la campana de notificaciones, que en el
//    admin son controles muertos (§18.9, §9.1).
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Identidad del panel. Es la del SOFTWARE, no la de una barbería: aquí no hay
// nombre ni logo que leer. Placeholder pendiente de sustituir por el nombre real
// del producto.
const SOFTWARE = 'Multi-Barbería'
const SOFTWARE_DETALLE = 'Panel del software'

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

const links = [{ to: '/superadmin', label: 'Barberías', fin: true }]

const iconoNav = {
  Barberías: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <path d="M3 21h18"/><path d="M4 21V10l8-6 8 6v11"/><path d="M9 21v-6h6v6"/>
    </svg>
  ),
}

export default function SuperadminDashboard() {
  const { session, logout } = useAuth()

  // Menú desplegable del shell en celulares. En lg+ manda el aside lateral y este
  // estado queda sin efecto visual.
  const [menuAbierto, setMenuAbierto] = useState(false)

  const cerrarMenu = () => setMenuAbierto(false)

  // Escape cierra el menú. Va como handler en el contenedor (no useEffect):
  // funciona siempre que el foco esté dentro del shell, que es justo cuando el
  // menú está abierto. Mismo patrón que AdminDashboard y ClienteDashboard.
  const manejarTeclas = (e) => {
    if (e.key === 'Escape' && menuAbierto) cerrarMenu()
  }

  const inicial = (SOFTWARE.charAt(0) || 'S').toUpperCase()

  // Tarjeta de perfil: el mismo JSX en el rail y en el panel móvil.
  const tarjetaPerfil = session && (
    <div className="rounded-lg bg-slate-100 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
          {session.user?.email?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-navy">{session.user?.email}</p>
          <p className="text-xs text-slate">Superadministrador</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-slate">
          <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
          En línea
        </span>
        <span className="text-xs text-slate">v1.0</span>
      </div>
    </div>
  )

  return (
    // `flex-col` en celular para que la barra de arriba ocupe todo el ancho;
    // en `lg` vuelve a fila para que el rail quede a la izquierda.
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row" onKeyDown={manejarTeclas}>
      {/* Capa invisible que cierra el menú al tocar fuera (solo <lg). */}
      {menuAbierto && (
        <div
          onClick={cerrarMenu}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-navy/20 lg:hidden"
        />
      )}

      {/* Barra superior con identidad + hamburguesa (solo <lg). */}
      <div className="relative z-40 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy font-serif text-sm text-white">
          {inicial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-navy">{SOFTWARE}</p>
          <p className="truncate text-xs text-slate">{SOFTWARE_DETALLE}</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuAbierto((v) => !v)}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          aria-controls="menu-movil-superadmin"
          className="rounded-lg border border-slate-200 p-2 text-slate transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {menuAbierto ? <IconoCerrar /> : <IconoHamburguesa />}
        </button>
      </div>

      {/* Panel desplegable con los links + perfil + logout (solo <lg) */}
      {menuAbierto && (
        <div
          id="menu-movil-superadmin"
          className="fixed inset-x-0 top-14 z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-slate-200 bg-white px-3 py-3 lg:hidden"
        >
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate">
            Administración del software
          </p>
          <div className="space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.fin}
                onClick={cerrarMenu} // cerrar al navegar
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive ? 'bg-primary text-white' : 'text-slate hover:bg-slate-100 hover:text-navy'
                  }`
                }
              >
                {iconoNav[link.label]}
                {link.label}
              </NavLink>
            ))}
          </div>

          {tarjetaPerfil && <div className="mt-3">{tarjetaPerfil}</div>}

          <button
            onClick={logout}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-slate transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Salir de la sesión
          </button>
        </div>
      )}

      {/* Rail lateral (solo lg+): en celular lo reemplaza la barra de arriba */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:static lg:flex">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy font-serif text-sm text-white">
              {inicial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-navy">{SOFTWARE}</p>
              <p className="text-xs text-slate">{SOFTWARE_DETALLE}</p>
            </div>
          </div>
          <span className="mt-3 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber">
            SUPERADMIN
          </span>
        </div>

        <nav className="flex-1 px-3 py-4">
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate">
            Administración del software
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

        <div className="border-t border-slate-200 p-4">
          {tarjetaPerfil && <div className="mb-3">{tarjetaPerfil}</div>}
          <button
            onClick={logout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Salir de la sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex flex-1 flex-col">
        {/* Contexto del panel. En el admin esta franja lleva el buscador
            decorativo; aquí solo dice dónde estamos y deja abrir el sitio. */}
        <header className="hidden border-b border-slate-200 bg-white lg:block">
          <div className="flex h-14 items-center gap-4 px-6">
            <p className="text-sm text-slate">Administración de barberías del software</p>
            <div className="ml-auto flex items-center gap-2">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-navy transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>
                </svg>
                Ver sitio web
              </a>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
