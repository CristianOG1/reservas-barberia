import React, { Suspense, useEffect } from 'react'
import { Routes, Route, Outlet, Link, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Services from './components/Servicios'
import AdminDashboard from './pages/admin/AdminDashboard'
import ResumenPage from './pages/admin/ResumenPage'
import ServiciosAdmin from './pages/admin/ServiciosAdmin'
import ProductosAdmin from './pages/admin/ProductosAdmin'
import BarberosAdmin from './pages/admin/BarberosAdmin'
import ProtectedRoute from './components/ProtejerRuta'
import LoginPage from './pages/LoginPage'
import ConfiguracionAdmin from './pages/admin/ConfiguracionAdmin'
import { ConfiguracionProvider } from './context/ConfiguracionProvider'
import { BarberiaProvider } from './context/BarberiaProvider'
import { useBarberia } from './context/useBarberia'
import { useAuth } from './context/useAuth'
import ProductosPage from './pages/ProductosPage'
import ContactoPage from './components/Contacto'
import PrivacidadPage from './pages/PrivacidadPage'
import ServicesPage from './pages/ServicesPage'
import Productos from './components/Productos'
import ClienteDashboard from './pages/cliente/ClienteDashboard'
import CitasCliente from './pages/cliente/CitasCliente'
import BarberiasSuper from './pages/superadmin/BarberiasSuper'

// Carga diferida de las rutas más pesadas: se descargan solo cuando el usuario
// navega a ellas. El bundle inicial no las incluye.
const BookingPageLazy = React.lazy(() => import('./pages/BookingPage'))
const CitasAdminLazy = React.lazy(() => import('./pages/admin/CitasAdmin'))
const SuperadminDashboardLazy = React.lazy(() => import('./pages/superadmin/SuperadminDashboard'))

// El router es <Routes> plano, no un data router, así que <ScrollRestoration/> de
// react-router no aplica aquí. Cada navegación pública arranca desde arriba.
function ScrollAlInicio() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

// Layout de las páginas públicas: Navbar arriba + contenido debajo, sobre el mismo
// fondo oscuro. El Navbar vive aquí una sola vez, así que el menú hamburguesa de
// celulares y el estado del menú se heredan en todas las páginas sin duplicar nada.
function LayoutPublico() {
  return (
    <div className="bg-neutral-950 min-h-screen">
      <ScrollAlInicio />
      <Navbar />
      <Outlet />
    </div>
  )
}

// Sin barbería: el sitio principal es la entrada (/login, /superadmin); el resto
// avisa de que la barbería no existe o está de baja. Sin consultar datos.
function BarberiaNoDisponible({ sinSlug, sitioPrincipal, dominioBase }) {
  if (sitioPrincipal) {
    const ejemplo = dominioBase ? `kromatik.${dominioBase}` : 'kromatik.tudominio.com'
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-white">Elige tu barbería</h1>
          <p className="mt-3 text-sm text-neutral-400">
            Cada barbería tiene su propia dirección. Por ejemplo{' '}
            <strong className="text-neutral-200">{ejemplo}</strong>.
          </p>
          <p className="mt-6 text-xs text-neutral-500">
            ¿Ya tienes cuenta? Entra y podrás gestionar tus citas.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block bg-white hover:bg-neutral-200 text-neutral-900 font-semibold px-5 py-3 rounded-md transition-colors"
          >
            INICIAR SESIÓN
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-white">
          Esta barbería no está disponible
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          Revisa la dirección o ponte en contacto con la barbería.
        </p>
        {sinSlug && (
          <p className="mt-6 text-xs text-neutral-500">
            No se pudo determinar la barbería. Define VITE_BARBERIA_SLUG para trabajar en local.
          </p>
        )}
      </div>
    </div>
  )
}

// Primero se resuelve la barbería y solo entonces se montan las rutas: todo el
// árbol de abajo tiene garantizado un `barberia` con id con el que filtrar.
function Contenido() {
  const { cargando, noEncontrada, sinSlug, barberia, sitioPrincipal } = useBarberia()
  const { session, rol, cargandoRol, unirmeABarberia } = useAuth()
  const { pathname } = useLocation()

  // /login y /superadmin no tienen barbería: no deben esperarla ni bloquearse.
  const sinBarberia =
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/superadmin' ||
    pathname.startsWith('/superadmin/')

  // Alta automática de membresía: la RPC es idempotente y revalida el rol en servidor.
  const userId = session?.user?.id
  const barberiaId = barberia?.id

  useEffect(() => {
    if (cargandoRol || !userId || rol !== 'cliente' || !barberiaId) return
    unirmeABarberia(barberiaId).then(({ error }) => {
      if (error) console.error(error)
    })
  }, [userId, rol, cargandoRol, barberiaId, unirmeABarberia])

  if (cargando && !sinBarberia) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <p className="text-neutral-400">Cargando...</p>
      </div>
    )
  }

  if (noEncontrada && !sinBarberia) {
    return (
      <BarberiaNoDisponible
        sinSlug={sinSlug}
        sitioPrincipal={sitioPrincipal}
        dominioBase={import.meta.env.VITE_DOMINIO_BASE || null}
      />
    )
  }

  return (
    <Suspense fallback={<p className="text-slate-500">Cargando...</p>}>
      <Routes>
        {/* Fuera del layout público: login y el panel, sin Navbar.
            `roles` en cada zona: el guard manda al inicio propio si el rol no
            corresponde (cliente en /admin → /cliente, admin en /cliente → /admin). */}
      <Route path="/login" element={<LoginPage />} />

      {/* Zona del superadmin: multi-barbería, sin `ConfiguracionProvider` (esa
          fila es por barbería y aquí no hay ninguna que mostrar). */}
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute roles={['superadmin']}>
            <SuperadminDashboardLazy />
          </ProtectedRoute>
        }
      >
        <Route index element={<BarberiasSuper />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin', 'superadmin']}>
            {/* El provider envuelve todo el layout del admin: el sidebar y la
                página de configuración leen la misma fila. */}
            <ConfiguracionProvider>
              <AdminDashboard />
            </ConfiguracionProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<ResumenPage />} />
        <Route path="servicios" element={<ServiciosAdmin />} />
        <Route path="productos" element={<ProductosAdmin />} />
        <Route path="barberos" element={<BarberosAdmin />} />
        <Route path="citas" element={<CitasAdminLazy />} />
        <Route path="configuracion" element={<ConfiguracionAdmin />} />
      </Route>

      {/* Agendar sigue fuera del layout: es una pantalla completa, sin navbar.
          ConfiguracionProvider para que BookingPage lea bloques_horario y dias_cerrados. */}
      <Route
        path="/agendar"
        element={
          <ConfiguracionProvider>
            <BookingPageLazy />
          </ConfiguracionProvider>
        }
      />

      {/* El Navbar lee useConfiguracion: el layout público necesita el provider. */}
      <Route element={<ConfiguracionProvider><LayoutPublico /></ConfiguracionProvider>}>
        <Route
          index
          element={
            <>
              <Hero />
              <Services />
              <Productos />
            </>
          }
        />
        <Route path="productos" element={<ProductosPage />} />
        <Route path="servicios" element={<ServicesPage />} />
        <Route path="contacto" element={<ContactoPage />} />
        <Route path="privacidad" element={<PrivacidadPage />} />
      </Route>

      <Route
        path="/cliente"
        element={
          <ProtectedRoute roles={['cliente']}>
            <ConfiguracionProvider>
              <ClienteDashboard />
            </ConfiguracionProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<CitasCliente />} />
      </Route>

      </Routes>
    </Suspense>
  )
}

function App() {
  // El provider de barbería va DENTRO de App. AuthProvider sigue donde estaba
  // (main.jsx, envolviendo a App): no se mueve.
  return (
    <BarberiaProvider>
      <Contenido />
    </BarberiaProvider>
  )
}

export default App
