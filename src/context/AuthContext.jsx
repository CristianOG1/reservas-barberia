// src/context/AuthContext.jsx
// Sesión + ROL. El rol se lee de la tabla `perfiles`, NO de
// `auth.users.user_metadata`: ese campo lo escribe el propio cliente al
// registrarse, así que cualquiera podría pedir 'admin'. La tabla `perfiles` la
// escribe solo el trigger de la BD y no tiene política de escritura desde la app.
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)

  // null = aún no se sabe (o no hay sesión). 'cliente' | 'admin' | 'superadmin'.
  const [rol, setRol] = useState(null)
  const [cargandoRol, setCargandoRol] = useState(true)

  useEffect(() => {
    // Revisa si ya hay una sesión guardada (al recargar la página)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCargando(false)
    })

    // Se suscribe a cambios (login/logout) mientras la app está abierta
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSession(nuevaSesion)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  /* Rol: se relee cada vez que cambia el usuario.
     - Sin sesión: rol null (nadie tiene rol). La consulta se resuelve igualmente
       por `.then()`, nunca de forma síncrona en el cuerpo del efecto.
     - Si la lectura falla o el usuario no tiene fila, cae en 'cliente': es el
       valor por defecto de la BD y el de menor privilegio. */
  useEffect(() => {
    let vigente = true
    const userId = session?.user?.id

    const consulta = userId
      ? supabase.from('perfiles').select('rol').eq('id', userId).maybeSingle()
      : Promise.resolve({ data: null, error: null })

    consulta.then(({ data, error }) => {
      if (!vigente) return
      if (error) console.error(error)
      setRol(userId ? data?.rol ?? 'cliente' : null)
      setCargandoRol(false)
    })

    return () => { vigente = false }
  }, [session?.user?.id])

  const login = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const logout = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, cargando, login, logout, rol, cargandoRol }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)