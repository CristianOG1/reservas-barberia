import { useEffect } from 'react'
import { Routes, Route, Outlet, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Services from './components/Servicios'
import BookingPage from './pages/BookingPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import ResumenPage from './pages/admin/ResumenPage'
import ServiciosAdmin from './pages/admin/ServiciosAdmin'
import ProductosAdmin from './pages/admin/ProductosAdmin'
import BarberosAdmin from './pages/admin/BarberosAdmin'
import CitasAdmin from './pages/admin/CitasAdmin'
import ProtectedRoute from './components/ProtejerRuta'
import LoginPage from './pages/LoginPage'
import ConfiguracionAdmin from './pages/admin/ConfiguracionAdmin'
import { ConfiguracionProvider } from './context/ConfiguracionProvider'
import ProductosPage from './pages/ProductosPage'
import ContactoPage from './components/Contacto'
import ServicesPage from './pages/ServicesPage'
import Productos from './components/Productos'

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

function App() {
  return (
    <Routes>
      {/* Fuera del layout público: login y todo el panel, sin Navbar. */}
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
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
        <Route path="citas" element={<CitasAdmin />} />
        <Route path="configuracion" element={<ConfiguracionAdmin />} />
      </Route>

      {/* Agendar sigue fuera del layout: es una pantalla completa, sin navbar. */}
      <Route path="/agendar" element={<BookingPage />} />

      <Route element={<LayoutPublico />}>
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
      </Route>
    </Routes>
  )
}

export default App