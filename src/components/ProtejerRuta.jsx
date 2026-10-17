import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBarberia } from '../context/useBarberia'
import { rutaInicioPorRol } from '../utils/rutaInicioPorRol'

// Guard de rutas de /admin, /cliente y /superadmin.
// `roles` es la lista de roles permitidos: si no viene, la zona acepta
// cualquier cuenta autenticada (no es el caso de ninguna hoy).
export default function ProtectedRoute({ roles, children }) {
  const { session, cargando, rol, cargandoRol, barberiaId, logout } = useAuth()
  const { barberia, cargando: cargandoBarberia } = useBarberia()

  // La zona del superadmin es la única que NO pertenece a ninguna barbería: se
  // entra desde el dominio principal, sin slug, así que ahí no hay nada que
  // resolver y esperarlo dejaría el panel en "Cargando..." para siempre.
  const esZonaSuperadmin = Array.isArray(roles) && roles.length === 1 && roles[0] === 'superadmin'

  /* Misma trampa que en `LoginPage`: `cargandoRol` no vuelve a `true` cuando
     cambia el usuario, así que durante un login dentro de la app se lee como
     "listo" mientras `rol` sigue siendo el del usuario anterior —`null` si no
     había sesión—. Con sesión pero sin rol todavía se está leyendo, y decidir
     ahí mandaba al superadmin a `/admin`: `roles.includes(null)` falla y el
     `Navigate` de abajo iba a `rutaInicioPorRol(null)`, que es `/admin`. Con
     sesión, `rol` es `null` solo mientras se lee: el contexto siempre termina
     poniendo uno (`data?.rol ?? 'cliente'`). */
  const cargandoRolDeVerdad = cargandoRol || (!!session && !rol)

  // Sesión, rol y barbería llegan por separado: hay que esperar a los tres. Sin
  // el chequeo de barbería, un admin ajeno vería un instante el panel al recargar.
  if (cargando || (session && cargandoRolDeVerdad) || (cargandoBarberia && !esZonaSuperadmin)) {
    // El panel del superadmin es de tema claro; el texto blanco de las zonas
    // oscuras no se vería ahí.
    return <p className={`p-8 ${esZonaSuperadmin ? 'text-slate' : 'text-white'}`}>Cargando...</p>
  }

  if (!session) return <Navigate to="/login" replace />

  // Con sesión pero sin el rol esperado: a su propio inicio, no a /login.
  if (roles && !roles.includes(rol)) {
    return <Navigate to={rutaInicioPorRol(rol)} replace />
  }

  // Un admin solo entra a la barbería de su perfil (perfiles.barberia_id). El
  // superadmin entra a cualquiera. El cliente ya quedó fuera por `roles`.
  if (rol === 'admin' && barberia && barberiaId !== barberia.id) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-navy">
            Esta cuenta no pertenece a esta barbería
          </h1>
          <p className="mt-2 text-sm text-slate">
            Inicia sesión con la cuenta de esta barbería o pídele acceso a su dueño.
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-6 rounded-lg border border-slate-200 px-5 py-2.5 text-sm text-navy hover:bg-slate-100"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return children
}
