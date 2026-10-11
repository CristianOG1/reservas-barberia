import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useConfiguracion } from '../../context/useConfiguracion'

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

// El cliente solo tiene una sección por ahora. Si luego agregas más
// (ej. "Mi perfil"), añade el link aquí y su ícono en `iconoNav`.
const links = [
  { to: '/cliente', label: 'Mis citas', fin: true },
]

const iconoNav = {
  'Mis citas': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
}

export default function ClienteDashboard() {
  const { session, logout } = useAuth()
  const { configuracion, cargando: cargandoConfig } = useConfiguracion()

  const [menuAbierto, setMenuAbierto] = useState(false)
  const cerrarMenu = () => setMenuAbierto(false)

  const manejarTeclas = (e) => {
    if (e.key === 'Escape' && menuAbierto) cerrarMenu()
  }

  const nombreBarberia = configuracion.nombre || ''
  const inicial = (nombreBarberia.charAt(0) || 'N').toUpperCase()

  // Nombre del cliente: usa user_metadata si lo guardas al registrarlo
  // (ej. nombre o full_name); si no, cae al correo.
  const email = session?.user?.email || ''
  const nombreCliente =
    session?.user?.user_metadata?.nombre ||
    session?.user?.user_metadata?.full_name ||
    email.split('@')[0] ||
    'Cliente'
  const inicialCliente = (nombreCliente.charAt(0) || '?').toUpperCase()

  // Tarjeta de perfil reutilizada en el panel móvil y en el sidebar
  const tarjetaPerfil = session && (
    <div className="rounded-lg bg-slate-100 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
          {inicialCliente}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-navy">{nombreCliente}</p>
          <p className="truncate text-xs text-slate">{email}</p>
        </div>
      </div>
    </div>
  )

  const clasesLink = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
      isActive ? 'bg-primary text-white' : 'text-slate hover:bg-slate-100 hover:text-navy'
    }`

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row" onKeyDown={manejarTeclas}>
      {/* Capa que cierra el menú al tocar fuera (solo <lg) */}
      {menuAbierto && (
        <div onClick={cerrarMenu} aria-hidden="true" className="fixed inset-0 z-30 bg-navy/20 lg:hidden" />
      )}

      {/* Barra superior móvil */}
      <div className="relative z-40 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
        {configuracion.logo ? (
          <img
            src={configuracion.logo}
            alt={nombreBarberia || 'Logo de la barbería'}
            className="h-9 w-9 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary font-serif text-sm text-white">
            {inicial}
          </div>
        )}
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">
          {cargandoConfig ? 'Cargando…' : nombreBarberia}
        </p>
        <button
          type="button"
          onClick={() => setMenuAbierto((v) => !v)}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          aria-controls="menu-movil-cliente"
          className="rounded-lg border border-slate-200 p-2 text-slate transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {menuAbierto ? <IconoCerrar /> : <IconoHamburguesa />}
        </button>
      </div>

      {/* Panel desplegable móvil */}
      {menuAbierto && (
        <div
          id="menu-movil-cliente"
          className="fixed inset-x-0 top-14 z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-slate-200 bg-white px-3 py-3 lg:hidden"
        >
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate">Mi cuenta</p>
          <div className="space-y-1">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.fin} onClick={cerrarMenu} className={clasesLink}>
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
            Cerrar sesión
          </button>
        </div>
      )}

      {/* Sidebar fijo (solo lg+) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:static lg:flex">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            {configuracion.logo ? (
              <img
                src={configuracion.logo}
                alt={nombreBarberia || 'Logo de la barbería'}
                className="h-9 w-9 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary font-serif text-sm text-white">
                {inicial}
              </div>
            )}
            <div className="min-w-0">
              {cargandoConfig ? (
                <div className="space-y-1.5">
                  <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-slate-100" />
                </div>
              ) : (
                <>
                  <p className="truncate text-sm font-semibold leading-tight text-navy">{nombreBarberia}</p>
                  <p className="text-xs text-slate">Portal del cliente</p>
                </>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate">Mi cuenta</p>
          <div className="space-y-1">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.fin} className={clasesLink}>
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
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex flex-1 flex-col lg:ml-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
            <p className="min-w-0 truncate text-sm text-slate">
              Hola, <span className="font-semibold text-navy">{nombreCliente}</span>
            </p>
            <div className="ml-auto flex items-center gap-2">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-navy transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:inline-flex"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
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
