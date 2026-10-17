// src/context/AuthContext.jsx
// Sesión + ROL + barbería del usuario. El rol y la barbería se leen de la tabla
// `perfiles`, NO de `auth.users.user_metadata`: ese campo lo escribe el propio
// cliente al registrarse, así que cualquiera podría pedir 'admin'. La tabla
// `perfiles` la escribe solo el trigger de la BD y no tiene política de
// escritura desde la app.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)

  // null = aún no se sabe (o no hay sesión). 'cliente' | 'admin' | 'superadmin'.
  const [rol, setRol] = useState(null)
  const [cargandoRol, setCargandoRol] = useState(true)
  // barbería del usuario según `perfiles`. Nula para el superadmin y para los
  // clientes: ninguno de los dos pertenece a una sola barbería. El admin la usa
  // para comprobar que está entrando a la suya.
  const [barberiaId, setBarberiaId] = useState(null)

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

  /* Rol y barbería: se releen cada vez que cambia el usuario.
     - Sin sesión: rol null (nadie tiene rol) y barbería null.
     - Si la lectura falla o el usuario no tiene fila, cae en 'cliente': es el
       valor por defecto de la BD y el de menor privilegio. */
  useEffect(() => {
    let vigente = true
    const userId = session?.user?.id

    const consulta = userId
      ? supabase.from('perfiles').select('rol, barberia_id').eq('id', userId).maybeSingle()
      : Promise.resolve({ data: null, error: null })

    consulta.then(({ data, error }) => {
      if (!vigente) return
      if (error) console.error(error)
      setRol(userId ? data?.rol ?? 'cliente' : null)
      setBarberiaId(userId ? data?.barberia_id ?? null : null)
      setCargandoRol(false)
    })

    return () => { vigente = false }
  }, [session?.user?.id])

  const login = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const logout = () => supabase.auth.signOut()

  /* Alta automática de la membresía del cliente en la barbería abierta.
     Decide la RPC, en el servidor: exige sesión, exige que el perfil sea
     'cliente' (admin y superadmin quedan fuera) y exige que la barbería exista
     y esté activa; es idempotente (`on conflict do nothing`).
     Recibe la barbería como parámetro porque AuthProvider vive POR ENCIMA de
     BarberiaProvider y no puede conocerla. `useCallback` con deps vacías: la
     identidad tiene que ser estable, o el efecto que la llama en App.jsx se
     dispararía en cada render. */
  const unirmeABarberia = useCallback(
    (barberiaId) =>
      barberiaId
        ? supabase.rpc('unirme_a_barberia', { p_barberia_id: barberiaId })
        : Promise.resolve({ error: null }),
    []
  )

  return (
    <AuthContext.Provider value={{ session, cargando, login, logout, rol, cargandoRol, barberiaId, unirmeABarberia }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
