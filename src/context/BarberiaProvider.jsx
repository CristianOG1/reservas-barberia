import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { BarberiaContext } from './barberia'
import { resolverSlug } from '../utils/dominio'

/* Dominio del software. Es una VARIABLE DE COMPILACIÓN (`VITE_DOMINIO_BASE`, §14.1),
   no una constante: Vite la incrusta al compilar y así el mismo bundle vale para
   el dominio real y para cualquier entorno de pruebas.
   ⚠ La comparación es SIEMPRE contra este valor. **Nunca cuentes las partes del
   host**: `gools.com.mx` tiene tres etiquetas (`gools`, `com`, `mx`) y una
   barbería serían cuatro, pero `tusoftware.com` tenía dos y una eran tres. Un
   conteo de partes funciona con un dominio y se rompe con el otro. */
/* Resuelve qué barbería corresponde a este host. Devuelve `{ slug, sitioPrincipal }`:
   - `slug` es el de la barbería abierta, o null si aquí no hay ninguna.
   - `sitioPrincipal` es true cuando el host ES el software y no una barbería: el
     dominio pelado, `www.`, un subdominio reservado o demasiados niveles. Ahí no
     se debe caer a `VITE_BARBERIA_SLUG`: el sitio principal es la entrada del
     superadmin, no el kiosko de la primera barbería de la lista. */
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