import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { BarberiaContext } from './barberia'
import { resolverSlug } from '../utils/dominio'

// El slug se resuelve contra VITE_DOMINIO_BASE (variable de compilación): nunca
// cuentes partes del host, gools.com.mx tiene 3 etiquetas. sitioPrincipal = el
// dominio pelado, www. o reservado: entrada del superadmin, sin caer al slug por defecto.
export function BarberiaProvider({ children }) {
  // El slug se resuelve una sola vez: no cambia mientras la página está abierta.
  const [{ slug, sitioPrincipal }] = useState(resolverSlug)
  const [barberia, setBarberia] = useState(null)
  const [cargando, setCargando] = useState(!!slug)
  // Sin barbería que mostrar. Incluye el sitio principal: `Contenido` elige la
  // pantalla con `sitioPrincipal`, no con este flag (`sinSlug` no encaja ahí).
  const [noEncontrada, setNoEncontrada] = useState(!slug)

  useEffect(() => {
    if (!slug) return
    let vigente = true
    // La política de `barberias` solo deja ver las ACTIVAS: una barbería de baja
    // simplemente no vuelve, y eso es justo lo que queremos (no disponible).
    supabase
      .from('barberias')
      .select('id, nombre, slug')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) console.error(error)
        setBarberia(data ?? null)
        setNoEncontrada(!data)
        setCargando(false)
      })
    return () => { vigente = false }
  }, [slug])

  const valor = {
    barberia,          // { id, nombre, slug } o null
    cargando,          // true mientras se resuelve el slug
    noEncontrada,      // true si no hay barbería que mostrar (inexistente, de baja o sitio principal)
    slug,              // el slug con el que se está trabajando (o null)
    sinSlug: !slug,    // true si ni el subdominio ni VITE_BARBERIA_SLUG dieron nada
    sitioPrincipal,    // true si el host es el software (dominio pelado, www o reservado)
  }

  return (
    <BarberiaContext.Provider value={valor}>
      {children}
    </BarberiaContext.Provider>
  )
}