import { Routes, Route } from 'react-router-dom'
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
import ServicesPage from './pages/ServicesPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<ResumenPage />} />
        <Route path="servicios" element={<ServiciosAdmin />} />
        <Route path="productos" element={<ProductosAdmin />} />
        <Route path="barberos" element={<BarberosAdmin />} />
        <Route path="citas" element={<CitasAdmin />} />
      </Route>
      <Route
        path="/"
        element={
          <div className="bg-neutral-950 min-h-screen">
            <Navbar />
            <Hero />
            <Services />
          </div>
        }
      />
      <Route path="/servicios" element={<ServicesPage />} />
      <Route path="/agendar" element={<BookingPage />} />
    </Routes>
  )
}

export default App