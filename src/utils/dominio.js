// src/utils/dominio.js
// Resolucion del subdominio de la barberia y del dominio base del software.
//
// Sin dependencias de React: `resolverSlug` lee `import.meta.env`, que en las
// pruebas se sustituye con `vi.stubEnv`.

/* Dominio del software. Es una VARIABLE DE COMPILACIÓN (`VITE_DOMINIO_BASE`),
   no una constante: Vite la incrusta al compilar y así el mismo bundle vale para
   el dominio real y para cualquier entorno de pruebas.
   ⚠ La comparación es SIEMPRE contra este valor. **Nunca cuentes las partes del
   host**: `gools.com.mx` tiene tres etiquetas (`gools`, `com`, `mx`) y una
   barbería serían cuatro, pero `tusoftware.com` tenía dos y una eran tres. Un
   conteo de partes funciona con un dominio y se rompe con el otro. */
export function dominioBase() {
  return String(import.meta.env.VITE_DOMINIO_BASE || '').trim().toLowerCase()
}

/* La dirección de una barbería es `https://<slug>.<VITE_DOMINIO_BASE>`.
   ⚠ **No se deduce del host actual contando sus partes**: `gools.com.mx` tiene tres
   etiquetas y una barbería serían cuatro, mientras que el dominio anterior tenía
   dos y una eran tres. El mismo cálculo era correcto con uno y falso con el otro.
   Ahora el dominio base es una variable de compilación, igual que en
   `BarberiaProvider`: los dos componentes leen la misma fuente y no pueden
   discrepar. Sin la variable no hay dirección que abrir y el botón se deshabilita. */
export function dominioBaseDeBarberias() {
  return String(import.meta.env.VITE_DOMINIO_BASE || '').trim().toLowerCase() || null
}

/* Subdominios que son infraestructura del software, no barberías. Coinciden con
   el check `barberias_slug_valido` de la base y con la lista de `BarberiaForm`:
   si una barbería se llamara `admin`, su sitio no resolvería.
   ⚠ La lista vive en tres sitios (base, formulario y aquí). Si añades uno,
   toca los tres o queda una puerta abierta. */
const SLUGS_RESERVADOS = [
  'www', 'app', 'admin', 'api', 'superadmin', 'mail', 'soporte', 'avisos', 'send',
]

/* Resuelve qué barbería corresponde a este host. Devuelve `{ slug, sitioPrincipal }`:
   - `slug` es el de la barbería abierta, o null si aquí no hay ninguna.
   - `sitioPrincipal` es true cuando el host ES el software y no una barbería: el
     dominio pelado, `www.`, un subdominio reservado o demasiados niveles. Ahí no
     se debe caer a `VITE_BARBERIA_SLUG`: el sitio principal es la entrada del
     superadmin, no el kiosko de la primera barbería de la lista. */
export function resolverSlug(host = window.location.hostname) {
  const h = String(host).toLowerCase()
  const base = dominioBase()

  const deEntorno = () => {
    const valor = import.meta.env.VITE_BARBERIA_SLUG
    return valor ? String(valor).trim().toLowerCase() : null
  }

  // Sin variable de dominio, o en un host que no es el dominio real (localhost,
  // 127.0.0.1, un *.workers.dev, una preview): manda `VITE_BARBERIA_SLUG`, como
  // antes, para poder trabajar en local sin subdominios.
  if (!base || (h !== base && !h.endsWith('.' + base))) {
    return { slug: deEntorno(), sitioPrincipal: false }
  }

  // El dominio pelado (`gools.com.mx`) es la entrada del software.
  if (h === base) return { slug: null, sitioPrincipal: true }

  const sub = h.slice(0, h.length - base.length - 1)
  // 'a.b.gools.com.mx' son demasiados niveles; un reservado es infraestructura.
  if (!sub || sub.includes('.') || SLUGS_RESERVADOS.includes(sub)) {
    return { slug: null, sitioPrincipal: true }
  }
  return { slug: sub, sitioPrincipal: false }
}
