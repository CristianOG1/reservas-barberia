import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { session, cargando } = useAuth()

  if (cargando) return <p className="text-white p-8">Cargando...</p>
  if (!session) return <Navigate to="/login" replace />

  return children
}