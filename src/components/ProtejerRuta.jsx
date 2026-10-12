import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { rutaInicioPorRol } from '../utils/rutaInicioPorRol'

// Guard de rutas de /admin y /cliente.
// `roles` es la lista de roles permitidos: si no viene, la zona acepta
// cualquier cuenta autenticada (no es el caso de ninguna hoy).
export default function ProtectedRoute({ roles, children }) {
  const { session, cargando, rol, cargandoRol } = useAuth()

  // Sesión y rol llegan por separado: hay que esperar a los dos.
  if (cargando || (session && cargandoRol)) {
    return <p className="text-white p-8">Cargando...</p>
  }

  if (!session) return <Navigate to="/login" replace />

  // Con sesión pero sin el rol esperado: a su propio inicio, no a /login.
  if (roles && !roles.includes(rol)) {
    return <Navigate to={rutaInicioPorRol(rol)} replace />
  }

  return children
}