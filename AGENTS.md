# AGENTS.md — Barbería (Kromatik)

> Contexto permanente para agentes que trabajan en este repositorio.
> Todo lo que sigue fue verificado leyendo el código del repo. No hay suposiciones.
> Si algo de este documento deja de ser cierto, actualiza **este** archivo.

---

## 1. Propósito del proyecto

Sitio web de una **barbería** (cortes de cabello y barba) con tres partes:

- **Sitio público**: landing page con hero y catálogos (servicios y productos), y un
  flujo de reserva de citas en 3 pasos (`/agendar`).
- **Panel de administración** (`/admin`): protegido por autenticación, para dar de
  alta/editar/borrar **servicios**, **productos** y **barberos**, y para **gestionar
  las citas** (ver detalle y cambiar su estado).
- **Portal del cliente** (`/cliente`): protegido por el mismo `ProtectedRoute`
  (cualquier cuenta autenticada entra; ver trampa de roles en §5 y §18.14). El
  cliente autenticado ve solo **sus** citas (`cliente ve sus citas`, §10.5) y puede
  cancelarlas o reagendarlas vía RPC.

Datos y autenticación viven 100% en **Supabase**. No hay backend propio: es una SPA
que habla directo con Supabase desde el navegador.

El proyecto es de origen académico (ruta `.../Universidad/Ingenieria/Decimo/Nora/barberia`).

---

## 2. Stack tecnológico

Verificado en `package.json`:

| Pieza | Versión | Rol |
|---|---|---|
| `react` / `react-dom` | `^19.2.8` | UI |
| `vite` | `^8.3.0` | bundler / dev server |
| `@vitejs/plugin-react` | `^6.1.1` | plugin de React (usa Oxc) |
| `react-router-dom` | `^7.18.4` | routing |
| `@supabase/supabase-js` | `^2.116.0` | datos + auth + storage |
| `tailwindcss` + `@tailwindcss/vite` | `^4.3.3` | estilos |

Devdeps de lint: `@eslint/js` `^10.0.1`, `eslint` `^10.10.0`,
`eslint-plugin-react-hooks` `^7.1.1`, `eslint-plugin-react-refresh` `^0.5.6`,
`globals` `^17.12.0`, `@types/react` / `@types/react-dom`.

Características del stack que importan:

- **Gestor de paquetes: pnpm** (existe `pnpm-lock.yaml`). Usa `pnpm`, no `npm`/`yarn`.
- **TypeScript: NO.** Hay `@types/*` en devdeps pero el proyecto es JS/JSX puro.
  No hay `tsconfig.json`, no hay archivos `.ts`/`.tsx`.
- **Tailwind v4**: se activa por plugin de Vite (`vite.config.js`). **No existe
  `tailwind.config.js`** — no lo busques ni lo crees. Todo el CSS del proyecto es
  Tailwind inline en `className`. `src/index.css` contiene el `@import "tailwindcss";`
  más un bloque `@theme` con los tokens del dashboard (§11).
- **No hay gestor de estado** (sin Redux/Zustand/Jotai). Solo `useState`, `useContext`,
  `useEffect` y props.
- **No hay tests.** No hay script de test, ni runners, ni archivos de test.
  No hay error boundaries.
- **No hay variables de entorno más allá de las dos de Supabase** (ver §10).
- Existe un `dist/` (build previo) y está en `.gitignore`.

---

## 3. Arquitectura

SPA de 3 capas, sin capa de servicio intermedia. Los componentes hablan directo
con el cliente de Supabase.

```
index.html  (#root)
   └─ src/main.jsx
        <StrictMode>
          <BrowserRouter>            ← único punto donde se crea el router
            <AuthProvider>           ← contexto de sesión, envuelve TODO
              <App />                ← BrowserRouter + <Routes>
```

`src/main.jsx` (418 bytes) monta exactamente eso e importa `./index.css`.

`src/App.jsx` es el **único** archivo que define rutas. No hay `createBrowserRouter`,
ni `loaders`, ni `actions`, ni data fetching en el router: son `<Route>` + `<Routes>`
de `react-router-dom` v7 y componentes que hacen `useEffect`.

**Hay tres layouts, todos como `<Route>` con `<Outlet/>`** (2026-10):

- `LayoutPublico` (local en `src/App.jsx`, sin `path`): `bg-neutral-950 min-h-screen`
  + `<ScrollAlInicio />` + `<Navbar />` + `<Outlet />`. Aloja **`/` (índice),
  `/servicios`, `/productos` y `/contacto`**. El Navbar vive **una sola vez** aquí,
  así que el menú hamburguesa se hereda en todas las páginas sin duplicar estado ni
  lógica.
- `AdminDashboard` (`src/pages/admin/AdminDashboard.jsx`): layout de `/admin`, dentro
  de `<ProtectedRoute>` + `<ConfiguracionProvider>`, con su propio rail.
- `ClienteDashboard` (`src/pages/cliente/ClienteDashboard.jsx`): layout de `/cliente`
  (con `path="/cliente"`), también dentro de `<ProtectedRoute>` +
  `<ConfiguracionProvider>`, con rail lateral y menú hamburguesa. Es una copia ligera
  del shell del admin: mismos tokens, pero sin la búsqueda ni el badge "ADMIN SUITE"
  y con un solo link ("Mis citas"). §9.6.

⚠ `/login` y `/agendar` quedan **fuera** de `LayoutPublico` a propósito: login no
debe llevar navbar y `/agendar` es pantalla completa sin navbar (§5). No los muevas
dentro.

`ScrollAlInicio` (local en `src/App.jsx`) hace `window.scrollTo(0, 0)` en un
`useEffect` con dependencia `[pathname]`. Existe porque el router es `<Routes>` plano:
el `<ScrollRestoration/>` de react-router v7 solo funciona con data routers, que aquí
no hay. **No lo sustituyas por `<ScrollRestoration/>`** sin migrar antes a
`createBrowserRouter`. Solo se monta dentro del layout público, así que navegar en el
admin no resetea el scroll.

⚠ Ninguna página debe volver a importar `Navbar` por su cuenta: se duplicaría.
`Contacto.jsx` lo importaba y se le quitó en 2026-10.

### Grafo de dependencias (verificado con CodeGraph)

```
App.jsx
├── LayoutPublico (local)               → layout sin path, envuelve las 4 rutas públicas
│   ├── ScrollAlInicio (local)          → window.scrollTo(0,0) en cada cambio de ruta
│   ├── Navbar                          → una sola vez, en todas las públicas
│   └── Outlet
│       ├── index: Hero, Servicios, Productos → "/"
│       ├── ServicesPage                → /servicios
│       ├── ProductosPage               → /productos
│       └── ContactoPage (Contacto.jsx) → /contacto
├── BookingPage                        → /agendar (FUERA del layout, sin navbar)
├── LoginPage                          → /login   (FUERA del layout, sin navbar)
├── ProtectedRoute (ProtejerRuta.jsx)
│   └── AdminDashboard                 → layout de "/admin"
│       ├── Outlet
│       ├── ResumenPage                → /admin         (índice)
│       ├── ServiciosAdmin → ServicioForm → /admin/servicios
│       ├── ProductosAdmin  → ProductoForm → /admin/productos
│       ├── BarberosAdmin  → BarberoForm   → /admin/barberos
│       ├── CitasAdmin                    → /admin/citas
│       └── ConfiguracionAdmin            → /admin/configuracion
└── ProtectedRoute (mismo guard, §18.14)
    └── ClienteDashboard               → layout de "/cliente"
        └── Outlet
            └── CitasCliente           → /cliente (índice)

AuthProvider (main.jsx)
└── useAuth()  consumido por: ProtejerRuta, LoginPage, AdminDashboard,
    ClienteDashboard, CitasCliente, Navbar y BookingPage

useConfirmarCita (src/hooks)
└── usado por ResumenPage y CitasAdmin, no por CitasCliente (que se sirve de RPC)

supabaseClient (singleton)
└── importado por: BookingPage, BookingForm, Servicios (público), Productos (público),
    ProductosPage, ServicesPage, AuthContext, ConfiguracionProvider, LoginPage (signUp),
    CitasCliente, useConfirmarCita y los 6 archivos de pages/admin que tocan datos
```

⚠ **`Productos.jsx` (el público) ya NO es código muerto**: `App.jsx` lo monta en el
índice de `/`, entre `<Servicios />` y el layout. Lo aviva el pull 853ca9f..8809213.
`BookingForm.jsx` sigue siendo código muerto.

⚠ El `Navbar` **solo** lo importa `src/App.jsx`. Ninguna página pública lo monta por
su cuenta (antes lo hacía `Contacto.jsx` y quedaba duplicado dentro del layout).

⚠ `BookingForm.jsx` sigue insertando como `anon` (la política `Cualquiera puede
agendar` la sigue admitiendo), pero **desalinea con el modelo vigente**: la cita
queda sin `cliente_id` (el portal `/cliente` no la ve) y sin las validaciones de
`BookingPage`. Si se resucita ese modal hay que rehacerle el payload y el flujo de
sesión.

---

## 4. Estructura de carpetas

```
barberia/
├── .claude/ .cursor/ .kiro/ .vscode/   config de editores/agentes (solo MCP de codegraph)
├── .codegraph/                         índice de CodeGraph (ignorado por git)
├── supabase/
│   └── functions/
│       └── enviar-recordatorios/
│           └── index.ts               Edge Function de recordatorios (§10.7).
│                                       **Único código fuera de `src/`.** Sin
│                                       secretos: los lee del entorno. Se despliega
│                                       con el MCP, no con la CLI.
├── public/
│   ├── barber.jpg                      2.2 MB — imagen del hero
│   ├── favicon.svg
│   └── icons.svg                       sin referencias en el código
├── src/
│   ├── main.jsx                        entry point
│   ├── App.jsx                         rutas
│   ├── supabaseClient.js               singleton createClient
│   ├── index.css                       @import "tailwindcss"
│   ├── App.css                         ⚠ CÓDIGO MUERTO (CSS del template Vite, no se importa)
│   ├── assets/                         hero.png, react.svg, vite.svg — sin uso
│   ├── context/
│   │   ├── AuthContext.jsx             AuthProvider + useAuth
│   │   ├── configuracion.js            solo `createContext` (partido en 3 archivos, §9.1)
│   │   ├── ConfiguracionProvider.jsx   carga la fila id = 1 de `configuracion`
│   │   └── useConfiguracion.js         hook del contexto de configuración
│   ├── hooks/
│   │   └── useConfirmarCita.js         confirmar con optimistic update (§9.7)
│   ├── components/
│   │   ├── Navbar.jsx                  nav pública (layout público) + hamburguesa <md
│   │   ├── Hero.jsx                    hero de la landing
│   │   ├── Servicios.jsx               grid de servicios DESDE Supabase
│   │   ├── Productos.jsx               grid de productos DESDE Supabase (ya se usa en "/")
│   │   ├── Contacto.jsx                página /contacto completa (exporta ContactoPage)
│   │   ├── BookingForm.jsx             ⚠ CÓDIGO MUERTO (no importado, superseded por BookingPage)
│   │   └── ProtejerRuta.jsx            ProtectedRoute (roles /admin y /cliente)
│   ├── utils/
│   │   └── rutaInicioPorRol.js        ruta de inicio según el rol (helper único, §5)
│   └── pages/
│       ├── BookingPage.jsx             wizard de 3 pasos (985 líneas, el más grande)
│       ├── LoginPage.jsx               login + registro (signUp) + retorno con `volverA`
│       ├── ServicesPage.jsx            página /servicios (catálogo con datos de la BD)
│       ├── ProductosPage.jsx           página /productos (catálogo con filtros y stock)
│       ├── cliente/
│       │   ├── ClienteDashboard.jsx    layout de /cliente: rail + hamburguesa (199 líneas)
│       │   └── CitasCliente.jsx        "Mis citas": listado, cancelar y reagendar (352 líneas)
│       └── admin/
│           ├── AdminDashboard.jsx      layout: <aside> + <NavLink> + <Outlet> + logout
│           ├── ResumenPage.jsx         tarjetas de totales + citas de la semana
│           ├── ServiciosAdmin.jsx      catálogo: métricas, filtros, tabla + CSV
│           ├── ServicioForm.jsx        modal alta/edición/detalle (tema claro)
│           ├── ProductosAdmin.jsx      CRUD
│           ├── ProductoForm.jsx        modal alta/edición
│           ├── BarberosAdmin.jsx       CRUD
│           ├── BarberoForm.jsx         modal alta/edición
│           ├── CitasAdmin.jsx          agenda: métricas, filtros, tabla + acciones
│           ├── CitaManualForm.jsx      modal alta manual / reprogramar
├── .env                                credenciales Supabase (gitignored)
├── .gitignore  .mcp.json  opencode.jsonc
├── eslint.config.js  vite.config.js  index.html
├── package.json  pnpm-lock.yaml
└── AGENTS.md                           este archivo
```

### Código muerto — antes de "limpiar", pregunta

| Archivo | Estado | Nota |
|---|---|---|
| `src/components/BookingForm.jsx` | no importado | Modal simple de agendar; `BookingPage` lo reemplazó. Inserta `{nombre, telefono, servicio, fecha, hora}` **sin `cliente_id`**, así que esa cita no aparece en el portal `/cliente`. Además su `<select>` de servicios es una lista hardcodeada de 4 nombres que ya no coinciden con `servicios.nombre`. |
| `src/App.css` | no importado | CSS del template de Vite, con nesting. Inerte. |
| `src/assets/*` | sin uso | `hero.png`, `react.svg`, `vite.svg` |
| `public/icons.svg` | sin uso | |

⚠ **`src/components/Productos.jsx` salió de esta lista en 2026-10**: el pull
`853ca9f..8809213` lo conectó a la landing (`App.jsx` lo monta en el índice de `/`)
y le pasó a leer de Supabase. **No lo borres.** Ya no es código muerto.

⚠ `ServiciosPage.jsx`, `ProductosPage.jsx` y `Contacto.jsx` **no** son código muerto
aunque parezca raro: son las páginas de `/servicios`, `/productos` y `/contacto`, y
`Contacto.jsx` vive en `components/` (no en `pages/`).

No los borres ni los "refactorices" por tu cuenta: son trabajo guardable del usuario.

---

## 5. Rutas

Definidas todas en `src/App.jsx` (4 bloques de `<Route>`: rutas sueltas, el layout
público, el panel y el portal del cliente):

| Ruta | Elemento | Auth | Notas |
|---|---|---|---|
| `/login` | `<LoginPage />` | — | **Fuera** de todo layout, sin navbar. Login **y registro** (`signUp`). Tras login: `volverA` → si no, `role === 'admin'` → `/admin`, y si no → `/` |
| `/agendar` | `<BookingPage />` | confirmar sí | **Fuera** del layout público, pantalla completa sin navbar. Confirmar **exige sesión**: sin ella guarda un borrador en `sessionStorage` y manda a `/login` (§8) |
| — | `<LayoutPublico />` = `<ScrollAlInicio />` + `<Navbar />` + `<Outlet />` | — | layout sin `path`; envuelve las 4 rutas de abajo. Fondo `bg-neutral-950 min-h-screen` |
| `/` (índice del layout) | `<Hero /><Servicios /><Productos />` | — | los tres leen de Supabase |
| `/servicios` | `<ServicesPage />` | — | catálogo con datos de la BD; la navbar lo marca activo |
| `/productos` | `<ProductosPage />` | — | catálogo con filtro, búsqueda, orden y `stock`; la navbar lo marca activo |
| `/contacto` | `<ContactoPage />` (en `src/components/Contacto.jsx`) | — | mapa embebido + sedes; la navbar lo marca activo |
| `/admin` | `<ProtectedRoute roles={['admin','superadmin']}><ConfiguracionProvider><AdminDashboard /></…>` | ✅ | layout con `<Outlet/>` |
| `/admin` (index) | `<ResumenPage />` | ✅ | |
| `/admin/servicios` | `<ServiciosAdmin />` | ✅ | |
| `/admin/productos` | `<ProductosAdmin />` | ✅ | |
| `/admin/barberos` | `<BarberosAdmin />` | ✅ | |
| `/admin/citas` | `<CitasAdmin />` | ✅ | |
| `/admin/configuracion` | `<ConfiguracionAdmin />` | ✅ | |
| `/cliente` | `<ProtectedRoute roles={['cliente']}><ConfiguracionProvider><ClienteDashboard /></…>` | ✅ | layout con `<Outlet/>`; **no** comparte componente con `AdminDashboard`, es una copia (§9.6) |
| `/cliente` (index) | `<CitasCliente />` | ✅ | es la única sub-ruta por ahora |
| `/superadmin` | **no existe** | — | solo reservado en la documentación: el dashboard multi-barbería se hará más adelante. El superadmin entra a `/admin` |

⚠ El `<Navbar />` de las 4 rutas públicas lo monta **solo** `LayoutPublico`. Si una
página lo importa por su cuenta aparece duplicado (le pasó a `Contacto.jsx`).

⚠ `/login` y `/agendar` están **deliberadamente** fuera del layout. No los muevas
dentro: login no lleva navbar y `/agendar` es una pantalla completa.

⚠ `ServiciosPage`, `ProductosPage` y `ContactoPage` conservan su propio
`<div className="bg-neutral-950 min-h-screen …">` de raíz. Es redundante con el del
layout (mismo color) pero produce un `min-h-screen` **anidado**: en páginas cortas el
alto total es navbar + 100vh. No se tocó porque el cambio era solo de envoltura; si
alguna vez sobra scroll, quita ese `min-h-screen` de la raíz de la página.

⚠ `App.jsx` no tiene ruta `*` (404) ni catch-all: una URL desconocida queda en blanco.

No hay redirección de la raíz a otra parte.

### El sistema de roles (3 roles)

| Rol | Dónde entra | Qué puede hacer |
|---|---|---|
| `superadmin` | `/admin` (de momento) | Dueño del software. **Solo hay 1** y hoy es la misma cuenta que el admin del negocio (`23302011@utfv.edu.mx`). Su dashboard multi-barbería **no existe** todavía |
| `admin` | `/admin` | Dueño de la barbería: todo lo del panel. **Hoy 0 cuentas** con este rol |
| `cliente` | `/cliente` | Se registra en `/login`, y ve, cancela y reagenda **sus** citas |

El rol vive en la tabla **`perfiles`** (§10.2), **nunca** en `auth.users.user_metadata`:
ese campo lo escribe el propio cliente al registrarse, así que era auto-asignable.
Desde el 2026-10-12 **ningún archivo lee `user_metadata.role`** (verificado: 0
coincidencias).

`src/utils/rutaInicioPorRol.js` es el **helper único** que decide a dónde va cada rol.
Los tres que lo necesitan lo usan y **no deciden por su cuenta**:

```js
export function rutaInicioPorRol(rol) {
  return rol === 'cliente' ? '/cliente' : '/admin'
}
```

`superadmin` y `admin` caen en `/admin`; `cliente` en `/cliente`; y **cualquier valor
desconocido o `null` cae en `/cliente`**, el de menor privilegio (fail-safe). Si añades
un cuarto rol, actualiza aquí **y** las listas `roles` de `App.jsx`.

### `ProtectedRoute` (`src/components/ProtejerRuta.jsx`)

```jsx
const { session, cargando, rol, cargandoRol } = useAuth()
if (cargando || (session && cargandoRol)) return <p className="text-white p-8">Cargando...</p>
if (!session) return <Navigate to="/login" replace />
if (roles && !roles.includes(rol)) return <Navigate to={rutaInicioPorRol(rol)} replace />
return children
```

- Recibe `roles`: lista de roles admitidos. `/admin` → `['admin','superadmin']`,
  `/cliente` → `['cliente']`. Si `roles` no viene, acepta cualquier cuenta.
- Espera **dos** cosas: que la sesión esté resuelta (`cargando`) y que el rol esté
  leído (`cargandoRol`). Sin el segundo chequeo, un cliente que recarga en `/admin`
  vería un instante el panel antes de ser expulsado.
- Sin sesión → `/login`. Con sesión y rol incorrecto → **a su propio inicio**
  (`rutaInicioPorRol`), no a `/login`: así un admin que teclea `/cliente` aterriza en
  `/admin` sin pasar por el login.
- El **nombre del archivo tiene un typo** (`ProtejerRuta.jsx`, no `ProtectedRoute.jsx`).
  Se importa como `import ProtectedRoute from './components/ProtejerRuta'`. **No lo
  renombres** sin actualizar el import en `App.jsx`.
- ⚠ El guard **no es la única defensa**: la autorización real está en RLS (§10.5).
  Que el guard expulse a un cliente del panel es cortesía de UX; que no pueda escribir
  en el catálogo es la base de datos. No aflojes la una creyendo la otra.

---

## 6. Componentes importantes

### 6.1 `src/supabaseClient.js` (6 líneas, íntegro)

```js
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = createClient(supabaseUrl, supabaseKey)
```

Singleton exportado. **Único punto de contacto con Supabase.** Nota: este es el único
archivo del proyecto que usa comillas dobles y punto y coma (heredado del template).

### 6.2 `src/context/AuthContext.jsx` (69 líneas, íntegro)

Expone `{ session, cargando, login, logout, rol, cargandoRol }` y un hook `useAuth()`.

- Al montar: `supabase.auth.getSession()` → setea `session` y `cargando = false`.
- Se suscribe con `supabase.auth.onAuthStateChange(...)` y limpia con
  `listener.subscription.unsubscribe()` en el cleanup del `useEffect`.
- `login(email, password)` → `supabase.auth.signInWithPassword` (devuelve la respuesta
  completa de Supabase, **no** lanza).
- `logout()` → `supabase.auth.signOut()`.
- **`rol`** y **`cargandoRol`** salen de un **segundo `useEffect`** con dependencia
  `[session?.user?.id]`:

```js
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
```

Reglas que cumple ese bloque, no las rompas:
- **El rol se lee de `perfiles`, no de `user_metadata`.** `user_metadata` lo escribe el
  cliente al registrarse, así que era auto-asignable (§18.39).
- **`null` = no hay sesión**, no "rol desconocido". Sin sesión, `rol` es `null`.
- **Si la lectura falla o no hay fila → `'cliente'`**: es el default de la BD y el de
  menor privilegio.
- La consulta se resuelve siempre por `.then()` (nunca `setState` síncrono en el
  cuerpo del efecto: dispara `react-hooks/set-state-in-effect`). El caso "sin sesión"
  se resuelve con `Promise.resolve()` para que **no haya dos caminos de setState**.
- Se relee en cada cambio de usuario (login, logout, cambio de cuenta), no una sola vez.

`AuthProvider` está montado en `main.jsx`, **fuera** de `App`. Moverlo dentro de `App`
o de `BrowserRouter` rompe el guard de rutas.

⚠ Sigue teniendo **1 error de lint** (`react-refresh/only-export-components`, línea 69):
el archivo exporta `AuthProvider` y `useAuth`. No lo "arregles" de paso; si hay que
partirlo, el contexto de configuración ya sirve de patrón (§9.1).

### 6.3 `src/pages/LoginPage.jsx` (121 líneas)

Formulario controlado de email + password **con modo registro**. `handleSubmit`
previene el default, pone `cargando` y bifurca según `esRegistro`:

- **Registro** (`esRegistro === true`): `supabase.auth.signUp({ email, password,
  options: { data: { full_name: nombre, role: 'cliente' } } })`. ⚠ El `role` lo elige
  **el propio cliente** y no se valida en el servidor: cualquiera que se registre
  puede pedir `admin` (§18.39). Si el registro va bien muestra
  `"¡Cuenta creada con éxito! Ya puedes iniciar sesión."` y **vuelve al modo login**
  (no entra solo). Si falla, muestra `registerError.message` **crudo**.
- **Login**: `const { data, error } = await login(email, password)`. Si hay `error`
  muestra el texto fijo **"Correo o contraseña incorrectos."**; si no, decide el
  destino en este orden:
  1. `location.state?.volverA` → navega ahí (lo usa `/agendar` al pedir sesión, §8);
  2. `role === 'admin'` → `/admin`;
  3. si no → `/`.

El texto del botón de login es `'Procesando...'` mientras `cargando`, y el de
registro `'Registrarme'`. El botón de abajo alterna entre "Regístrate aquí" y
"¿Ya tienes cuenta? Inicia sesión" y limpia `error`/`mensaje`.

Cuando viene de `/agendar` con `volverA` seteado, muestra arriba un aviso ámbar:
*"Inicia sesión o crea tu cuenta para confirmar tu cita. Tu selección está guardada."*

### 6.4 `src/components/` — sitio público

- **`Navbar.jsx`** — logo "K" + "Nombre Barberia" / "Cortes de Cabello y Barba"; links
  `Inicio / Servicios / Productos / Contacto`; botón `AGENDAR CITA` →
  `navigate('/agendar')`. **En `md+` es una fila estática** (los links y la sección
  derecha con `hidden md:flex`). **En `<md` hay hamburguesa**: estado `menuAbierto`,
  panel desplegable con los 4 links, el teléfono `+00 00000000` (`href="tel:..."`), la
  sesión y `AGENDAR CITA`. La constante de módulo `enlaces` es la fuente única de los
  links y la usan tanto la fila de `md+` como el panel; cada uno es un `NavLink`
  (`fin: true` solo en "Inicio"), así que **el link de la ruta actual se marca activo**
  y `react-router` pone `aria-current="page"`.
  El botón de cuenta (`handleAuthClick`) manda a `/login` sin sesión, a `/admin` si
  `role === 'admin'` y a **`/cliente`** en cualquier otro caso.
- **`Hero.jsx`** — dos columnas (`md:grid-cols-2`): a la izquierda el texto con dos
  CTA (`navigate('/agendar')` y `irAServicios`, que hace
  `document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })` — el
  destino es el `id="servicios"` de `<Servicios />`), y debajo un botón de cuenta que
  sigue la misma regla de rol que el `Navbar` (`/login` · `/admin` · `/cliente`),
  mostrando "Hola, {userName}. Ir a mi panel" si hay sesión. A la derecha,
  `/barber.jpg` en un contenedor `relative rounded-2xl overflow-hidden` con marca de
  agua y barra inferior (`absolute ... bg-black/70 backdrop-blur-sm`).
- **`Servicios.jsx`** — **desde Supabase** (`select('*').order('created_at', ascending: true)`),
  **no** hardcodeado: `cargando` / `error` (con botón "Reintentar" que vuelve a llamar
  `cargarServicios`) / vacío / grid `sm:grid-cols-2 lg:grid-cols-4`. Cada tarjeta es un
  `<button>` que navega a `` `/agendar?servicio=${encodeURIComponent(s.nombre)}` `` —
  **pero ese query param no lo lee nadie** (§18.3). Raíz `<section id="servicios" className="scroll-mt-4">`
  para que el CTA del Hero pueda hacer scroll. Link inferior **"VER TODOS LOS
  SERVICIOS →"** → `/servicios` (ruta real, no `href="#"`).
- **`Productos.jsx`** — gemelo de `Servicios.jsx` para productos (`id="productos"`,
  `created_at` ascendente, mismos 4 estados, grid `sm:grid-cols-2 lg:grid-cols-4`).
  Muestra `formatoPrecio()` (`$1,234 MXN`), la categoría y el texto **"SOLO EN
  TIENDA"** en vez de un botón de compra: no hay checkout. Link inferior → `/productos`.
- **`Contacto.jsx`** — **no es un componente suelto**: es la página completa de
  `/contacto` y exporta `ContactoPage`. Contiene dos `<iframe>` de Google Maps con
  filtro CSS en línea, sedes, garantías y CTAs a `/agendar`. ⚠ Los datos de las sedes
  son placeholders vacíos (nombre, dirección, horarios, teléfono, `mapQuery` en
  blanco), así que los mapas apuntan a una búsqueda de cadena vacía.
- **`BookingForm.jsx`** — código muerto, ver §4.

### 6.5 `src/pages/BookingPage.jsx` — ver §8 completo

### 6.6 `src/pages/admin/` — ver §9

---

## 7. Convenciones de código

Observadas de forma consistente en el código existente:

**Lenguaje y formato**
- JSX/JS puro. Sin tipos, sin `PropTypes`, sin JSDoc.
- **Comillas simples** y **sin punto y coma** (única excepción: `supabaseClient.js`).
- Imports en el orden del template: `react` → `react-router-dom` → componentes →
  supabase.
- Rutas de import **con extensión** cuando son `.jsx` (`./App.jsx`), sin extensión
  cuando son `.js` (`../supabaseClient`).
- `export default function Nombre() {}` para componentes; `export const useAuth = ...`
  para el hook del contexto.

**Nomenclatura — todo en español**
- Estado y handlers: `cargando`, `datos`, `citas`, `form`, `errorMsg`, `guardando`,
  `mostrarForm`, `xEditando`, `citaSeleccionada`, `estadoEnvio`, `pasoActual`.
- Funciones: `cargarDatos`, `cargarCitas`, `cargarServicios`, `handleSubmit`,
  `handleChange`, `handleEliminar`, `handleConfirmar`, `abrirNuevo`, `abrirEditar`,
  `alGuardar`, `cambiarEstado`, `toggleDisponible`.
- Props de los modales: `{ x, onClose, onGuardado }`.
- **Mezcla de español e inglés**: `cargando` vs `loading`, `onGuardado` vs `onSubmit`,
  `citas` vs `data`. No normalices esto sin avisar.

**Estilos**
- Cero CSS por componente. Tailwind v4 inline en `className`, a menudo en
  template literals con ternarios:
  ```jsx
  className={`bg-neutral-900 border rounded-xl p-4 ${
    seleccionado ? 'border-sky-500' : 'border-neutral-800'
  }`}
  ```
- Comentarios en español, y liberally; algunos en inglés
  (`// count: 'exact', head: true → solo trae el número, no las filas (más rápido)`).
- Sin variables de CSS propias, sin `theme`, sin configuración de Tailwind.

**Patrones de componentes**
- Nada de `memo`, nada de `useCallback`, nada de `useReducer`.
- Los datos viven en `useState` dentro de cada página y se recargan con un
  `cargarX()` manual. No hay caché, no hay invalidación, no hay revalidación.
- Los modales se montan condicionalmente: `{mostrarForm && <XForm ... />}`.

---

## 8. Flujo de citas (wizard de `BookingPage.jsx`)

`/agendar` → `BookingPage`. Un solo componente de **985 líneas** (el más grande del
repo) con un wizard de 3 pasos controlado por `pasoActual` (`1 | 2 | 3`), un sidebar
de resumen pegajoso y un modal de confirmación final.

### Constantes de módulo

```js
const PASOS = ['Servicio', 'Fecha & Hora', 'Tus Datos']   // el stepper de arriba
const BLOQUES = [ { titulo: 'Mañana (10:00 – 13:00)', horas: ['10:00','11:00','11:50','12:40'] },
                  { titulo: 'Tarde (14:00 – 18:00)',  horas: ['14:30','15:20','16:00','17:30'] },
                  { titulo: 'Noche (18:30 – 20:00)', horas: ['18:30'] } ]
const ETIQUETAS_DIA = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM']
```

`BLOQUES` es la única fuente de horarios y **sigue hardcodeado**: no hay modelo de
slots (§18.6). Las horas están en **24 h** porque `citas.hora` es
`time without time zone` (§10.5); el AM/PM es solo `formato12h()` para mostrar.

Los **días ya no son fijos**: `dias` es un `useMemo` que genera los 7 días de la
semana a partir de `semanaBase` (con `lunesDe()`), marca `pasado`, `esHoy` y `cerrado`
(domingo) y el encabezado `etiquetaMes` se calcula con `toLocaleDateString('es-MX')`
tomando el **día 3** de la semana (para no etiquetar mal los meses a caballo). Se navega
semana a semana con `moverSemana(±1)`, y no se puede ir a una semana anterior a la
actual (`lunesActual`).

### Estado del componente

```js
serviciosElegidos, productosElegidos, barberoElegido,   // selección múltiple
fechaElegida ('YYYY-MM-DD'), horaElegida ('HH:MM' 24 h), pasoActual, semanaBase,
form = { nombre, telefono, correo, notas },
mostrarResumen,                       // modal de confirmación final
horasOcupadas, estadoEnvio, borrador  // 'idle' | 'enviando' | 'error' | 'slot' | 'exito'
const total = totalServicios + totalProductos
```

### Lecturas desde Supabase (3 efectos al montar)

| Qué | Consulta |
|---|---|
| Servicios | `from('servicios').select('nombre, categoria, descripcion, costo, duracion, imagen').order('nombre')` |
| Productos | `from('productos').select('id, nombre, categoria, descripcion, precio, imagen').order('created_at', {ascending:false})` |
| Barberos | `from('barberos').select('id, nombre, especialidad, imagen').eq('disponible', true)` |
| Horas ocupadas | RPC `horas_ocupadas({ fecha_consulta, barbero_id })`, en un efecto que depende de `[fechaElegida, barberoIdElegido]` |

Cada efecto usa el patrón `let vigente = true` + `.then(({data, error}) => { if (!vigente)
return … })` para no setear estado tras desmontar.

### Paso a paso

1. **Paso 1 — "01. ELECCIÓN DE SERVICIO" + "02. BARBERO" + productos.** Multi-select de
   servicios (`alternarServicio` por `nombre`), tarjetas de barbero con "Cualquier
   barbero" como opción por defecto (`elegirBarbero`), y la sección de productos
   **opcional** que solo se renderiza si `productos.length > 0`. "Siguiente →" se
   habilita con ≥1 servicio.
2. **Paso 2 — "03. SELECCIÓN DE FECHA & TURNO".** Grid `grid-cols-7` de días
   (`disabled` si `pasado || cerrado`) y los chips de `BLOQUES`; una hora ya ocupada o
   ya pasada queda `disabled` con `title="Horario no disponible"`.
3. **Paso 3 — "04. TITULAR DE LA CITA".** Formulario en `grid sm:grid-cols-2`: nombre*,
   teléfono*, correo* y notas (opcional). Solo tiene "← Atrás".

⚠ La numeración visible ("01", "02", "03", "04") **no** coincide con los 3 pasos del
stepper: el bloque de barberos comparte pantalla con el paso 1 pero está rotulado
"02". Es cosmético, no funcional (§18.40).

### Sesión obligatoria + borrador

**Explorar y elegir es libre; confirmar exige sesión.** `requiereLogin()` es el punto
único que lo aplica:

```js
const requiereLogin = () => {
  if (cargandoSesion) return true                 // aún no sabemos: solo espera
  if (session) return false
  guardarBorrador({ … })                          // sessionStorage
  navigate('/login', { state: { volverA: '/agendar' } })
  return true
}
```

- El borrador (`sessionStorage`, clave `borradorReserva`) guarda servicios, productos,
  barbero, fecha, hora, paso, formulario y `semanaBase`, con
  `VIGENCIA_BORRADOR_MS = 2h`. `leerBorrador()` se corre **una sola vez** al montar
  (`useState(leerBorrador)`) y **descarta fecha y hora si el día ya pasó**.
- `borrarBorrador()` se llama solo cuando el insert sale bien.
- El botón del sidebar cambia de texto: con sesión "CONFIRMAR RESERVACIÓN →", sin
  sesión "INICIAR SESIÓN PARA RESERVAR →" (+ la nota "Guardamos lo que elegiste: al
  iniciar sesión regresas aquí para confirmar.").
- `LoginPage` lee `location.state.volverA` y vuelve a `/agendar` (§6.3).
- ⚠ Los tres efectos leen `session` pero **solo para el gate**: el listado de servicios,
  productos, barberos y horas ocupadas es público (`anon`), no depende de la sesión.

### Envío — `handleConfirmar()`

```js
if (requiereLogin()) return                       // seguro extra: el modal abierto no inserta sin sesión
setEstadoEnvio('enviando')
let barberoId = barberoIdElegido
if (!barberoId) {                                 // "Cualquier barbero" → auto-asignación
  const { data } = await supabase.rpc('asignar_barbero', { fecha_consulta, hora_consulta })
  barberoId = data || null
}
const { error } = await supabase.from('citas').insert([{
  nombre, telefono, correo, notas,
  servicio: serviciosElegidos.map(s => s.nombre).join(', '),   // texto, no FK
  productos: productosElegidos.map(p => ({ nombre: p.nombre, precio: Number(p.precio) || 0 })),
  fecha: fechaElegida, hora: horaElegida,        // 'YYYY-MM-DD' local, 'HH:MM' 24 h
  total,                                          // servicios + productos
  barbero_id: barberoId,
  cliente_id: session.user.id,                   // ← nuevo en 2026-10
}])
```

- El botón del sidebar **no inserta**: solo abre el modal de confirmación. El insert
  ocurre en "Confirmar reservación" dentro de ese modal; el otro botón ("Agregar otro
  servicio o producto") lo cierra y vuelve al paso 1 conservando la selección.
- `estadoEnvio === 'exito'` hace **early return** de la pantalla de confirmación con
  `<Link to="/">Volver al inicio</Link>`.
- `error.code === '23505'` (índice `citas_slot_unico`): limpia la hora, recarga las
  horas ocupadas, **cierra el modal y vuelve al paso 2** (la hora ya no es válida).
- ⚠ `cliente_id` **no tiene FK ni `NOT NULL`**: las citas antiguas siguen en `null` y
  el portal `/cliente` no las muestra (§18.41).

### Trampas verificadas en este flujo (no las "arregles" sin avisar)

1. **`Servicios.jsx` pasa `?servicio=` y `BookingPage` no lo lee.** No hay
   `useSearchParams` en el archivo (verificado: 0 coincidencias). El query param se
   ignora y el paso 1 arranca sin preseleccionar nada. §18.3.
2. **`BLOQUES` está hardcodeado.** No hay tabla de horarios ni slots: cambiar la
   agenda del salón exige editar la constante. `CitasCliente` **duplica** el mismo
   arreglo para el modal de reagendar (§18.42).
3. **Una cita con varios servicios ocupa un solo horario.** `citas_slot_unico` es
   `(fecha, hora, barbero_id)`: marcar "Corte + Barba" a las 11:00 no bloquea las
   12:10. La duración acumulada solo se usa para *mostrar* y para `estaEnCurso` del
   admin. §18.6.
4. **Domingo cerrado** está duplicado: `dias` usa `date.getDay() === 0` en `BookingPage`
   y `CitasCliente` recalcula `esDomingo` con `new Date(fecha + 'T00:00:00').getDay()`.
   No hay tabla de días cerrados, así que cambiar el horario del salón hay que
   hacerlo en dos archivos.
5. El payload de `citas` que inserta el `BookingForm.jsx` muerto es **distinto**
   (`{nombre, telefono, servicio, fecha, hora}`, sin `correo`/`productos`/`total`/
   `cliente_id`). Si resucitas ese componente, actualiza su payload primero.

---

## 9. Dashboard (`/admin`)

### 9.1 `AdminDashboard.jsx` — layout

Array `links` (constante de módulo) de 6 entradas `{ to, label, fin }`; `fin: true` en
"Resumen" mapea a `end` de `NavLink` para que no quede activo en las subrutas. Clase
dinámica con `className={({ isActive }) => ...}`. El ícono de cada link sale del mapa
`iconoNav[link.label]` (SVG inline, sin librerías). La identidad de la tienda (nombre +
logo) viene de `useConfiguracion()`, con esqueleto `animate-pulse` mientras carga.

Raíz: `flex min-h-screen flex-col bg-slate-50 lg:flex-row`, con `onKeyDown` en el
contenedor para cerrar el menú con `Escape`.

**Es responsive con un único `useState` (`menuAbierto`), usado solo en `<lg`:**

- `lg+`: rail lateral `fixed ... lg:static lg:flex lg:w-64`, nav en columna, perfil +
  logout al pie separado por `border-t border-slate-200`.
- `<lg`: barra superior `lg:hidden` con la identidad (logo/nombre desde
  `configuracion`) y el botón hamburguesa; al pulsarlo se despliega un panel
  `fixed inset-x-0 top-14` con los 6 links, la tarjeta de perfil y el logout.
- El panel se cierra con: clic en un link, clic en la capa exterior
  (`fixed inset-0 z-30 bg-navy/20 lg:hidden`) o `Escape` (handler `onKeyDown`).
  **No hay `useEffect` para escuchar teclado ni `document.addEventListener`**: el
  `Escape` solo responde con el foco dentro del shell, que es justo cuando el menú
  está abierto.
- El botón hamburguesa lleva `aria-label` dinámico ("Abrir menú" / "Cerrar menú"),
  `aria-expanded` y `aria-controls="menu-movil-admin"`; los paneles y los `<a>` de la
  barra usan `focus-visible:ring-2 focus-visible:ring-primary`.
- El logout sigue existiendo **una sola vez por tamaño**: en el `<aside>` de `lg+` y en
  el panel móvil. Ya no se duplica dentro del mismo breakpoint.
- Los íconos de hamburguesa y de cerrar son componentes locales
  (`IconoHamburguesa` / `IconoCerrar`), SVG inline con `aria-hidden`.

Indicador de ruta activa: fondo `bg-primary text-white` sobre el link activo
(inactivo: `text-slate hover:bg-slate-100 hover:text-navy`).

`main`: `flex-1 p-4 lg:p-6` que aloja el `<Outlet />`. La barra superior de búsqueda
sigue siendo decorativa (no filtra nada).

### 9.2 `ResumenPage.jsx`

Presentación actual: título `font-serif text-3xl text-bone-100 mb-8`; las 4
tarjetas en `grid grid-cols-2 gap-4 sm:grid-cols-4 mb-10`, cada una
`bg-ink-900 border border-ink-700 rounded-lg p-5` con la cifra en
`font-serif text-3xl tabular-nums text-bone-100` y la etiqueta en
`text-sm text-bone-600`. **El antiguo `<p className="text-2xl mb-2">{t.icono}</p>`
ya no existe** (§18, punto 18).

"Citas de esta semana" es un panel `bg-ink-900 border border-ink-700 rounded-lg`
con un **rail vertical**: línea de 1px `before:w-px before:bg-ink-700` (con
`last:before:hidden`) y un nodo `h-2.5 w-2.5 rounded-full` por cita, coloreado
según `colorEstado` (§9.5). Antes era una lista plana con `border-b`.

`cargarDatos()` hace **un `Promise.all` de 4 conteos** con
`select('*', { count: 'exact', head: true })` (solo el número, no las filas):

| Métrica | Consulta |
|---|---|
| Servicios | `from('servicios').select('*', {count:'exact', head:true})` |
| Productos | `from('productos')…` |
| Barberos activos | `from('barberos')….eq('disponible', true)` |
| Citas totales | `from('citas')…` |

Y un segundo bloque, "Citas de esta semana": `hoy = new Date().toISOString().split('T')[0]`
y `enUnaSemana = now + 7 días`, con `.gte('fecha', hoy).lte('fecha', enUnaSemana).order('fecha')`.

Guard de carga: `if (cargando) return <p className="text-white">Cargando...</p>` (return
temprano). Los valores se leen con `|| 0` para no romper si `count` llega `null`.

### 9.3 Patrón CRUD compartido (Servicios / Productos / Barberos)

Los tres son **estructuralmente idénticos**. Si agregas una entidad, copia este patrón:

```jsx
const [datos, setDatos] = useState([])
const [cargando, setCargando] = useState(true)
const [mostrarForm, setMostrarForm] = useState(false)
const [xEditando, setXEditando] = useState(null)

useEffect(() => { cargarX() }, [])

const cargarX = async () => {
  setCargando(true)
  const { data } = await supabase.from('x').select('*').order('created_at', { ascending: false })
  setX(data || [])
  setCargando(false)
}

const handleEliminar = async (id) => {
  if (!confirm('¿Eliminar este x?')) return
  await supabase.from('x').delete().eq('id', id)
  cargarX()
}

const abrirNuevo  = () => { setXEditando(null); setMostrarForm(true) }
const abrirEditar = (x) => { setXEditando(x);   setMostrarForm(true) }
const alGuardar   = () => { setMostrarForm(false); cargarX() }
```

Diferencias reales entre ellos:
- `BarberosAdmin` además tiene `toggleDisponible(barbero)`: **optimistic update** local
  (`setBarberos(barberos.map(...))`) y luego `update({ disponible }).eq('id', ...)`.
- `handleEliminar` es idéntico en los tres y usa `confirm()` nativo.
- Orden: los tres ordenan por `created_at` descendente.

⚠ **El patrón de lógica se conserva; la presentación ya no es compartida.**
`ServiciosAdmin` y `ProductosAdmin` usan **tabla + barra de filtros + paginación**.
`BarberosAdmin` usa **tarjetas** en grid (`sm:grid-cols-2 lg:grid-cols-3`) porque cada
barbero lleva avatar, rating, switch y contador de citas: una tabla no le cabe. Los tres
están ya en el sistema claro (`slate-*`/`navy`/`primary`); **no queda ningún token del
tema viejo (`cream-*`, `coffee-*`, `terracotta-*`, `ink-*`, `bone-*`) en
`src/pages/admin/`**. Copia la lógica de aquí y el lenguaje visual de §11 / del hermano
ya rediseñado, nunca al revés.

#### `ServiciosAdmin.jsx` (diseño actual)

- Header: eyebrow `SERVICIOS`, `h1` "Catálogo de Servicios", y a la derecha
  "Exportar Carta" (outline) + "+ Agregar Nuevo Servicio" (`bg-primary`).
- 3 métricas (`grid grid-cols-2 gap-4 lg:grid-cols-3`): catálogo, tarifa promedio y
  duración promedio. Esta última **parsea `duracion`** con `aMinutos()`, porque la
  columna es TEXT y puede traer `'30'` o `'50 min'`.
- Barra de filtros idéntica a `ProductosAdmin`: buscador + select de categorías +
  contador "Mostrando X–Y de Z registros".
- Tabla de 5 columnas con `overflow-x-auto` + `min-w-[760px]`, y paginación que
  **solo aparece si hay más de una página** (igual que Productos).
- El punto de color de la categoría sale de `COLORES_CATEGORIA` indexado por
  `categorias.indexOf(s.categoria)` — el mismo truco que en Productos.
- **"Exportar Carta" sí hace algo**: arma un CSV de los servicios **filtrados** en el
  navegador (`Blob` + `a.download`), con `;` como separador y BOM `\uFEFF` para que
  Excel en español respete acentos. Se deshabilita si el filtro no deja filas.
- **"Ver" abre el mismo `ServicioForm` con `soloLectura`** (§9.4): no hay vista de
  detalle en el proyecto y un ícono muerto sería un control roto.

#### `BarberosAdmin.jsx` (tarjetas, sistema claro)

- Tarjeta: `rounded-xl border border-slate-200 bg-white p-5` en
  `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`.
- Avatar `h-14 w-14 rounded-full overflow-hidden bg-slate-100` con punto de estado
  `absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white`.
- Barra de búsqueda + filtro segmentado (`p-0.5` con botones `bg-primary` al activo),
  el mismo segmented control que usan los tabs de estado de `CitasAdmin`.
- Título de página: `font-serif text-3xl text-navy`.

**Switch de disponibilidad (solo `BarberosAdmin`)**

Control real, no un texto ni un pill. Es un `<button type="button">` con
`role="switch"` y `aria-checked={b.disponible}`, y la etiqueta visible
"Disponible para Citas" hace de nombre accesible.

- Pista: `relative inline-flex h-5 w-9 rounded-full` → `bg-slate-300` inactivo,
  `bg-primary` activo; knob `h-3.5 w-3.5 rounded-full bg-white` que viaja con
  `translate-x-1` / `translate-x-4`.
- `BarberoForm` reutiliza el mismo control (§9.4). Si añades un switch nuevo,
  copia ese markup, no improvises otro.

### 9.4 Los tres modales (`ServicioForm`, `ProductoForm`, `BarberoForm`)

Gemelos estructurales. Contrato: `({ x, onClose, onGuardado })`, con
`const esEdicion = !!x` para el título y para elegir update vs insert.

Flujo de `handleSubmit` (idéntico en los tres):

```js
e.preventDefault(); setGuardando(true); setErrorMsg(null)
try {
  const urlImagen = await subirImagenSiHay()                        // 1. storage
  const payload = { ...form, costo: Number(form.costo), imagen: urlImagen }  // 2. cast numérico
  const { error } = esEdicion
    ? await supabase.from('x').update(payload).eq('id', x.id)
    : await supabase.from('x').insert([payload])
  if (error) throw error
  onGuardado()
} catch (err) { console.error(err); setErrorMsg('Algo salió mal, intenta de nuevo.'); setGuardando(false) }
```

`subirImagenSiHay()` — **no sube si no hay archivo nuevo**, conserva la imagen existente:

```js
if (!archivoImagen) return x?.imagen || null
const nombreArchivo = `<carpeta>/${Date.now()}-${archivoImagen.name}`
const { error } = await supabase.storage.from('imagenes').upload(nombreArchivo, archivoImagen)
if (error) throw error
const { data } = supabase.storage.from('imagenes').getPublicUrl(nombreArchivo)
return data.publicUrl
```

Carpetas: `servicios/`, `productos/`, `barberos/`. La vista previa es local con
`URL.createObjectURL(file)` y **nunca se revoca** (fuga menor preexistente).
Placeholder de imagen: `https://placehold.co/80x80?text=%20`.

Estructura del modal: overlay `fixed inset-0 z-50 flex items-center justify-center
bg-black/50 p-4`. El `<form>`:

```
flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto
rounded-xl border border-slate-200 bg-white p-5 sm:p-6
```

⚠ Los cuatro formularios (`ServicioForm`, `CitaManualForm`, `ProductoForm`,
`BarberoForm`) están ya en el tema claro (`bg-white`, `border-slate-200`,
`rounded-xl`, `soloCampo` compartida). Si añades un modal nuevo, copia `ServicioForm`
completo: es la referencia.

Presentación común (la vigente, la de `ServicioForm`):

- Cabecera: eyebrow `text-xs uppercase tracking-widest text-amber` + título
  `font-serif text-lg text-navy` con `esEdicion ? 'Editar X' : 'Nuevo X'`, y una
  línea `text-xs text-slate` de ayuda.
- **Cada campo tiene label visible** encima: `<label htmlFor="…"
  className="block text-sm text-slate">` + `*` en los obligatorios. Los inputs
  llevan `id` para que la asociación sea real. No dependas del placeholder para
  explicar el campo.
- Input / `textarea` / `select`, con la clase compartida `soloCampo` declarada
  arriba del `return`: `mt-1 w-full rounded-lg border border-slate-200 bg-slate-50
  px-3 py-2.5 text-sm text-navy outline-none placeholder:text-slate-400
  focus:border-primary focus:ring-2 focus:ring-primary-100` (+ `resize-none` en el
  `textarea`, `tabular-nums` en precio y duración).
- Foco: borde + anillo `primary`. El `outline-none` nunca va solo.
- Input de archivo: label + `<input type="file">` con el botón estilizado vía
  variantes `file:` (`file:rounded-md file:border-0 file:bg-slate-100 file:px-3
  file:py-1.5 file:text-sm file:text-navy hover:file:bg-slate-200`).
- Botón **Guardar**: `flex-1 rounded-lg bg-primary px-5 py-2.5 text-sm
  font-semibold text-white` con `hover:bg-[#1a38a0]` y `disabled:opacity-50`.
  Texto `{guardando ? 'Guardando...' : 'Guardar'}`.
- Botón **Cancelar**: `rounded-lg border border-slate-200 px-5 py-2.5 text-sm
  text-navy` con `hover:bg-slate-100`. Es secundario, no compite con Guardar.
- Mensaje de error: `<p role="alert" className="text-sm text-red-600">`. El texto
  sigue siendo el genérico de `handleSubmit`.
- En `ServicioForm`, Tarifa y Duración van en `grid gap-4 sm:grid-cols-2` para que
  en móvil apilen en vez de comprimirse.
- `ServicioForm` acepta `soloLectura`: mismo formulario con los campos
  `disabled` + `disabled:bg-slate-100`, sin selector de archivo y con un único
  botón "Cerrar". Es lo que sirve el ícono "Ver" de la tabla.

**Switch "Disponible" (solo `BarberoForm`)**

Sustituye al `<input type="checkbox">` nativo. Es el **mismo control que
`BarberosAdmin`** (§9.3): `<button type="button" role="switch"
aria-checked={form.disponible} onClick={() => setForm({ …form, disponible:
!form.disponible })}>`, pista `relative inline-flex h-5 w-9 rounded-full`
(`bg-slate-300` inactivo / `bg-primary` activo), knob `h-3.5 w-3.5 rounded-full
bg-white` que viaja con `translate-x-1` / `translate-x-4`.

La etiqueta es **"Disponible para Citas"** (idéntica a la de `BarberosAdmin`), y
deliberadamente **no** "Disponible desde que se crea": el mismo control sirve para
crear y para editar, y ese texto mentía al editar. El switch va dentro de un bloque
`rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3` para que se lea como
opción de configuración y no como texto suelto.

**El valor que va a Supabase no cambió**: el campo sigue siendo `form.disponible`
(booleano) y `payload` sigue haciendo `{ ...form, imagen: urlImagen }`. Lo único
que cambió es el control visual.

### 9.5 `CitasAdmin.jsx` — "Gestión de Citas & Calendario del Salón"

**La página más grande del panel.** Rediseñada por completo en el sistema `slate/primary/
amber/navy`. Ya **no** usa el rail + panel de detalle ni los tokens `ink-*`/`bone-*`/
`brass-*`/`sage-*`/`muted-blue-*`/`cancelled-*` (esa descripción ya no aplica; el código
antiguo quedó replaced). Estructura, con las 5 secciones marcadas por comentarios
`SECCIÓN N` en el propio archivo:

| Sección | Contenido |
|---|---|
| 1 · Header | Eyebrow `text-amber` + `h1` `font-serif text-3xl` + subtítulo, y a la derecha el CTA `bg-primary` |
| 2 · Métricas | 4 tarjetas `rounded-xl border-slate-200 bg-white p-5`, `grid-cols-2 lg:grid-cols-4` |
| 3 · Controles | Navegador de fecha (`<` / `Hoy` / `>` + etiqueta en `font-serif`), select de barbero, toggle de vista, y los tabs de estado en el header de la tabla |
| 4 · Tabla | 6 columnas, `overflow-x-auto` + `min-w-[800px]`, y paginación real (8 por página) |
| 5 · Panel inferior | `grid gap-4 md:grid-cols-2`: distribución semanal y recordatorios |

⚠ **Esta página no habla de sillones.** Ni badge de capacidad, ni tarjeta de sillones, ni
columna "Sillón", ni % de ocupación: se pidió quitarlo y **no se usa `sillon_numero` /
`sillon_nombre`**. La duración de la columna "Sillón" del prompt original se resolvió
resolviendo el servicio contra el catálogo, no leyendo el sillón del barbero.

#### Datos y reglas de negocio

- Los 4 estados (`pendiente`, `confirmada`, `completada`, `cancelada`) **no cambian**.
  `estadoDe(cita)` centraliza el `|| 'pendiente'` porque **`estado` es nullable**.
- Los badges usan `BADGE_ESTADO` + `ETIQUETA_ESTADO`, el mismo mapa que `ResumenPage`:
  pendiente ámbar, confirmada azul, completada verde, cancelada rojo.
- **`cargarDatos` carga las 3 tablas completas** (`citas`, `barberos`, `servicios`) con un
  `Promise.all` y filtra todo en el cliente. `citas` son pocas filas; no paginar la query.
- ⚠ `cargarDatos` usa `select('*')`, así que **`cliente_id` sí llega al panel**, pero
  **no se usa en ninguna columna**: la celda "Cliente" muestra solo `nombre` +
  `telefono`. Con el portal `/cliente` ya existe la relación, así que mostrar a quién
  pertenece cada cita es el siguiente paso natural (§18.43).
- **`estaEnCurso(cita)`** no lee un estado: lo deriva comparando la hora actual contra
  `hora + duración` del servicio, solo para citas `confirmada`. Usa
  `duracionTotalCita()`, que **suma la duración de todos** los servicios del texto. Si
  algún día se agrega el literal `en_curso`, también lo acepta.
- **`partirServicios(texto)`** parte `citas.servicio` por `,` porque el flujo público
  permite selección múltiple (§8). Con más de un nombre la celda los muestra en lista;
  con uno solo, en texto plano.
- **`buscarServicio(nombre, servicios)`** resuelve la duración con 3 escalones: nombre
  exacto → categoría exacta → categoría contenida en el texto. Hace falta porque
  `citas.servicio` es texto libre y casi nunca coincide con `servicios.nombre` (las citas
  dicen "Corte", el catálogo dice "Corte de Cabello").
- **`productosCita(cita)`** lee el `jsonb` `productos` con `try/catch` (por si alguien lo
  insertó como texto) y lista `+ Nombre · $X MXN` bajo el servicio cuando hay elementos.
- **"Primera visita"** = ninguna otra cita del mismo `telefono` con fecha anterior (o el
  mismo día a una hora anterior).
- **"Cobrar" escribe `estado: 'completada'`**, no un pago: la tabla no tiene columnas de
  pago. Marcado como PENDIENTE en el código.
- **"Recontactar" abre el marcador `tel:`**, no una plantilla de WhatsApp (no hay
  integración de mensajería).
- **Filtro de barbero**: `''` = todos, un `id`, o `FILTRO_SIN_ASIGNAR` para las citas
  con `barbero_id` nulo (hoy son todas).
- El reloj se congela con `const [reloj] = useState(() => new Date())`: llamar a
  `Date.now()` en el cuerpo del render dispara `react-hooks/purity`.

#### Recordatorios manuales por WhatsApp (2026-10-13)

El barbero puede **recordar una cita** desde la propia tabla o desde la tarjeta del
panel inferior. Es **manual**: abre WhatsApp con el mensaje escrito y marca la cita.

- **`esRecordable(cita)`** decide si el botón aparece: solo `pendiente` o
  `confirmada`, y fecha de hoy o posterior. Para las de hoy exige además que la hora no
  sea anterior a `ahoraMin` (una cita de las 10:00 ya no se recuerda a las 13:00).
- **`telefonoParaWhatsApp(telefono)`** normaliza a lo que wa.me pide: solo dígitos y con
  código de país. Quita en este orden el prefijo internacional `00`, la larga nacional
  `044`, el `52` y el `1` de móvil internacional, y luego **antepone `CODIGO_PAIS = '52'`
  si quedan 10 dígitos**. Si no queda con 10 ni 11 dígitos, devuelve `{ numero: '',
  motivo }` y el botón sale **deshabilitado** con ese motivo en el `title` y en el
  `aria-label`. Verificado contra 12 casos reales (`+52 1 55…`, `044…`, `0052…`,
  `1 55…`, `abc`, vacío): todos dan el número correcto o se deshabilitan.
- **`mensajeRecordatorio(cita, nombreNegocio)`** arma el texto con `etiquetaFecha()` y
  `formatearHora()` (12 h), y el nombre del negocio sale de `useConfiguracion()` —la
  misma fila que el sidebar—, con `'Barbería'` como respaldo si está vacía.
- **`recordarCita(cita)`** abre `https://wa.me/<numero>?text=<encodeURIComponent>` con
  `window.open(..., '_blank', 'noopener,noreferrer')` y **después** escribe
  `recordatorio_enviado_at`. Ese orden es deliberado: **WhatsApp se abre aunque el
  `update` falle**, y el banner `role="alert"` solo informa de que la cita no quedó
  marcada. En el éxito actualiza la fila en pantalla con `setCitas(prev => …)`.
- Las citas ya recordadas muestran la etiqueta **"Recordada"** en la celda del cliente
  (texto `text-[10px] uppercase tracking-wide text-amber`, sin pill) y el botón pasa a
  **"Recordar de nuevo"** en ambos sitios.
- La tarjeta del panel inferior ya **no es estática**: lista `paraRecordar` (mañana
  entero + las de hoy que no han pasado, ordenadas por fecha y hora) con hora, nombre y
  su botón. Si no hay ninguna, muestra "No hay citas por recordar".
- `IconoWhatsApp()` es un SVG inline de trazo, como el resto del set de iconos.

#### Envío automático por correo: H-24 y H-2 (2026-10-13)

Hay **dos canales de recordatorio y son independientes**. El manual de arriba no se
sustituyó: pasó a ser el respaldo cuando el automático no llega.

| Canal | Quién lo dispara | Columna que marca |
|---|---|---|
| Manual (WhatsApp) | El barbero, pulsando "Recordar" | `recordatorio_enviado_at` |
| Automático (correo) | `pg_cron` → Edge Function `enviar-recordatorios` → Resend | `recordatorio_24h_enviado_at` y `recordatorio_2h_enviado_at` |

Enviar por un canal **no silencia** al otro: cada columna filtra solo su propia ventana.
La lógica completa está en §10.7.

En `CitasAdmin.jsx`:

- **`alternarEnvioAutomatico()`** escribe `configuracion.recordatorios_activos` y
  **revisa el `error`** a propósito. Es el único control que puede parar el envío
  automático desde el panel, y un `UPDATE` que afecta 0 filas por RLS no lanza error:
  sin esa revisión, el interruptor mentiría.
- El interruptor es el **mismo control que `BarberosAdmin` y `BarberoForm`** (§9.3,
  §9.4): `<button type="button" role="switch" aria-checked>`, pista
  `relative inline-flex h-5 w-9 rounded-full` (`bg-slate-300` / `bg-primary`) y knob
  `h-3.5 w-3.5 rounded-full bg-white` que viaja con `translate-x-1` / `translate-x-4`.
  La etiqueta visible "Envío automático" hace de nombre accesible. No hay animación nueva:
  solo el `transition-colors` que ya usa todo el admin.
- **`MarcasCorreo({ cita })`** muestra **"24 h enviado"** y/o **"2 h enviado"** según las
  columnas, en `text-[10px] uppercase tracking-wide text-slate`, **sin pill** (§11.4). Si
  no se envió ninguno no renderiza nada. Sale en la celda del cliente de la tabla y en la
  tarjeta del panel inferior, con la fecha real en el `title`.
- **`formatRecordatorio(iso)`** formatea el `timestamptz` de la marca para ese `title`.
- Se **eliminaron** los botones "Ver Plantillas", "Enviar Ahora" y la leyenda
  "Próximamente": describían una funcionalidad que ya no es la de esa tarjeta. El envío
  masivo sigue sin existir (ver abajo), pero ahora es un caso particular del automático.

#### Lo que es UI pendiente de lógica

Marcado con `PENDIENTE` en el código, no lo tomes por implementado:

- **Vista Calendario**: la pestaña del toggle es navegable y muestra un placeholder con
  las 3 piezas que faltan (franjas por hora, bloqueos, aviso de solapamiento). No hay
  modelo de horarios.
- **Envío masivo**: no hay forma de lanzar los recordatorios a mano desde el panel (ni de
  reenviar a un subconjunto). Lo único manual sigue siendo el WhatsApp uno por uno.
- **Cobrar**: ver arriba.
- **Tag "Club Noble" (VIP)**: omitido a propósito, no hay ningún criterio real en el
  modelo que lo sostenga. No lo inventes sin hablarlo.

### 9.6 Portal del cliente (`/cliente`)

`ClienteDashboard.jsx` (199 líneas) es **una copia recortada** del shell de
`AdminDashboard.jsx`, no un componente compartido. Comparación verificada:

| | `AdminDashboard` | `ClienteDashboard` |
|---|---|---|
| Raíz | `flex min-h-screen flex-col bg-slate-50 lg:flex-row` | idéntica |
| Menú móvil | `aria-controls="menu-movil-admin"` | `aria-controls="menu-movil-cliente"` |
| Links | 6 | **1** ("Mis citas", `fin: true`) |
| Cabecera del rail | "ADMIN SUITE" + "Nombre Barbería" | **"Portal del cliente"** |
| Topbar | buscador decorativo + "Ver sitio web público" + notificaciones | **solo** "Hola, {nombre}" + "Ver sitio web" (`sm:inline-flex`) |
| Tarjeta de perfil | muestra estado "En línea" y `v1.0` | solo nombre y correo |

- El rail y la barra móvil salen de `useConfiguracion()`, igual que el admin, así que
  el logo y el nombre de la barbería se leen de la tabla `configuracion`.
- ⚠ **No tiene búsqueda, ni "Nueva cita" en el rail** (sí hay un botón "+ Nueva cita"
  dentro de `CitasCliente`), ni sección de perfil editable.
- ⚠ Las dos tarjetas de perfil (rail y panel móvil) son **el mismo JSX** en una variable
  (`tarjetaPerfil`), a diferencia del admin que lo repite. Buen patrón, no lo
  deshagas.
- ⚠ El guard es el mismo `ProtectedRoute`: **un admin autenticado también entra a
  `/cliente`** y ve un listado vacío (RLS filtra por `cliente_id = auth.uid()`, §10.5).

### 9.7 `CitasCliente.jsx` — "Mis citas" (352 líneas)

Única página de `/cliente`. Tabs **"Próximas (N)" / "Historial (N)"** con `role="tablist"`
+ `aria-selected`, y tarjetas por cita (fecha, hora, estado, servicios, barbero, total,
productos).

- `cargarCitas()` va en un **`useCallback`** con dependencia `[userId]` y el efecto llama
  esa referencia, con `// eslint-disable-next-line react-hooks/set-state-in-effect`:
  es el patrón correcto para evitar el error de lint (§15.1).
- El filtro Próximas/Historial usa `useMemo` con `activa(c)`:
  `estado ∈ {pendiente, confirmada}` **y** `aDate(fecha, hora) >= new Date()`. El historial
  es lo complementario, en `.reverse()`.
- **Reagendar**: modal con `<input type="date" min={hoy}>`, los `BLOQUES` de hora (copia
  local, §18.42), y la RPC `horas_ocupadas({ fecha_consulta, barbero_id })`. Valida
  domingo (`esDomingo`) y horas pasadas. Llama a `reagendar_cita(p_id, p_fecha, p_hora)`
  y traduce el `23505` igual que `BookingPage`.
- **Cancelar**: modal de confirmación con la fecha/hora de la cita y
  `cancelar_cita(p_id)`.
- ⚠ **No usa `useConfirmarCita`** (§9.8): el cliente no confirma citas, las cancela o
  reagenda, y ambas cosas pasan por RPC.
- Los errores usan `role="alert"` (`errorCarga` y el `error` de los modales).
- ⚠ `estilosEstado` pinta `confirmada` en **verde** (`bg-green-100 text-green-800`),
  mientras el admin la pinta en **azul** (§11.1). Mismo estado, dos colores.

### 9.8 `src/hooks/useConfirmarCita.js` — confirmar con optimistic update

Único hook en `src/hooks/`. Firma: `useConfirmarCita(setCitas, setErrorMsg)` → devuelve
`async (cita) => {}`.

- Es un **optimistic update con reversión**: cambia el estado local a `'confirmada'`
  al instante, y si Supabase devuelve `error` **revierte** al valor anterior y pasa
  `setErrorMsg(\`No se pudo confirmar la cita: ${error.message}\`)`.
- Es no-op si la cita ya estaba `'confirmada'`.
- Cada página conserva la propiedad de su propio listado y lo vuelve a consultar al
  montar, por eso el hook **no guarda datos**: recibe el setter. Lo consumen
  `ResumenPage` (con `setCitasSemana`) y `CitasAdmin` (con `setCitas`).
- ⚠ Si añades una tercera pantalla que confirme citas, usa el hook; si no, duplicarás
  la lógica de reversión.

---

## 10. Supabase

### 10.1 Variables de entorno

`.env` (existe, está en `.gitignore`; contiene **solo** estas dos claves):

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Ojo al nombre: es `VITE_SUPABASE_PUBLISHABLE_KEY` (la clave publicable nueva), **no**
`VITE_SUPABASE_ANON_KEY`. Si alguien "arregla" el nombre, rompe la app.

El prefijo `VITE_` es obligatorio: sin él la variable no llega al bundle.
**Nunca commitees `.env`, nunca imprimas su contenido en una respuesta, nunca lo subas
a un gist.** Si necesitas el valor, pregunta.

### 10.2 Tablas

**No hay carpeta `supabase/` en el repo ni SQL versionado en archivos.** Esquema
verificado por MCP (2026-10), columna por columna:

| Tabla | Columnas reales | Notas |
|---|---|---|
| `citas` | `id uuid PK`, `nombre text NOT NULL`, `telefono text NOT NULL`, `servicio text NOT NULL`, `fecha date NOT NULL`, `hora time NOT NULL`, `estado text NULL DEFAULT 'pendiente'`, `created_at timestamp NULL DEFAULT now()`, `correo text`, `notas text`, `addon boolean NULL DEFAULT false`, `total numeric`, `barbero_id uuid`, `productos jsonb NOT NULL DEFAULT '[]'`, `cliente_id uuid`, `recordatorio_enviado_at timestamptz NULL`, **`recordatorio_24h_enviado_at timestamptz NULL`**, **`recordatorio_2h_enviado_at timestamptz NULL`** | la **única FK** es `citas_barbero_id_fkey` → `barberos(id)` con **`ON DELETE SET NULL`**. `cliente_id` **no tiene FK ni trigger**: apunta a `auth.users` por convención. Las **3 columnas `recordatorio_*`** son marcas, **no** estados: la del WhatsApp la escribe el panel (§9.5), las otras dos la Edge Function (§10.7) |
| `servicios` | `id`, `nombre`, `categoria`, `descripcion`, `costo numeric`, `duracion text`, `imagen`, `created_at` | `duracion` es TEXT sin CHECK |
| `productos` | `id`, `nombre`, `descripcion`, `categoria NOT NULL`, `precio numeric NOT NULL`, `imagen`, `created_at`, **`stock integer`** | `stock` solo lo lee `ProductosPage`; ni el admin ni `BookingPage` lo tocan |
| `barberos` | `id`, `nombre`, `especialidad`, `disponible boolean NULL DEFAULT true`, `imagen`, `created_at`, **`rating numeric DEFAULT 0`**, **`total_resenas integer DEFAULT 0`**, `sillon_numero integer`, `sillon_nombre text` | `rating`/`total_resenas` los usa `BarberosAdmin`; `sillon_*` no los usa nadie (§18.25) |
| `configuracion` | `id integer PK`, `nombre text NOT NULL`, `estado text`, `municipio text`, `logo text`, `descripcion text`, `updated_at timestamptz`, **`recordatorios_activos boolean NOT NULL DEFAULT false`** | **una sola fila** (`id = 1`), verificada: hay 1. La usan `AdminDashboard`, `ClienteDashboard`, `ConfiguracionAdmin` y el provider. **`recordatorios_activos` es el interruptor maestro del envío automático** (§10.7): su escritura no necesitó política nueva, la cubre `Admin actualiza` |
| **`perfiles`** | `id uuid PK → auth.users(id) ON DELETE CASCADE`, `rol text NOT NULL DEFAULT 'cliente'` con **`check (rol in ('superadmin','admin','cliente'))`**, `nombre text`, `created_at timestamptz NOT NULL DEFAULT now()` | **Fuente de verdad del rol.** La app solo hace SELECT; el INSERT lo hace el trigger `trg_crear_perfil` de `auth.users` (§10.6) |

⚠ **Inconsistencia real a respetar:** `servicios` usa la columna **`costo`** y
`productos` usa **`precio`**. La UI lo normaliza a `$X MXN` al mostrar. No unifiques
una sin cambiar la otra y las consultas.

⚠ `citas.servicio` almacena los **nombres de los servicios como texto**, no un id ni
una FK, y ahora puede traer **varios separados por `,`** (§8). Por eso el admin tiene
que resolverlos a mano con `buscarServicio()` (§9.5). Igual `citas.fecha` es un
**string** (no `timestamptz`) y se compara lexicográficamente en `ResumenPage` — de ahí
el formato `YYYY-MM-DD` en `BookingPage`.

`barberos.disponible` es booleano, default `true` (`barbero?.disponible ?? true`).

⚠ `citas.cliente_id` es **nullable**: de las 20 filas actuales, **16 la tienen en
`null`** (creadas antes del portal del cliente) y solo 4 quedan linked a un `auth.users`
real. Si borras la cuenta de un cliente en Supabase, sus citas quedan huérfanas para
siempre porque no hay FK ni trigger que las limpie (§18.41).

⚠ **`perfiles` tiene `ON DELETE CASCADE` contra `auth.users`**, pero `citas.cliente_id`
**no**: borrar la cuenta de un cliente elimina su perfil (y su rol) al instante y deja
sus citas apuntando a un `auth.users` que ya no existe. `perfiles` y `citas` precisam
estrategias distintas de borrado; no las trates igual.

⚠ La columna `rol` tiene `CHECK (rol in (...))` pero **no tiene índice propio**: es un
`text` y se busca por `id` (la PK), así que para la app da igual. Si algún día se
consulta "dame todos los admins", ese índice hará falta.

### 10.3 Storage

- Bucket: **`imagenes`**.
- Carpetas por entidad: `servicios/`, `productos/`, `barberos/`.
- Nombre: `` `${carpeta}/${Date.now()}-${archivoOriginal}` ``.
- Se sube con `.upload(path, file)` y se resuelve la URL con
  `supabase.storage.from('imagenes').getPublicUrl(path).data.publicUrl`.
  El bucket es **público** (no hay `createSignedUrl`).
- **No hay borrado de archivos en storage**: al eliminar un registro, su imagen queda
  huérfana en el bucket. Preexistente.
- No hay buckets de `videos`/`audio`, ni transformaciones, ni `upsert`.

### 10.4 Auth

- **Email + password**, con **dos operaciones**: `signInWithPassword` (vía `login()` de
  `AuthContext`) y **`signUp`** (`LoginPage` en modo registro). No hay OAuth, ni magic
  link, ni OTP.
- ✅ **El registro ya NO envía el rol.** `LoginPage` manda solo
  `options.data = { full_name }`. El rol lo pone el trigger de la BD
  (`crear_perfil_al_registrarse`, §10.6), que **siempre inserta `'cliente'` e ignora
  `user_metadata` a propósito**. Antes sí se mandaba `role: 'cliente'` y eso era
  auto-asignable: cualquiera podía pedir `admin` (§18.39, resuelto).
- El registro **no** inicia sesión: al terminar, `LoginPage` muestra "¡Cuenta creada con
  éxito! Ya puedes iniciar sesión." y vuelve al modo login. Si el proyecto tiene
  confirmación por email activada en Supabase, el usuario tampoco puede entrar hasta
  confirmar el correo (§18.44).
- La sesión la persiste automáticamente supabase-js (localStorage) y se recupera con
  `getSession()` al montar. El primer usuario administrador se crea fuera de la app
  (dashboard de Supabase).
- ⚠ **El rol solo vive en `perfiles`**, escrito por el trigger. `user_metadata` sigue
  teniendo el `role` de las cuentas viejas (porque se creó antes del cambio) pero
  **nadie lo lee**: verificado, 0 coincidencias de `user_metadata.role` en `src/`.
  Puedes limpiar esos datos con `update auth.users set raw_user_meta_data = ...` sin
  riesgo, pero no hace falta.
- ⚠ `AuthContext` **no expone** ningún helper de rol: cada pantalla que lo necesita
  saca `rol` de `useAuth()` y, para decidir destinos, usa `rutaInicioPorRol(rol)`
  (§5). No vuelvas a leer `user_metadata` "porque es más rápido".

### 10.5 RLS y políticas (verificado en la BD por MCP, 2026-10)

**Las 6 tablas tienen RLS habilitado** (`barberos`, `citas`, `configuracion`,
`perfiles`, `productos`, `servicios`). Esto no se ve en el repo: se comprobó con
`pg_tables.relrowsecurity`. Las políticas vigentes, con su expresión real:

| Tabla | Política | Comando | Rol | USING / WITH CHECK |
|---|---|---|---|---|
| `citas` | `Cualquiera puede agendar` | INSERT | `anon`, **`authenticated`** | `true` |
| `citas` | `Admin escribe` | ALL | `authenticated` | **`es_admin()`** / **`es_admin()`** |
| `citas` | `cliente ve sus citas` | SELECT | `authenticated` | `(auth.uid() = cliente_id)` |
| `barberos` | `Lectura publica` | SELECT | `anon`, **`authenticated`** | `true` |
| `barberos` | `Admin escribe` | ALL | `authenticated` | **`es_admin()`** / **`es_admin()`** |
| `productos` | `Lectura publica` | SELECT | `anon`, **`authenticated`** | `true` |
| `productos` | `Admin escribe` | ALL | `authenticated` | **`es_admin()`** / **`es_admin()`** |
| `servicios` | `Lectura publica` | SELECT | `anon`, **`authenticated`** | `true` |
| `servicios` | `Admin escribe` | ALL | `authenticated` | **`es_admin()`** / **`es_admin()`** |
| `configuracion` | `Lectura publica` | SELECT | `anon`, `authenticated` | `true` |
| `configuracion` | `Admin escribe` | INSERT | `authenticated` | **`es_admin()`** |
| `configuracion` | `Admin actualiza` | UPDATE | `authenticated` | **`es_admin()`** / **`es_admin()`** |
| `perfiles` | `Usuario lee su perfil` | SELECT | `authenticated` | `(auth.uid() = id)` |

⚠ **`Admin escribe` ya no significa "autenticado"**: significa `es_admin()`, que
comprueba el rol en `perfiles` (`superadmin` o `admin`). Antes era `using true` /
`with check true` para **cualquier** cuenta autenticada, o sea que un cliente
registrado podía editar el catálogo entero desde el navegador. Verificado simulando
roles: un cliente logueado consigue **0 filas** en cada UPDATE/DELETE y un error en
cada INSERT.

⚠ **RLS en UPDATE/DELETE no lanza error: afecta 0 filas en silencio.** Es el modo de
fallo que más despista: la sentencia se ejecuta, no hay excepción y el panel no ve
ningún cambio. Si algún día el panel "no guarda", sospecha de esto antes que del
código. (El síntoma es el contrario del ya documentado en §18: no es que el `error` se
pierda, es que nunca se produce.)

⚠ **`Lectura publica` incluye `authenticated` a propósito** (migración
`lectura_publica_para_autenticados`). PostgREST asigna el rol `authenticated` a las
peticiones **con sesión**, no `anon`: si la política dice solo `to anon`, el catálogo
público desaparece para cualquiera que haya iniciado sesión. Lo mismo con
`Cualquiera puede agendar` (`insert_citas_para_autenticados`): como `/agendar` exige
confirmar con sesión, el INSERT tenía que admitir `authenticated` o el agendamiento se
rompía para todos los usuarios registrados. **No "simplifiques" estas dos políticas
de vuelta a `to anon`.**

⚠ **`citas` NO tiene lectura pública.** Es intencional: las reservas las lee solo
quien está autenticado, y solo las suyas (`cliente ve sus citas`) o todas si es admin
(`Admin escribe` → `es_admin()`). Por eso las horas ocupadas se piden por RPC (§10.7).

⚠ **`perfiles` no tiene política de INSERT ni de UPDATE**, a propósito: nadie cambia
su rol desde la app, **ni siquiera un admin**. El alta la hace el trigger (§10.6) y una
promoción se hace por SQL. Un `update perfiles set rol = 'superadmin'` devuelve **0
filas**, silenciosamente.

⚠ **`configuracion` es legible por `anon`**: el nombre, el logo y la descripción de la
barbería son públicos por diseño (se muestran en el sitio y en los dos paneles). No
añadas ahí columnas de negocio privada sin revisar esta política.

⚠ **`configuracion` no tiene política de DELETE**: nadie puede borrar esa fila, ni
siquiera un admin (verificado: `DELETE` → 0 filas para el admin). Si algún día hay que
borrarla, añade la política explícitamente; no des por hecho que `ALL` la cubría.

Tipos de columna que importan para el cliente:

- `citas.fecha` es `date` → llega como `'YYYY-MM-DD'` y se compara lexicográficamente.
- `citas.hora` es `time without time zone` → llega como `'HH:MM:SS'`, **no** `'10:00 AM'`.
  Insertar `'11:50 AM'` **falla**: Postgres no puede castearlo a `time`. Mandar siempre
  `'HH:MM'` (24 h); el AM/PM es solo presentación.
- `citas.estado` tiene **default `'pendiente'`**: el insert del sitio público no lo envía.
- `citas.total`, `servicios.costo` y `servicios.duracion` son `numeric`/`text`: castear
  con `Number()` antes de sumar o comparar.

#### Trigger `trg_crear_perfil` sobre `auth.users` (migración `trigger_perfil_registro`)

```sql
create or replace function public.crear_perfil_al_registrarse()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name',
                           split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger trg_crear_perfil after insert on auth.users
  for each row execute function public.crear_perfil_al_registrarse();
```

- **`security definer` + `set search_path = ''`**: el INSERT lo hace la función (rol
  `postgres`), no el cliente. Por eso `perfiles` puede quedarse **sin política de
  escritura** y el rol sigue siendo intocable desde la app.
- **`user_metadata` se ignora a propósito**: es control del cliente y permitiría
  auto-asignarse `admin`. Ese era el agujero del §18.39.
- La misma migración hizo el **backfill** de los 5 usuarios que ya existían (el trigger
  solo dispara en altas nuevas) y promovió a `superadmin` la cuenta del negocio,
  `23302011@utfv.edu.mx`.
- Estado verificado: **1 `superadmin` + 4 `cliente`**, 0 `admin` (§18.49).
- Para promover a alguien: `update public.perfiles set rol = 'admin' where id = (…)`.
  **No se puede desde la app**, ni siquiera con sesión de admin (§10.5).

#### Funciones de rol (migración `funciones_rol`)

```sql
public.rol_actual() returns text   -- rol del usuario autenticado; NULL si no hay sesión
public.es_admin()   returns boolean -- true si es 'superadmin' o 'admin'
```

Ambas `language sql stable security definer set search_path = ''` (verificado
`provolatile = 's'`, `prosecdef = true`). `security definer` porque RLS de `perfiles`
solo deja ver la fila propia; `stable` porque no cambian dentro de la sentencia.

Permisos verificados (`proacl`): `revoke all from public` **+** `grant execute to
authenticated`, y **nada para `anon`**. Comprobado simulando `anon`: la llamada falla
con *permission denied*, así que un visitante sin sesión no puede ni preguntar su rol.

`es_admin()` es la condición que usan **todas** las políticas de escritura del panel
(§10.5). Si algún día hay un cuarto rol con permisos de escritura, amplíala aquí y en
las políticas, no en el frontend.

#### Función RPC `horas_ocupadas` (migración `rpc_horas_ocupadas`, ampliada después)

```sql
public.horas_ocupadas(fecha_consulta date, barbero_id uuid default null)
  returns setof time  language sql  stable  security definer  set search_path = public
```

Devuelve **solo la columna `hora`** de las citas no canceladas. Existe porque `citas`
**no** es legible por `anon` (expondría nombre, teléfono y correo) y sin embargo
`/agendar` necesita saber qué horas están tomadas. Se llama desde el cliente con
`supabase.rpc('horas_ocupadas', { fecha_consulta: 'YYYY-MM-DD', barbero_id: null })`
(los dos parámetros; el segundo es opcional).

- `revoke all … from public` + `grant execute … to anon, authenticated`: sin esto,
  cualquier rol nuevo podría ejecutarla.
- Devuelve `'HH:MM:SS'`; el cliente recorta a `'HH:MM'` con `.slice(0, 5)`.
- Con **barbero concreto** devuelve las horas ocupadas de ese barbero; con
  `barbero_id = null` ("Cualquier barbero") devuelve las horas en las que **ya no queda
  ni un barbero libre**, y si no hay ningún barbero disponible devuelve cualquier cita
  viva del día. Son tres ramas en `UNION`.
- ⚠ Como `citas.hora` es `time`, la comparación es exacta: `'11:00'` y `'11:50'` **no**
  chocan aunque una cita de 70 min se solape con la siguiente. §18.6.

#### Función RPC `asignar_barbero(fecha_consulta date, hora_consulta time) → uuid`

`language sql, stable, security definer`, ejecutable por `anon` y `authenticated`.
Devuelve el `id` del **primer barbero disponible que esté libre a esa hora exacta**
(`order by created_at, nombre limit 1`), o `NULL` si no hay ninguno. La usa
`BookingPage` cuando el cliente eligió "Cualquier barbero" y escribe el resultado en
`barbero_id`. ⚠ Misma limitación de solapamiento por intervalo (§18.6).

#### Funciones RPC del portal del cliente

⚠ **Estas dos NO tienen migración registrada.** `list_migrations` del MCP muestra 9
migraciones y la última es `cita_productos_jsonb` (2026-10-06); tanto `cliente_id`, como
la política `cliente ve sus citas`, como estas dos funciones se aplicaron **fuera del
historial de migraciones**. Si reconstruyes el proyecto en otra BD, hay que volver a
aplicarlas a mano (§18.45).

Ambas son `plpgsql, security definer, set search_path = public` y **solo**
`authenticated` (nada a `anon`). Definen la autorización en el servidor, que es lo que
RLS por sí solo no cubre:

```sql
public.cancelar_cita(p_id uuid) returns void
  update citas set estado = 'cancelada'
   where id = p_id and cliente_id = auth.uid()
     and estado in ('pendiente','confirmada')
     and (fecha + hora) > (now() at time zone 'America/Mexico_City');
  if not found then raise exception 'cita_no_modificable'; end if;

public.reagendar_cita(p_id uuid, p_fecha date, p_hora time) returns void
  if (p_fecha + p_hora) <= (now() at time zone 'America/Mexico_City')
    then raise exception 'fecha_pasada'; end if;
  update citas set fecha = p_fecha, hora = p_hora
   where id = p_id and cliente_id = auth.uid()
     and estado in ('pendiente','confirmada')
     and (fecha + hora) > (now() at time zone 'America/Mexico_City');
  if not found then raise exception 'cita_no_modificable'; end if;
```

- Las dos **rechazan en el servidor** lo que la UI no puede saber: citas de otro
  cliente, citas ya pasadas, y citas en `completada` / `cancelada`. Un cliente **solo**
  puede tocar las suyas mientras estén `pendiente` o `confirmada`.
- El cliente las llama con `supabase.rpc('cancelar_cita', { p_id })` y
  `supabase.rpc('reagendar_cita', { p_id, p_fecha, p_hora })`. Los errores llegan como
  `error` normal de Supabase con el mensaje del `raise`.
- ⚠ `reagendar_cita` **no revalida solapamientos**: si el slot está ocupado salta el
  índice `citas_slot_unico` y el error `23505` lo maneja `CitasCliente`.
- ⚠ El mensaje `'cita_no_modificable'` es opaco: la UI muestra "No se pudo cancelar la
  cita. Puede que ya haya pasado o cambiado de estado." sin distinguir por qué.

#### Índice único parcial `citas_slot_unico` (migración `slot_unico_por_fecha_hora`)

```sql
create unique index citas_slot_unico on public.citas (fecha, hora, barbero_id)
  where coalesce(estado, 'pendiente') <> 'cancelada'
    and barbero_id is not null
```

Bloqueo optimista: dos personas no pueden tomar el mismo slot **con el mismo barbero**.
El insert o el update duplicado falla con **`error.code === '23505'`**, que
`BookingPage` y `CitasCliente` traducen a "Ese horario acaba de ser tomado, elige otro" +
refresco de las horas ocupadas.

⚠ **Las citas sin barbero no están cubiertas** por el índice (el `WHERE` exige
`barbero_id is not null`). Como `BookingPage` auto-asigna barbero, es raro, pero
`CitaManualForm` y el `BookingForm.jsx` muerto pueden dar de alta una cita sin barbero, y
entonces **dos clientes sí pueden caer en el mismo horario**. De las 20 filas actuales,
**15 siguen sin `barbero_id`** (§18.46).

⚠ La misma migración tuvo que **cancelar una fila duplicada** (2025-09-30 11:50, dos
citas 'pendiente') porque Postgres no puede crear el índice con el conflicto. **No se
borró**: la fila sigue existiendo con `estado = 'cancelada'`. Cualquier intento de
recrear el índice con datos duplicados fallará otra vez.

### 10.7 Envío automático de recordatorios (Edge Function + `pg_cron`)

Única parte del proyecto que corre **fuera de `src/`**: el código vive en
`supabase/functions/enviar-recordatorios/index.ts` (versionado en el repo, sin secretos) y
está **desplegado** en Supabase. Todo lo demás quedó en 3 migraciones, así que no quedó
fuera del historial.

```sql
-- cita_recordatorios_automaticos: 2 columnas en citas (nullable, sin default)
-- configuracion_recordatorios_activos: 1 booleano con default false
-- cron_recordatorios: pg_cron + pg_net + secreto en Vault + 2 RPC + el job
```

**Extensiones:** `pg_cron` y `pg_net` se activaron en `cron_recordatorios`
(`create extension if not exists`). `supabase_vault` ya estaba.

#### El job de `pg_cron`

```sql
select cron.schedule('enviar-recordatorios', '5 * * * *', $$
  select net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/enviar-recordatorios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', '<anon key pública>',
      'Authorization', 'Bearer <anon key pública>',
      'x-recordatorios-secreto',
        (select decrypted_secret from vault.decrypted_secrets
          where name = 'recordatorios_secreto')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000);
$$);
```

- Correr **cada hora en el minuto 5**, no en el 0: evita coincidir con el resto de
  tareas de cron de la plataforma.
- El **secreto se lee de Vault dentro del comando**, no está escrito en él. Se generó
  con `gen_random_bytes(24)` y **nunca sale de la base**.
- La `apikey` que viaja es la **legacy `anon`**, que es pública (ya está en el bundle del
  frontend). No es un secreto: solo hace pasar el JWT del gateway. La autorización real
  es el header `x-recordatorios-secreto`.
- La migración hace `cron.unschedule` del job homónimo antes de crearlo: es idempotente.

#### Las 2 RPC (`service_role` únicamente)

Ambas son `security definer` + `set search_path = ''`, con `revoke all from public` y
`grant execute to service_role`. ⚠ **Pero eso NO las deja solo para `service_role`**: ver
la advertencia inmediatamente debajo.

- **`recordatorios_secreto_valido(p_secreto text) → boolean`**: compara el header con el
  secreto de Vault. Es `security definer` porque una Edge Function llega por JWT y su
  rol no puede leer `vault.decrypted_secrets` directamente.
- **`recordatorios_citas_pendientes(p_desde, p_hasta, p_columna_marca, p_maximo)`**:
  devuelve las citas de la ventana `[p_desde, p_hasta]` cuya marca sigue en `NULL`, con
  el nombre del barbero (`left join barberos`). Filtra con
  `coalesce(lower(estado),'pendiente') in ('pendiente','confirmada')` — el `lower` es
  necesario por la fila con `'Pendiente'` en mayúscula (§18.37). Compara
  `(fecha::text || ' ' || left(hora::text, 8))` como **texto local sin zona**, que es lo
  que la función envía. `p_columna_marca` tiene **lista blanca** (`case` con los 2
  nombres): no se interpola en SQL, pero evita que alguien pase cualquier columna.

⚠ **`revoke all from public` NO alcanza** para dejar una función cerrada: Supabase tiene
un `alter default privileges` que concede `execute` a `anon`, `authenticated` y
`service_role` en el esquema `public`. El `proacl` llegó a mostrar
`anon=X,authenticated=X,service_role=X`. Eso no es teórico:
`recordatorios_citas_pendientes` devuelve **nombre, correo y teléfono**, así que leerla
desde el navegador con la clave pública **saltaba por completo la RLS de `citas`**
(`cliente ve sus citas`, que es lo que impide ver las citas de otros).

✅ **Corregido en la migración `rpc_recordatorios_solo_service_role`**, que hace
`revoke execute … from anon, authenticated, public` y vuelve a dar `execute` solo a
`service_role`. `proacl` verificado: `{postgres=X/postgres,service_role=X/postgres}`. Y
verificado que un `anon` recibe **`permission denied for function
recordatorios_citas_pendientes`**.

⚠ **Lección para cualquier RPC nueva**: `revoke all from public` **más** un `grant` a
`service_role` **no** es suficiente. Hay que revocar de `anon` y `authenticated`
explícitamente, o la función queda pública para cualquiera con la clave del frontend.

#### La Edge Function

`supabase/functions/enviar-recordatorios/index.ts`. Reglas, en orden de ejecución:

1. **Solo `POST`** y con el secreto válido; si no, `401`. Si la RPC falla se responde
   `401` también: se prefiere **no enviar** antes que abrir la puerta, y no se pierde nada
   porque las columnas siguen en `NULL` y el cron reintenta a la hora siguiente.
2. **Interruptor**: lee `configuracion.recordatorios_activos`. Si es `false`, responde
   `200 {enviados: 0, motivo: 'interruptor apagado'}` sin hacer nada más.
3. **Ventanas** en `TZ = 'America/Mexico_City'`: H-24 = `[ahora+23h, ahora+24h]`, H-2 =
   `[ahora+1h, ahora+2h]`. Toda la aritmética es local, sin zona, porque `fecha` es
   `date` y `hora` es `time`. **Cada ventana usa MIN y MAX**: son de 1 h de ancho.
4. **Envío** con Resend (`POST https://api.resend.com/emails`). Solo marca la columna si
   la respuesta fue **2xx**: si Resend falla, se reintenta en la próxima hora.
5. **Límite de 80** correos por ejecución (el plan gratis de Resend son 100/día). Lo que
   no cabe va a `resumen.saltados` y se registra en el log.
6. Las citas **sin `correo` se saltan** (van a `resumen.sinCorreo`): no hay a quién
   escribirlas.

⚠ **La variable de entorno es `SUPABASE_URL`, NO `SUPABASE_API_URL`.** El runtime solo
inyecta `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_DB_URL`, `SUPABASE_JWKS`, `SB_EXECUTION_ID`,
`SB_REGION`, `SUPABASE_FUNCTION_SLUG`. Con `SUPABASE_API_URL` el `createClient` revienta
al arrancar y la función responde `500 WORKER_ERROR`. Verificado empíricamente.

⚠ **Error real del despliegue con MCP**: el `deploy_edge_function` **reutiliza el
`import_map_path` de la versión anterior**, y si en esa versión se subió un
`import_map_path` absoluto, el siguiente deploy falla con
`import map path does not exist - /tmp/.../source/file:///tmp/.../deno.json`. Se
arregla **pasando `import_map_path: "deno.json"` explícito** en cada despliegue.

**Secretos de la función** (nunca en el repo):

| Secreto | Para qué | Dónde vive |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Lo inyecta Supabase; se usa **solo** dentro de la función | ✅ automático |
| `RESEND_API_KEY` | Autenticación contra la API de Resend | ✅ **Supabase Vault**, secreto `resend_api_key` |
| `RESEND_REMITENTE` | Remitente, p. ej. `Barberos <notifications@resend.dev>` | opcional, hay default |
| `SECRETO_RECORDATORIOS` | Alternativa al de Vault para autorizar la llamada | opcional, se usa Vault |

✅ **La clave de Resend NO está en un secreto de plataforma, sino en Vault.** El MCP no
tiene ninguna herramienta para `supabase secrets set`, y así se resolvió mejor: la clave
se guardó con `vault.create_secret` mediante `execute_sql` (**no** `apply_migration`,
porque **un secreto no se versiona**) y la función la lee con la RPC
`recordatorios_api_key_resend()`. Como alternativa sigue funcionando
`Deno.env.get('RESEND_API_KEY')`, por si algún día se prefiere la CLI.

⚠ **Esa RPC devuelve la clave EN CLARO**, así que sus `revoke … from anon, from
authenticated` son **imprescindibles** (mismo motivo que en las otras dos, §10.7).

#### Dos bugs reales que costaron una tanda de correos a clientes

Los dos estaban en `sumarHoras()` y en el armado de las ventanas. Se documentan porque
**ninguno de los dos daba error**: la función respondía `200` y el resultado era
silenciosamente incorrecto.

1. **`Invalid Date` → `"NaN-NaN-NaN"`.** `hora` ya trae segundos (`'22:10:43'`), así que
   `` new Date(`${fecha}T${hora}:00Z`) `` construía `'…T22:10:43:00Z'`, que es un ISO
   inválido → `getUTCFullYear()` devolvía `NaN`. Como las ventanas se comparan **como
   texto** y `'NaN…' > '2026…'`, el resultado era que **H-24 matcheaba TODAS las citas
   futuras** y **H-2 ninguna**. Fix: `hora.slice(0, 5)` + un `Number.isNaN` que lanza.
2. **La ventana H-24 se había armado como `[ahora, ahora+24h]`**, 24 h de ancho, en vez
   de `[ahora+23h, ahora+24h]`. `VENTANA_24H.min = 23` estaba definido y **nunca se
   usaba**. Efecto: el aviso de "mañana" salía a cada cita del día y del siguiente, cada
   hora, hasta agotar los 80 del presupuesto.

Por los dos bugs, la **primera** ejecución real alcanzó a 2 clientes que no eran de
prueba (uno con `HTTP 403` del remitente de prueba y otro con `HTTP 422` por correo
inválido). Ninguno quedó marcado, así que reintentan a la hora siguiente.

✅ **Barrera añadida**: `FORMATO_VENTANA` valida los 4 extremos contra
`^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$` y, si algo no cuadra, responde `500` **sin enviar
nada**. Un formato roto debe ser un fallo ruidoso, no una ventana que matchea de más.

#### Verificación de extremo a extremo (2026-10-13)

| Prueba | Resultado |
|---|---|
| `SUM_HORAS` con Node: midnight, fin de mes, formato | ✅ |
| Sin secreto / secreto falso | `401` ✅ |
| Interruptor apagado | `200 {enviados:0, motivo:'interruptor apagado'}`, 0 marcas ✅ |
| Cita a 1 h 30 min | entró **solo** en H-2, marcadas `2h` y no `24h` ✅ |
| Cita a 23 h 30 min | entró **solo** en H-24, marcada `24h` y no `2h` ✅ |
| **Segunda ejecución idéntica** | `enviados: []`, marcas sin cambiar → **no reenvía** ✅ |
| Cita `cancelada` en ventana | excluida ✅ |
| Cita sin `correo` en ventana | va a `sinCorreo`, no se envía ✅ |
| `anon` llamando las 3 RPC | `permission denied` ✅ |
| `pnpm lint` / `pnpm build` | 10 errores (línea base) / limpio ✅ |

⚠ **Pendiente del dominio**: con `notifications@resend.dev` solo llegó al correo de la
cuenta de Resend. Un cliente real devolvió **`HTTP 403`**, que es justo la restricción del
remitente de prueba. Es el comportamiento correcto del "no marcar si falló", pero
significa que **hoy el automático no le llega a ningún cliente**: hay que verificar un
dominio en Resend (§18.54).

#### Cómo probarla sin esperar al cron

```sql
select net.http_post(
  url := 'https://<project-ref>.supabase.co/functions/v1/enviar-recordatorios',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', '<anon>', 'Authorization', 'Bearer <anon>',
    'x-recordatorios-secreto',
      (select decrypted_secret from vault.decrypted_secrets
        where name = 'recordatorios_secreto')),
  body := '{}'::jsonb, timeout_milliseconds := 55000);
```

La respuesta **no** es inmediata: `pg_net` encola y se lee de `net._http_response` unos
segundos después (`select status_code, content from net._http_response order by id desc
limit 1`). El `500 WORKER_ERROR` del gateway significa que la función no arrancó (§
`SUPABASE_URL`). Para ver el motivo hay que desplegar una sonda que devuelva la
excepción en el cuerpo: **`console.log` no llega a los logs que expone `query_logs`**
(que solo traen metadatos del gateway).

⚠ **Las citas de prueba hay que crearlas a mano dentro de la ventana** y borrarlas
después: la ventana es de 1 h de ancho, así que una fila creada "dentro de 2 h" se sale
sola. Para caer en la ventana de H-2:
`hora = (now() at time zone 'America/Mexico_City')::time + interval '1 h 30 min'`.

---

## 11. Reglas de UI/UX

**El proyecto tiene DOS sistemas visuales, y es intencional.** No los unifiques sin
que el usuario lo pida:

| Zona | Sistema | Tokens |
|---|---|---|
| **Dashboard `/admin`** (8 archivos en `src/pages/admin/`) | Sistema actual, rediseñado | `slate` / `primary` / `amber` / `navy` |
| **Portal del cliente `/cliente`** (2 archivos en `src/pages/cliente/`) | **El mismo sistema claro del admin** | `slate` / `primary` / `navy` |
| **Sitio público** (`/`, `/agendar`, `/login`, `/servicios`, `/productos`, `/contacto`) | Sistema anterior, **sin tocar** | `neutral-*` / `sky-500` / `emerald` / `amber` / `yellow` |

⚠ **`/cliente` es tema claro aunque su usuario sea un cliente, no un administrador**:
es una decisión de producto (el portal es una zona "de la empresa") y usa exactamente
los mismos tokens que `/admin`. Oscurecerlo sería un task aparte, no un fix.

⚠ `/cliente` **sí** está alineado con el admin. Si añades una página ahí, copia
`ClienteDashboard` / `CitasCliente` y **no** `AdminDashboard` (que trae buscador
decorativo, badge "ADMIN SUITE" y 6 links de administración).

El rediseño del admin **no** tocó el sitio público. Esa es una costura conocida y
documentada: `/` y `/admin` ya no se ven como hermanos, y `LoginPage` comparte
inputs con el admin pero conserva el tema viejo. Decidir si se alinea es un task
futuro, no un fix.

### 11.1 Tokens del dashboard

Definidos en el bloque `@theme` de `src/index.css`. **No existe
`tailwind.config.js` y no debe crearse**; no se hardcodeen hex en los componentes,
usa el token.

**Superficies** (fondo claro, casi blanco)

| Token | Hex | Uso |
|---|---|---|
| `slate-50` | `#F8FAFC` | fondo principal de la app |
| `slate-100` | `#F1F5F9` | superficies elevadas (sidebar, cards) |
| `slate-200` | `#E2E8F0` | bordes sutiles y divisores |
| `slate-300` | `#CBD5E1` | borders principales |
| `white` | `#FFFFFF` | superficies primarias y modales |

**Texto** (café/navy oscuro — contraste mínimo 4.5:1)

| Token | Hex | Uso |
|---|---|---|
| `navy` | `#0F172A` | texto principal, títulos, headers |
| `slate` | `#64748B` | texto secundario, bordes, placeholders |

**Acento primario** (azul — para acciones, activo, progreso)

| Token | Uso |
|---|---|
| `primary` | `#1E40AF` — botones principales, links activos, estado activo del sidebar, barras de progreso |
| `primary-50` | `#1E40AF0A` (10% opacidad) — badges suaves, destacados de fondo |
| `primary-100` | `#1E40AF1A` (10% opacidad) — hover y fondos muy suaves |

**Acento secundario** (ámbar/cobre — acentos cálidos)

| Token | Uso |
|---|---|
| `amber` | `#854D0E` — acentos cálidos, iconografía secundaria, texto de highlights |
| `amber-50` | `#854D0E0A` (10% opacidad) — badges y fondos suaves |

**Estados de cita** (escala propia, independiente del fondo)

| Estado | Token | Hex | Lectura |
|---|---|---|---|
| pendiente | `brass-400` | — | punto/etiqueta (pendiente elegante) |
| confirmada | `primary` | `#1E40AF` | badge azul sólido |
| en curso | `amber` | `#854D0E` | badge ámbar |
| completada | `green-600` | `#16A34A` | badge verde |
| cancelada | `red-600` | `#DC2626` | badge rojo |

**Peligro** (acciones destructivas, errores)

| Token | Hex | Uso |
|---|---|---|
| `red-600` | `#DC2626` | solo para errores y acciones destructivas |

✅ `cancelada` ya **no** está sobrecargado: el estado usa `red-600` solamente en
el badge de estado; las acciones de eliminar/error usan los mismos rojos del tema pero
en la semántica correcta.

**Nota sobre Tailwind v4:** las variables del `@theme` se emiten **bajo demanda**,
solo si alguna clase las usa. Es normal que un token definido no aparezca en el CSS
compilado hasta que se use.

### 11.2 Tipografía

**El proyecto no carga ninguna fuente externa.** Verificado: `index.html` solo tiene
favicon + viewport (sin `<link>` a Google Fonts, sin preconnect), `src/index.css` no
tiene `@font-face` ni `font-family` suelta, no existe `tailwind.config.js` y
`package.json` no trae ninguna librería de fuentes. La landing pública y el admin
comparten por lo tanto las **mismas dos pilas del sistema**:

- **UI / body / navegación / labels / tablas / inputs:** token `--font-sans` =
  `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial,
  sans-serif`. Antes era el default implícito de Tailwind; ahora está declarado
  explícitamente en el `@theme` para que quede nombrado y no dependa del default.
- **Display:** token `--font-serif` =
  `ui-serif, Georgia, Cambria, "Times New Roman", serif`.
- `body` lleva `-webkit-font-smoothing: antialiased` (fuera del `@theme`, al final de
  `src/index.css`): sin esto el peso se ve más pesado en macOS.
- ⚠ **No añadas Google Fonts, CDN ni `@font-face`** (§17). Si en algún momento se
  quiere una fuente real, es una migración consciente del producto completo —no un
  `<link>` suelto en un componente—, y hay que actualizar landing y admin a la vez.
- Dónde va serif: títulos de página del admin (`font-serif text-3xl`), títulos de
  panel y de modal (`text-lg` / `text-base`), cifras de las tarjetas de métricas
  (`text-3xl`), la hora en la tabla de `CitasAdmin` (`text-sm`) y la fecha del
  navegador de citas (`text-sm`). **Las 34 apariciones de `font-serif` en `src/` son
  todas deliberadas; no hay ninguna fuente distinta colgando de alguna página.**
- **Cifras y horas: `tabular-nums` siempre.** Sin esto las columnas tiemblan.
- Escala en el admin: `text-xs` / `text-sm` / `text-lg` / `text-xl` / `text-3xl`.
  El salto de UI a display es deliberado.

### 11.3 Recetas del dashboard

- **Acción primaria**: `bg-primary text-white font-semibold` con
  `hover:bg-[#1a38a0] disabled:opacity-50`. Botones de admin
  en minúscula y **sin símbolo `+`**. Nunca `bg-white`.
- **Acción ghost / texto**: `text-coffee-600 hover:bg-cream-200 hover:text-coffee-900`
  (Editar, Cancelar, logout).
- **Acción destructiva**: `text-danger-400` con `hover:bg-danger-400/10`. Nunca
  pill relleno.
- **Superficie**: `bg-cream-100 border border-cream-300 rounded-lg`. Nótese que el
  admin **ya no usa `rounded-xl`**, ni superficies como el kit de tarjetas SaaS.
- **Inputs**: `bg-white border-cream-300 text-coffee-900 placeholder:text-coffee-400`,
  con label visible `text-sm text-coffee-600` encima.
- **Foco**: `focus-visible:ring-2 focus-visible:ring-terracotta-400/60` (o
  `ring-danger-400/60` en destructivas). **El `outline-none` nunca va solo** — un
  anillo terracota lo acompaña siempre.
- **Indicador de ruta activa**: `border-l-2 border-terracotta-400` + `text-coffee-900`,
  con `border-transparent` en el inactivo para no desplazar el layout.
  **Nunca un fondo terracota relleno.**
- **Indicador de estado**: punto `h-1.5 w-1.5 rounded-full` + etiqueta
  `text-xs capitalize`. **Nada de pills grandes como representación primaria del
  estado.**
- **Idioma: 100% español** en toda la UI.
- Los placeholders de marca (`"Nombre Barberia"`, `Lorem ipsum`, `"Kromatik
  Admin"`) siguen sin sustituir: son marcadores pendientes del negocio.

### 11.4 Lenguaje del dashboard (lo que NO debe aparecer)

- **Sin gradients.** Ningún `bg-gradient-*`, ni `linear-gradient`, ni washes decorativos.
- **Sin glow.** Ningún `drop-shadow-*`, ni halo, ni resplandor en el acento.
- **Sin glassmorphism** ni fondos translúcidos de cristal.
- **Sin sombras fuertes.** Si necesitas separación, usa `border-slate-200`.
- **Sin pills grandes de color.** El estado se comunica con nodo/punto + etiqueta.
- **Sin animaciones innecesarias.** Nada de pulso, rebote, entradas animadas ni hover en
  cada tarjeta. Lo único que se mueve es un `transition-colors` en hover/focus de
  controles, que es el patrón de todo el admin.
- **Sin sombras como sistema de jerarquía**: la jerarquía se construye con
  `slate-*` (superficie), `navy` (peso textual) y `font-serif` (display).

⚠ **Esta lista mezcla dos generaciones del admin.** Las viñetas sobre `cream-*`/
`coffee-*`/`border-cream-300` quedaron del sistema anterior; el admin actual usa
`slate-*`/`navy`/`primary`/`amber`. Lo vigente es §11.1. `CitasAdmin` ya no usa ningún
token `ink-*`/`bone-*`/`terracotta-*`/`cream-*`.

### 11.5 Reglas que siguen vigentes para todo el proyecto

- **Idioma de la UI: español.** No lo traduzcas.
- **Light mode en `/admin` y en `/cliente`, dark en el público.** El sitio público
  conserva su dark. **No hay theme switcher** en ninguna zona.
- Textos `Lorem ipsum` y datos de ejemplo son placeholders, no contenido final. En
  `/contacto` además **todas las sedes están vacías** (nombre, dirección, horarios,
  teléfono y `mapQuery` en blanco), así que los mapas no muestran nada real (§18.47).
- El sitio público conserva su sistema visual anterior. No lo "normalices" al
  nuevo sin que el usuario lo pida (§17).

### 11.6 Accesibilidad (estado actual, no ideal)

**Resuelto en el rediseño del admin:**
- Foco visible por teclado en botones, enlaces de nav e inputs del admin.
- Todos los inputs de los Forms (`ServicioForm`, `ProductoForm`, `BarberoForm`,
  `CitaManualForm`) tienen `<label htmlFor>` + `id` reales.
- Los dos switches (en `BarberosAdmin` y `BarberoForm`) tienen `role="switch"` +
  `aria-checked`.
- Los tabs de estado de `CitasAdmin` son un `role="group"` con `aria-pressed` en cada
  botón (no un `tablist` sin `tabpanel`, que sería ARIA incompleto).
- El toggle de vista de `CitasAdmin` también usa `aria-pressed`; los botones de navegación
  de fecha llevan `aria-label` y el de hoy lleva `aria-current="date"`.
- Los `<img>` de barbero en la tabla de citas llevan `alt={nombre}`.
- Los **tres** menús hamburguesa (`AdminDashboard` en `<lg`, `ClienteDashboard` en
  `<lg`, `Navbar` en `<md`) exponen `aria-label` dinámico ("Abrir menú" / "Cerrar
  menú"), `aria-expanded` y `aria-controls` apuntando al `id` del panel desplegable;
  los íconos SVG llevan `aria-hidden` y el botón tiene `focus-visible:ring-2`.
- Los links del `Navbar` son `NavLink`, así que la ruta actual recibe
  `aria-current="page"` sin código extra.
- Los tabs Próximas/Historial de `CitasCliente` usan `role="tablist"` + `role="tab"` +
  `aria-selected`, y sus modales usan `role="dialog"` + `aria-modal="true"` +
  `aria-label`.
- Los botones "Quitar {servicio}" del sidebar de `BookingPage` llevan `aria-label` con
  el nombre del ítem, y las horas no disponibles llevan `title="Horario no disponible"`.

**Pendiente (no lo escales sin consultarlo, pero no lo empeores):**
- Sin `aria-live` en los mensajes de error ni en los estados de carga. `CitasAdmin`
  usa `role="alert"` en el banner de error de escritura (parcial, no es `aria-live`).
- La barra de búsqueda del topbar del admin es decorativa: no filtra nada. El
  `ClienteDashboard` **no la tiene**, así que el portal del cliente no arrastra esa
  deuda.
- ⚠ Los tabs de `CitasCliente` son un `role="tablist"` **sin `tabpanel`**: es ARIA
  incompleto, justo lo que el admin evitó a propósito usando `role="group"` +
  `aria-pressed` en lugar de un tablist (§18.48).
- ⚠ El modal de `BookingPage` (confirmación final) **no** tiene `role="dialog"`, a
  diferencia de los de `CitasCliente` y de los `*Form` del admin.
- El sitio público no tiene labels asociados en sus inputs: en `/agendar` los campos
  del paso 3 usan `<label>` **sin `htmlFor`/`id`**, y los inputs de filtro de
  `ServiciosPage`/`ProductosPage` dependen solo del `placeholder`.

---

## 12. Responsive design

**El admin y el sitio público tienen su propio layout responsive**, ya que tienen
sistemas visuales separados (§11). El rediseño del admin **no modificó el sitio
público**: los patrones de abajo marcan qué zona usa cada patrón.

Sin `tailwind.config.js`: los breakpoints son los **defaults de Tailwind v4**
(`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px). No hay container queries ni
valores personalizados. No hay light mode ni theme switcher, y no se han añadido
librerías visuales ni de UI: el layout es Tailwind inline y nada más.

### 12.1 Dashboard `/admin` (sistema crema actual)

| Patrón | Dónde |
|---|---|
| `flex min-h-screen flex-col bg-slate-50 lg:flex-row` | raíz del shell en `AdminDashboard` |
| `fixed … lg:static lg:flex lg:w-64` | rail lateral en desktop; en `<lg` el `<aside>` queda `hidden` |
| `lg:hidden` | barra superior con identidad + hamburguesa, y el panel desplegable (`fixed inset-x-0 top-14`) |
| `border-slate-200` | bordes del sidebar, de la barra superior y del panel móvil |
| `bg-white` | fondo del sidebar, de la barra superior y del panel móvil |
| `fixed inset-0 z-30 … lg:hidden` | capa exterior que cierra el menú al tocar fuera (admin y `Navbar`) |
| `z-40` / `z-50` | barra superior (z-40) y panel desplegable (z-50), por encima de la capa exterior |
| `max-h-[calc(100vh-3.5rem)] overflow-y-auto` | el panel móvil hace scroll si los 6 links + perfil no caben |
| `flex-1 p-4 lg:p-6` | `main`, que aloja el `<Outlet />` directamente |
| `grid gap-4 lg:grid-cols-3` | panel inferior de `CitasAdmin` (sillones / distribución / recordatorios) |
| `grid grid-cols-2 gap-4 lg:grid-cols-4` | las 4 métricas de `CitasAdmin` |
| `overflow-x-auto` + `min-w-[900px]` en la `<table>` | las 7 columnas de citas no entran en móvil: la tabla hace scroll horizontal en vez de deformarse |
| `flex flex-wrap items-center gap-2` | fila de controles de `CitasAdmin` (fecha, barbero, toggle) |
| `grid grid-cols-2 sm:grid-cols-4` | tarjetas de `ResumenPage` |
| `flex flex-wrap … sm:flex-nowrap` + `w-full justify-end sm:w-auto` | filas de los CRUD: las acciones bajan de línea en móvil |
| `truncate` + `min-w-0 flex-1` + `shrink-0` en el bloque de precio/fecha | antioverflow horizontal en listas |
| `max-h-[90vh] overflow-y-auto` + `w-full max-w-md` | los tres modales + `CitaManualForm` |
| `p-5 sm:p-6`, `gap-3 sm:gap-4`, `px-4 sm:px-5`, `h-12 sm:h-14` | padding y tamaño escalonados en todo el admin |
| `grid gap-4 sm:grid-cols-2` | Costo/Duración en `ServicioForm`, y teléfono/correo + fecha/hora + barbero/total en `CitaManualForm` |
| `overflow-x-auto` + `min-w-[760px]` en la `<table>` | la tabla de `ServiciosAdmin` (5 columnas) también hace scroll horizontal en móvil |
| `grid grid-cols-2 gap-4 lg:grid-cols-3` | las 3 métricas de `ServiciosAdmin` (la 3ª ocupa `col-span-2 lg:col-span-1`) |

El shell del admin **sí es responsive**: en `<lg` la navegación vive en el menú
hamburguesa y en `lg+` en el rail lateral. Es el único archivo del admin con
`useState` para navegación, y ese estado no hace nada por encima de `lg`.

### 12.1b Portal del cliente `/cliente`

`ClienteDashboard.jsx` **copia el patrón del shell del admin tal cual** (§12.1): misma
raíz `flex min-h-screen flex-col bg-slate-50 lg:flex-row`, mismo `<aside>`
`fixed … lg:static lg:flex lg:w-64` con `hidden` por debajo de `lg`, misma barra móvil
`relative z-40 h-14 … lg:hidden`, mismo panel `fixed inset-x-0 top-14 z-50` y misma
capa exterior `fixed inset-0 z-30 bg-navy/20 lg:hidden`. **Si cambias uno, cambias los
dos.**

| Patrón | Dónde en `/cliente` |
|---|---|
| `flex min-h-screen flex-col bg-slate-50 lg:flex-row` + `onKeyDown` para `Escape` | raíz del shell |
| `flex-1 p-4 lg:p-6` | `main` que aloja el `<Outlet />` |
| `sticky top-0 z-30 border-b border-slate-200 bg-white` + `h-14 … px-4 lg:px-6` | topbar con el saludo |
| `sm:inline-flex` | el enlace "Ver sitio web" (oculto en móvil) |
| `mx-auto max-w-3xl` | contenedor de `CitasCliente` |
| `flex flex-wrap items-start justify-between gap-3` | cabecera de "Mis citas" + botón "+ Nueva cita" |
| `flex-1 rounded-md px-3 py-2 text-sm` sobre `bg-slate-200/60 p-1` | tabs Próximas/Historial |
| `flex flex-wrap gap-2` | botones "Reagendar" / "Cancelar cita" de cada tarjeta |
| `max-h-[90vh] w-full max-w-md overflow-y-auto` | modales de cancelar/reagendar |

No hay tablas en el portal del cliente: las citas son **tarjetas**
(`rounded-xl border border-slate-200 bg-white p-4`), así que no hay ningún
`overflow-x-auto` que se desborde en móvil.

### 12.2 Sitio público (sin cambios)

| Patrón | Dónde |
|---|---|
| `px-8 py-16` + `max-w-7xl mx-auto` | contenedores y secciones públicas |
| `grid md:grid-cols-2 gap-12` | `Hero` (texto + imagen) |
| `grid md:grid-cols-2 gap-8` | encabezado de sección de `Servicios` / `Productos` |
| `grid sm:grid-cols-2 lg:grid-cols-4 gap-4` | grid de tarjetas de `Servicios` y `Productos` (la landing) |
| `grid lg:grid-cols-3 gap-8` + `lg:col-span-2` | `BookingPage` |
| `grid sm:grid-cols-2 gap-4` | selector de servicio, datos del cliente y tarjetas de barbero en el wizard |
| `grid grid-cols-7 gap-2` | strip de días del wizard |
| `scroll-mt-4` + `id="servicios"` / `id="productos"` | secciones ancla de la landing (destino del CTA del Hero) |
| `hidden md:flex` | links y sección derecha del `Navbar` |
| `md:hidden` | hamburguesa del `Navbar` y su panel desplegable |
| `lg:sticky lg:top-8 h-fit` | sidebar de resumen del wizard |
| `flex flex-wrap gap-3` | chips de hora del wizard |
| `px-4` | `LoginPage` y contenedores centrados pequeños |
| `max-w-3xl` | contenido de `ServiciosPage`, `ProductosPage` y `ContactoPage` |

Gaps y paddings en uso: `gap-2/3/4/6/8/10/12`, `p-4/p-5/p-6/p-8`, `mb-2/4/6/8/10`,
`px-4/5/6/8`.

### 12.3 Puntos débiles preexistentes (no los arregles sin avisar)

- `Navbar`: los links **y** la sección derecha (sesión + `AGENDAR CITA`) desaparecen
  bajo `md`, pero hay **menú hamburguesa** que los recupera, incluido el teléfono
  `+00 00000000` que antes solo se veía en `lg+`.
- `BookingPage`: los `dias` son una tira fija de 7 columnas sin scroll horizontal.
- `App.css` (muerto) sí tenía sus propios `@media (max-width: 1024px)`, pero no se
  aplica.
- ⚠ Los **tres** menús hamburguesa (admin, cliente y público) cierran con `Escape`
  **solo si el foco está dentro**, porque el listener es un `onKeyDown` en el
  contenedor y no un `document.addEventListener`. Es deliberado: evita `useEffect` +
  listener global. Si algún día hace falta cerrar desde fuera, habrá que añadir el
  listener global **solo** a esos tres shells.
- ⚠ El panel móvil del `Navbar` **empuja** el contenido en vez de flotar sobre él (no
  es `fixed` como los de los paneles del admin y del cliente), porque el `<nav>` no es
  `sticky`. Al abrirlo, la página salta. No es un bug de layout, pero se nota al
  navegar en móvil.

Al añadir UI responsiva, sigue los patrones de §12.1 (admin) o §12.2 (público)
según la zona, en vez de inventar un sistema.

---

## 13. Manejo de errores

**No existe manejo de errores global.** No hay error boundary, ni interceptor de
Supabase, ni librería de notificaciones, ni toast. El patrón es **por estado local**,
y hay tres variantes distintas en el proyecto:

**A. Lecturas — el error se descarta (patrón mayoritario).**
En los cinco `cargarX()` y en el insert del wizard:
```js
const { data } = await supabase.from('x').select('*')   // ← `error` nunca se revisa
setX(data || [])
```
Si la petición falla, la lista queda vacía y el usuario ve el estado vacío
("Aún no hay servicios.") **en lugar de un error**. Los `|| 0` de `ResumenPage` evitan
que un `count` `null` rompa el render.

⚠ **Excepción ya resuelta en 2 sitios** (patrón correcto, no lo "normalices"):
`Servicios.jsx` y `Productos.jsx` (públicos) revisan el `error`, muestran un estado
**"No pudimos cargar los servicios/productos."** con botón **"Reintentar"** que
vuelve a llamar al `cargarX()`, y `CitasCliente` tiene un `errorCarga` aparte con
`role="alert"`. Ninguno de los dos es un `try/catch`: es `if (error) { console.error;
setError(true) }` con su propio flag.

**B. Escrituras en formularios — `try/catch` + mensaje genérico.**
Los tres `*Form` usan el bloque `try { … if (error) throw error; onGuardado() } catch
{ console.error; setErrorMsg('Algo salió mal, intenta de nuevo.'); setGuardando(false) }`.
El mensaje es **siempre el mismo**, nunca se muestra el error real de Supabase al
usuario. Ojo: en el `catch` se forgetea `guardando`; en éxito el componente se
desmonta (lo llama `onGuardado` → `setMostrarForm(false)`).

**C. Wizard, login y portal del cliente — `if (error)` + estado de pantalla.**
`BookingPage` / `BookingForm` / `LoginPage` / `CitasCliente` revisan el `error` y
setean `estadoEnvio`/`error` local; el texto al usuario es fijo. Lo particular de
`CitasCliente` es que **distingue** el `23505` (slot tomado → refresca horas y avisa) del
resto ("No se pudo reagendar la cita. Intenta de nuevo."), y es el único que muestra el
mensaje real de Supabase cuando el registro falla (`registerError.message` en
`LoginPage`, §6.3).

⚠ El registro de `LoginPage` **sí** muestra el mensaje crudo de Supabase
(`registerError.message`, en inglés y a veces técnico) mientras que el login muestra un
texto fijo en español. Inconsistencia de UX, no un bug.

**D. Deletes — `confirm()` nativo, sin manejar el error.**
```js
if (!confirm('¿Eliminar este servicio?')) return
await supabase.from('servicios').delete().eq('id', id)
cargarServicios()
```

**Estados de carga**: cada vista tiene su `cargando` con el texto literal
`Cargando...` (`text-neutral-400` en el admin, `text-white` en `ProtectedRoute` y
`ResumenPage`). No hay skeletons ni spinners.

**Al añadir un `try/catch` nuevo:** mantén el estilo del archivo (consola + estado
local + `text-red-400 text-sm`). No introduzcas un patrón distinto sin acordarlo.

---

## 14. Comandos del proyecto

Gestor: **pnpm** (hay `pnpm-lock.yaml`; no mezcles con `npm` ni `yarn`).

```bash
pnpm install     # instala dependencias según pnpm-lock.yaml
pnpm dev         # vite dev server con HMR
pnpm build       # vite build  → dist/
pnpm preview     # sirve dist/ localmente
pnpm lint        # eslint .
```

Son los **únicos 4 scripts** que existen en `package.json`. No hay `test`, ni
`typecheck`, ni `format`, ni scripts de deploy.

Configuración relevante:
- `vite.config.js` (íntegro): `plugins: [react(), tailwindcss()]`. Sin `server`, sin
  `alias`, sin `proxy`, sin variables de build. Si añades un alias `@/`, actualiza
  también los imports o déjalo para otro cambio.
- `eslint.config.js` (flat config): `js.configs.recommended` +
  `reactHooks.configs.flat.recommended` + `reactRefresh.configs.vite`, con
  `globals.browser` y `ecmaFeatures: { jsx: true }`. `globalIgnores(['dist'])`.
  **No hay reglas de stylistic ni prettier**: el formateo es el que ya exista en el
  archivo que edites.
- `index.html`: `lang="en"`, `title` = `barberia`, favicon `/favicon.svg`, viewport
  estándar. No hay otras meta tags ni fuentes externas.

---

## 15. Cómo verificar cambios

**No hay tests automatizados.** La verificación es manual + lint + build.

```bash
pnpm lint        # DEBE seguir fallando con EXACTAMENTE los mismos 10 errores (§15.1)
pnpm build       # DEBE terminar sin errores
pnpm dev         # smoke test manual en el navegador
```

### 15.1 Línea base de lint (preexistente, medida)

`pnpm lint` **falla en el estado actual del repo** con:

```
✖ 10 problems (10 errors, 0 warnings)
```

**Desglose exacto por archivo, línea y regla** (medido con
`pnpm exec eslint . --format json` el 2026-10-12, después del pull `853ca9f..8809213`):

| # | Archivo | Línea | Regla |
|---|---|---|---|
| 1 | `src/context/AuthContext.jsx` | 69 | `react-refresh/only-export-components` |
| 2 | `src/components/Servicios.jsx` | 25 | `react-hooks/immutability` |
| 3 | `src/components/Productos.jsx` | 17 | `react-hooks/immutability` |
| 4 | `src/pages/ServicesPage.jsx` | 12 | `react-hooks/immutability` |
| 5 | `src/pages/ProductosPage.jsx` | 12 | `react-hooks/immutability` |
| 6 | `src/pages/admin/BarberosAdmin.jsx` | 89 | `react-hooks/immutability` |
| 7 | `src/pages/admin/CitasAdmin.jsx` | 296 | `react-hooks/immutability` |
| 8 | `src/pages/admin/ProductosAdmin.jsx` | 64 | `react-hooks/immutability` |
| 9 | `src/pages/admin/ResumenPage.jsx` | 77 | `react-hooks/immutability` |
| 10 | `src/pages/admin/ServiciosAdmin.jsx` | 111 | `react-hooks/immutability` |

Totales:

| Regla | Cantidad |
|---|---|
| `react-hooks/immutability` | 9 |
| `react-refresh/only-export-components` | 1 |
| **Total** | **10 errores, 0 warnings** |

📈 **La línea base subió de 8 a 10** con el pull `853ca9f..8809213`, que puso a
`Servicios.jsx` y `Productos.jsx` (los públicos) a leer de Supabase con el patrón
`useEffect(() => { cargarX() }, [])` **antes** de declarar `cargarX` con `const`. Los
otros 8 ya estaban (5 del admin, `AuthContext`, `ProductosPage` y `ServicesPage`).
Fue un cambio del usuario; aquí queda registrado para que nadie lo cuente como
regresión propia.

Los 9 de `react-hooks/immutability` comparten el mismo mensaje,
*"Cannot access variable before it is declared"*: el patrón
`useEffect(() => { cargarX() }, [])` invoca una función declarada después con
`const`.

**Estos errores son baseline preexistente. NO deben corregirse como parte del
rediseño visual ni de ningún trabajo no solicitado.** Reglas:

- No los "arregles" de paso mientras haces otra cosa: mezclar un fix no solicitado
  con tu cambio vuelve el diff imposible de revisar.
- **No subas el número.** Si tu cambio añade un error, el total será > 10 y eso es
  **un fallo tuyo**. El desglose por archivo de arriba es la referencia.
- Si te piden arreglarlos, es un task aparte: mueve la función **arriba** del
  `useEffect` o conviértela en `function` declaration / `useCallback`.

**Archivos con 0 errores** (referencia de que el patrón se puede hacer bien):
`App.jsx`, `main.jsx`, `Navbar.jsx`, `Hero.jsx`, `Contacto.jsx`, `LoginPage.jsx`,
`BookingPage.jsx`, `supabaseClient.js`, `ConfiguracionProvider.jsx`,
`configuracion.js`, `useConfiguracion.js`, `useConfirmarCita.js`,
**`src/pages/cliente/ClienteDashboard.jsx` y `CitasCliente.jsx`**,
`AdminDashboard.jsx`, `ConfiguracionAdmin.jsx`, los 4 `*Form` y `CitaManualForm.jsx`.

⚠ `CitasCliente.jsx` tiene un `// eslint-disable-next-line react-hooks/set-state-in-effect`
en su efecto de carga: **no lo quites** al "arreglar" esa página, o aparecerá un error
nuevo. El patrón correcto ya está aplicado ahí: `cargarCitas` en
`useCallback([userId])` (§9.7).

**Histórico del rediseño visual del admin (9 etapas).** En cada etapa se ejecutó
`pnpm lint` y no se introdujeron errores nuevos. Los totales de aquella época (6 y 7)
**ya no aplican**: el repo cambió por debajo con el pull del portal del cliente. Se
conservan solo como registro de qué archivos se tocaron.

| Etapa | Archivo tocado | Resultado de entonces |
|---|---|---|
| 1 | `src/index.css`, `AdminDashboard.jsx` | 0 nuevos |
| 2 | `src/index.css`, `ResumenPage.jsx` | 0 nuevos |
| 3 | `ServiciosAdmin.jsx`, `ProductosAdmin.jsx`, `BarberosAdmin.jsx` | 0 nuevos |
| 4 | `CitasAdmin.jsx` | 0 nuevos |
| 5 | `ServicioForm.jsx`, `ProductoForm.jsx`, `BarberoForm.jsx` | 0 nuevos |
| 6 | `src/index.css` (tokens) + todos los admin | 0 nuevos |
| 7 | `CitasAdmin.jsx` (reescrito) + `CitaManualForm.jsx` (nuevo) | 0 nuevos |
| 8 | `ServiciosAdmin.jsx`, `ServicioForm.jsx` | 0 nuevos |
| 9 | `ProductoForm.jsx`, `BarberoForm.jsx`, `ProductosAdmin.jsx`, `src/index.css` | 0 nuevos |

`pnpm build` terminó correctamente en las 9 etapas, sin errores de compilación de
clases Tailwind.

### 15.2 Checklist manual por área

Probado en Chrome DevTools. La app necesita `.env` con las dos variables válidas y
**conectividad a Supabase** — sin red los listados del admin salen vacíos.

- **`/`** — carga el hero con `/barber.jpg`; "EXPLORAR SERVICIOS ↓" hace scroll suave a
  la sección de servicios; los grids de `Servicios` y `Productos` cargan desde Supabase
  (y con Supabase caído muestran "No pudimos cargar…" + botón Reintentar); click en una
  tarjeta navega a `/agendar?servicio=...` y el query param **no** preselecciona nada
  (esperado, §18.3).
- **`/servicios`, `/productos`, `/contacto`** — cargan dentro del layout público y el
  `Navbar` marca el link de la ruta actual; en `<md` el menú hamburguesa abre y cierra.
  `/contacto` hoy muestra mapas vacíos porque las sedes son placeholders (§18.47).
- **`/agendar` sin sesión** — los 3 pasos avanzan sin pedir nada; al pulsar confirmar,
  el botón dice "INICIAR SESIÓN PARA RESERVAR →" y **guarda el borrador**: al entrar te
  devuelve a `/agendar` con servicios, productos, barbero, fecha, hora y datos del
  cliente ya restaurados (§8).
- **`/agendar` con sesión** — confirmación; el sidebar refleja servicios/productos/
  duración/total; "Agregar otro servicio o producto" en el modal conserva la selección;
  al confirmar aparece "¡Reservación confirmada!" y **se inserta una fila en `citas`
  con `cliente_id` poblado** (verifícalo en el dashboard de Supabase).
- **`/login`** — credenciales malas → "Correo o contraseña incorrectos."; buenas →
  `/admin` si `role === 'admin'`, si no → `/`. El enlace de registro crea la cuenta y
  muestra "¡Cuenta creada con éxito!" (no entra solo).
- **`/cliente` sin sesión** — redirige a `/login` (mismo guard que `/admin`).
- **`/cliente` con sesión de cliente** — solo aparecen las citas con
  `cliente_id = auth.uid()` (las de `cliente_id IS NULL` **no** se ven); los tabs
  Próximas/Historial cuadran con los estados de la BD; "Reagendar" mueve la cita y
  respeta el `23505`; "Cancelar" la deja en `cancelada` **sin** borrarla.
- **`/cliente` con sesión de admin** — entra (el guard no mira el rol) y ve la lista
  vacía (esperado, §5).
- **`/admin` sin sesión** — redirige a `/login`.
- **`/admin`** — los 4 contadores coinciden con Supabase; "Citas de esta semana" filtra
  bien; el item activo del sidebar es correcto también en las subrutas.
- **CRUD de cada entidad** — crear (con y sin imagen), editar (comprobando que **subir
  imagen nueva sustituye la URL** y que no subirla **la conserva**), eliminar (aparece
  el `confirm`), y que la lista se recargue.
- **`/admin/citas`** — seleccionar una cita abre el detalle; los 4 botones de estado
  cambian el color del badge y persisten tras recargar; una cita **sin `estado`** (las
  nuevas) se muestra como `pendiente`; una cita con **varios servicios** los muestra en
  lista y suma sus duraciones; los productos de la cita salen como `+ Nombre · $X MXN`.
- **`/admin/configuracion`** — guardar cambia nombre y logo **en vivo** en el rail del
  admin (misma fila `configuracion`), sin recargar.
- **Logout** — cierra sesión y `/admin` **y** `/cliente` vuelven a pedir login.
- **Responsive** — reduce a 375px y 768px: la landing, `/agendar` y los dos paneles
  (admin y cliente) se adaptan; el rail se sustituye por el menú hamburguesa en los tres
  shells.
- **Errores** — con Supabase caído, los listados del admin muestran el estado vacío, no
  un mensaje de error (esperado, ver §13.A); en cambio los catálogos públicos y
  `/cliente` **sí** avisan del fallo (§13.A).

### 15.3 Estado de git (importante)

El repo ya está **publicado y con historial**: 30 commits, con merges de PR (#12, #13,
#14). Todo el trabajo anterior que estaba "solo en el working tree" (panel de admin,
auth, contexto de configuración, wizard) **ya está commiteado**.

Estado del working tree en 2026-10-12: un único archivo modificado,
`src/context/ConfiguracionProvider.jsx`, y el cambio es **solo comentarios**: se
borraron las 4 líneas de cabecera del archivo (`// src/context/…` y el párrafo que
explicaba el provider). Ningún cambio funcional. Sin archivos sin trackear.

⚠ Aun así, **antes de cualquier comando destructivo** (`checkout`, `restore`, `reset`,
`stash`) pregúntalo: `git reset --hard` o un `restore` masivo tirarían la rama de
trabajo del cliente y el rediseño del admin si no están commiteados. Comprueba
`git status` primero.

---

## 16. Archivos sensibles

| Archivo | Por qué |
|---|---|
| `.env` | Credenciales de Supabase. Gitignored. **Nunca commitear, nunca imprimir en una respuesta, nunca subir.** |
| `src/supabaseClient.js` | Único punto de conexión. Un typo en el nombre de la env var rompe **toda** la app silenciosamente. |
| `src/context/AuthContext.jsx` | Sesión y `onAuthStateChange`. El cleanup incorrecto deja listeners duplicados. |
| `src/components/ProtejerRuta.jsx` | Guard de rutas de **`/admin` y `/cliente`**. Romperlo deja ambos paneles abiertos o inaccesibles. |
| `src/main.jsx` | Orden de los providers (`BrowserRouter` > `AuthProvider`). |
| `src/App.jsx` | Tabla de rutas **y** los 3 layouts. Único lugar donde se registran las páginas. La ruta `/cliente` está al final del `<Routes>`, fuera del layout público. |
| `package.json` / `pnpm-lock.yaml` | No los edites para "subir una dependencia menor". |
| `public/barber.jpg` | 2.2 MB, referenciado por ruta absoluta `/barber.jpg` en `Hero.jsx`. Si lo mueves o renuevas, actualiza el `src`. |
| `src/pages/BookingPage.jsx` | El archivo más grande y el más frágil del flujo de citas (985 líneas: wizard + borrador en `sessionStorage` + auto-asignación de barbero). §8. |
| `src/pages/cliente/CitasCliente.jsx` | Única vista de las citas del usuario. Depende de la política `cliente ve sus citas` **y** de las RPC `cancelar_cita` / `reagendar_cita`: si cambias cualquiera de las dos cosas, revisa este archivo y sus modales. |
| `src/pages/admin/CitasAdmin.jsx` | Único archivo del frontend con los recordatorios: el WhatsApp manual (§9.5) y el interruptor del automático (§9.5). Si lo rompes, el canal de respaldo y el que apaga el automático se caen juntos. |
| `supabase/functions/enviar-recordatorios/index.ts` | **Nunca debe llevar un secreto.** Todo se lee del entorno. Si aparece una clave ahí, hay que borrarla y rotarla. |
| `cron.job` (`enviar-recordatorios`) | El comando lleva la `anon` key (pública) y **lee el secreto de Vault en vivo**: si alguien reescribe el job a mano, que no lo hardcodee. Se recrea con `cron.unschedule` + `cron.schedule` (§10.7). |
| `src/pages/cliente/ClienteDashboard.jsx` | Shell de `/cliente`. Copia el patrón de `AdminDashboard`: si cambias uno, cambia los dos (§12.1b). |
| `vite.config.js` / `eslint.config.js` | Afectan a toda la app. El lint ya falla (§15.1): tocar la config puede cambiar la línea base entera. |

---

## 17. Qué NO debe modificar o romper el agente

**Dependencias y stack — no los cambies**
- **No agregues, quites ni subas dependencias.** No hay tarea que lo justifique; si
  parece necesaria, **pregunta primero**.
- **No migres a TypeScript.** No hay `tsconfig.json`; es una decisión de proyecto.
- **No introduzcas un gestor de estado** (Redux, Zustand, Jotai, contexto nuevo).
  El patrón es `useState` + `useContext` + props.
- **No añadas librerías de UI, de iconos, de fechas o de validación.** No hay ninguna:
  la UI es Tailwind y el bundle es mínimo a propósito. Sigue sin haber ninguna
  después del rediseño del admin.
- **No crees `tailwind.config.js`.** Los tokens del dashboard viven en el bloque
  `@theme` de `src/index.css` (§11.1), que es el mecanismo nativo de Tailwind v4.
  Si necesitas un token nuevo, **añádelo ahí**, no hardcodees el hex en el JSX.
- **No cambies el nombre de la variable de entorno** `VITE_SUPABASE_PUBLISHABLE_KEY`
  por `VITE_SUPABASE_ANON_KEY` u otro.

**Backend y datos**
- **No renombres ni reconfigures las tablas** de Supabase (`citas`, `servicios`,
  `productos`, `barberos`, `configuracion`).
- **No unifiques `servicios.costo` y `productos.precio`** sin migrar también las
  consultas, los formularios y la UI.
- **No cambies el bucket `imagenes`** ni las carpetas `servicios/`, `productos/`,
  `barberos/`. No lo hagas privado sin migrar las URLs ya guardadas.
- **No introduzcas políticas de RLS, vistas, funciones SQL ni triggers** sin autorización
  explícita. **Las 6 tablas YA tienen RLS habilitado** con las políticas de §10.5: no es
  opcional ni se puede "quitar". Cinco trampas concretas: (1) el sitio público inserta en
  `citas` con la clave publicable desde el navegador, así que **cualquier política sobre
  `citas` debe admitir `INSERT` tanto a `anon` como a `authenticated`**, o se rompe el
  agendamiento para los usuarios registrados;
  (2) el panel va autenticado, así que **cualquier tabla que el panel escriba necesita una
  política `authenticated` cuya condición sea `es_admin()`**, o el `update` afecta 0 filas
  sin avisar;
  (3) una política declarada solo `to anon` **desaparece para quien tiene sesión**:
  PostgREST usa el rol `authenticated` en las peticiones con JWT, así que las lecturas
  del catálogo son `to anon, authenticated`;
  (4) **el cliente solo tiene SELECT sobre `citas`** (`auth.uid() = cliente_id`): cualquier
  escritura suya tiene que pasar por una RPC `SECURITY DEFINER`, no por un `update`
  directo;
  (5) las funciones de `public` (`rol_actual`, `es_admin`, `cancelar_cita`,
  `reagendar_cita`, `asignar_barbero`, `horas_ocupadas`, `recordatorios_secreto_valido`,
  `recordatorios_citas_pendientes`) llevan `revoke all` + `grant execute` a roles
  concretos: **al recrearlas, repite los grants**, o el cliente recibe
  `permission denied`.
- ⚠ **`revoke all from public` NO es lo mismo que "solo `service_role`".** Supabase tiene
  un `alter default privileges` que concede `execute` a `anon` y `authenticated` en el
  esquema `public`: una RPC `security definer` creada con solo `revoke from public` +
  `grant to service_role` sigue siendo **llamable desde el navegador**. Ya pasó con
  `recordatorios_citas_pendientes`, que devolvía nombre, correo y teléfono y saltaba la
  RLS de `citas`. Para cerrarla de verdad hay que **`revoke execute … from anon,
  authenticated, public`** y después el `grant` a `service_role`. Verificado con `proacl`
  y con `set local role anon`. Detalle en §10.7.
- ⚠ **Excepción autorizada (2026-10-13): `supabase/functions/` sí existe.** Antes esta
  regla pedía no crear funciones SQL ni triggers sin autorización; el usuario la dio
  explícitamente para los recordatorios automáticos. Lo que se aplica es:
  - el código de la Edge Function vive en `supabase/functions/enviar-recordatorios/`
    (§4), **fuera de `src/`**, versionado y **sin ningún secreto**;
  - **ningún secreto en el repo**: `RESEND_API_KEY` y el remitente van como secretos de
    la plataforma (§10.7), y el secreto que autoriza a invocar la función se generó en
    la BD y vive **solo en Supabase Vault**;
  - **`service_role` solo dentro de la plataforma**: se usa con la clave que Supabase
    inyecta en la función y **jamás** llega al frontend;
  - lo que **no** se autoriza por esta excepción: meter la Edge Function en el bundle de
    Vite, o llamar a Resend desde el navegador.
- ⚠ **El rol se lee de `perfiles`, nunca de `auth.users.user_metadata`.** No reintroduzcas
  `user_metadata.role` en ninguna pantalla: lo escribe el cliente y por eso era
  auto-asignable (§18.39). Para promover a alguien, SQL; para cambiar de cuenta, login.
- ⚠ **`perfiles` no admite escrituras desde la app, ni con sesión de admin.** Si algún día
  necesitas una pantalla de "usuarios y roles", es una feature nueva que pide
  autorización explícita y una RPC; no abras la tabla con un `grant`.
- ⚠ **El guard de rutas no es la autorización**: `ProtectedRoute` decide la navegación,
  RLS decide los permisos (§5). Que un cliente no vea el panel no significa que no pueda
  escribir, y al revés. Verifica siempre en la BD.
- **No metas claves de servicio (`service_role`) en el frontend.** Todo es
  cliente-side por diseño.
- **No cambies el payload de `citas`** sin actualizar a la vez `CitasAdmin` (que lee
  `correo`, `notas`, `productos`, `total`, `estado`), `CitasCliente` (que lee
  `productos` y filtra por `cliente_id`) y `BookingForm.jsx` si algún día resucita.

**Arquitectura y routing**
- **No muevas `AuthProvider`** fuera de `main.jsx` ni lo bajes dentro de `App`.
- **No elimines `ProtectedRoute`** de las rutas `/admin` **y** `/cliente`, ni sus redirects.
- **No renombres `src/components/ProtejerRuta.jsx`** sin actualizar el import en
  `App.jsx`.
- **No introduzcas `createBrowserRouter` / loaders / actions.** El router es
  `<Routes>` plano; los datos se cargan en `useEffect`.
- **No crees un store de datos "compartido"** para deduplicar los `cargarX()`: cada
  página es dueña de sus datos. Es redundante a propósito y así funciona. La excepción es
  `useConfirmarCita`, que no guarda datos: recibe el setter de la página (§9.8).
- **No conviertas el wizard de 3 pasos** en otra cosa (un formulario único, un modal,
  multi-página). El `pasoActual` + sidebar pegajoso es el diseño acordado.
- **No compongas `AdminDashboard` con `ClienteDashboard`** (ni al revés) para "ahorrar
  código": son copias deliberadas con contenidos distintos (6 links de administración
  frente a 1). Si algún día se unifican, extrae el shell común a un componente nuevo; no
  mezcles las dos páginas.
- **No quites el gate de sesión de `/agendar`** (`requiereLogin` + borrador) sin hablarlo:
  es lo que garantiza que `citas.cliente_id` se rellene y que el portal del cliente vea
  las reservas.

**UI/UX — aplica al dashboard `/admin` y al portal `/cliente`; el sitio público tiene su
propio sistema**

Estas reglas son **específicas de los dos paneles claros**. El sitio público (`/`,
`/agendar`, `/login`, `/servicios`, `/productos`, `/contacto`, `Navbar`, `Hero`,
`Servicios`, `Productos`, `Contacto`) conserva su lenguaje anterior (`neutral-*`,
`sky-500`, `emerald`, `amber`, `yellow`) y **no se "normalizó" al nuevo**: esa costura
es conocida y solo se cierra si el usuario lo pide.

⚠ **Las reglas que vienen a continuación rigen `src/pages/admin/` Y
`src/pages/cliente/`.** `/cliente` usa el mismo sistema claro a propósito (§11) y está
verificado que **no** usa ningún token del tema público (0 coincidencias de
`sky-*`, `emerald-*`, `neutral-*`, `stone-*`, `zinc-*`, `indigo-*`, `yellow-*`).

⚠ **Excepción en `src/pages/cliente/`: los badges de estado usan la escala por defecto
de Tailwind, no los tokens del `@theme`.** `estilosEstado` en `CitasCliente.jsx` pinta
`bg-amber-100 text-amber-800`, `bg-green-100 text-green-800`,
`bg-slate-200 text-slate-700` y `bg-red-100 text-red-700`; además hay un aviso de
domingo cerrado en `text-amber-700` y las acciones destructivas en `red-*`. Son
**shades del Tailwind**, no el token `amber` (`#854D0E`) del panel. Consecuencia visible:
`confirmada` sale **verde** aquí y **azul** en `CitasAdmin` (§9.7). No lo "normalices" sin
acordarlo.

- **No reintroduzcas `sky`, `emerald` ni `amber` como acentos de los paneles.** Ya no
  tienen ningún uso dentro de `src/pages/admin/` ni de `src/pages/cliente/`. Si los ves
  ahí, es un bug.
- **No reintroduzcas `ink-*` ni `bone-*` ni `cream-*` ni `coffee-*` en el admin.** Las paletas anteriores fueron completamente reemplazadas. El admin usa el sistema actual (§11).
- **No reintroduzcas `terracotta-*`, `sage-*`, `muted-blue-*`, `cancelled-*`, `danger-*`.** El esquema anterior se completó; el admin usa el esquema `slate/primary/amber/navy`.
- **No introduzcas gradients, glow, glassmorphism, sombras fuertes ni pills grandes
  de color** en el admin (§11.4). Si crees que hace falta una, es una **decisión de
  diseño explícita**: pregunta primero.
- **No introduzcas un tema claro, ni un conmutador de tema, ni un light mode.** No
  existen en ninguna zona del proyecto.
- **No hardcodees hex en el JSX.** Usa los tokens del `@theme`.
- **No escribas CSS en un `.css` nuevo** ni reintroduzcas `App.css`. Todo es Tailwind
  inline. La única excepción es el `@theme` en `src/index.css`, que es la fuente de
  los tokens del admin.
- **No traduzcas la UI al inglés.** Todo el texto visible va en español.
- **No añadas un sistema de toasts, skeletons o un error boundary** "de paso". Son
  features, no arreglos. El menú hamburguesa ya existe en los dos shells
  (`AdminDashboard` en `<lg`, `Navbar` en `<md`): si lo tocas, **no añadas
  `useEffect` + `addEventListener('keydown')`** para el `Escape`; el patrón del repo es
  `onKeyDown` en el contenedor del shell (ver §9.1 y §12.3).
- **No elimines los placeholders** (`"Nombre Barberia"`, `"Nombre"`, `"+00 00000000"`,
  `Lorem ipsum`, `"Kromatik Admin"`) sin que el usuario los pida: son marcadores
  pendientes de sustituir por los datos reales del negocio.
- No introduzcas más animación en el admin. La única transición permitida es la del
  nodo del rail de `CitasAdmin` (`duration-200` + `motion-reduce:transition-none`).

**Higiene**
- **No borres los archivos de código muerto** (`BookingForm.jsx`, `App.css`,
  `src/assets/*`, `public/icons.svg`) sin preguntar. ⚠ `Productos.jsx` **ya no** está
  en esa lista: se conectó a la landing en 2026-10 (§4).
- **No "mejores" los 10 errores de lint preexistentes** dentro de un cambio ajeno, y
  nunca dejes el total por encima de 10 (§15.1).
- **No borres el `eslint-disable-next-line react-hooks/set-state-in-effect`** de
  `CitasCliente.jsx`: es lo que evita un error nuevo, no una chapuza.
- **No ejecutes comandos destructivos de git** sobre el working tree (§15.3).
- **No toques `.codegraph/`, `.claude/`, `.cursor/`, `.kiro/`, `.vscode/`,
  `.mcp.json`, `opencode.jsonc`** — son configuración de herramientas, incluido el
  bloque `CODEGRAPH_START/END` de este mismo archivo.
- **No añadas dependencias de red en el build** (fuentes, CDNs, imágenes externas)
  salvo el placeholder `https://placehold.co/...` que ya se usa. ⚠ Excepción
  preexistente: los dos `<iframe>` de Google Maps de `Contacto.jsx` ya hacen peticiones
  a google.com/maps desde el navegador.

---

## 18. Deuda técnica conocida

Documentada para que no se rediseñe por accidente. **Ninguna de estas es un bug a
arreglar de paso:**

| # | Ubicación | Estado |
|---|---|---|
| 1 | ~~`BookingPage.jsx:62`~~ | **RESUELTO** (2026-10): la fecha se calcula en hora local con `FechaISO()` y se guarda como `'YYYY-MM-DD'`. |
| 2 | ~~`BookingPage.jsx:43`~~ | **RESUELTO** (2026-10): se eliminó el estado `addon` y el `+250`. El total es solo el `costo` del servicio y la columna `addon` ya no se envía. |
| 3 | `Servicios.jsx` → `BookingPage` | Sigue pendiente: `?servicio=` se navega pero no se lee (`BookingPage` no tiene `useSearchParams`, verificado: 0 coincidencias). En 2026-10 la tarjeta pasó a leer de Supabase, pero **sigue** sin preseleccionar el servicio al que se hizo click. |
| 4 | ~~`BookingPage.jsx:157,169`~~ | **RESUELTO** (2026-10): la tarjeta usa `categoria` (antes `s.etiqueta`), `formatoDuracion(s.duracion)` y `Number(s.costo)`, todo desde la tabla real. |
| 5 | ~~`BookingPage.jsx`~~ | **RESUELTO** (2026-10): el paso 1 consulta `servicios` (`nombre, categoria, descripcion, costo, duracion, imagen`), con estado de carga y vacío ("Aún no hay servicios disponibles"). El 2026-10-12 se le añadieron `productos` y `barberos` (multi-selección). |
| 6 | `citas.servicio` + modelo de slots | Sigue siendo texto plano, no FK → se pueden agendar servicios inexistentes desde otras vías. **Lo de la agenda ocupada sí se resolvió**: RPC `horas_ocupadas` + índice único `citas_slot_unico` (§10.5). Lo que **no** hay es un modelo de horarios/slots: `BLOQUES` sigue hardcodeado, el índice no cubre el solapamiento por intervalo y `barbero_id IS NULL` queda fuera de la unicidad. |
| 7 | ~~`AdminDashboard.jsx:18`~~ | **RESUELTO** (2026-10): el `<aside>` fijo `w-64` pasó a barra superior en `<lg` + rail en `lg+`; además se añadió el menú hamburguesa con `menuAbierto`. Ver §9.1 y §12.1. |
| 8 | ~~`Navbar.jsx`~~ | **RESUELTO** (2026-10): menú hamburguesa en `<md` con links, teléfono, sesión y `AGENDAR CITA`, y los links son `NavLink` a **rutas reales** (`/servicios`, `/productos`, `/contacto`) que ya existen, con `fin` en Inicio y marca de la ruta actual. **Queda**: el `Escape` solo cierra con el foco dentro del `<nav>` (§12.3) y el panel móvil empuja el contenido en vez de flotar. |
| 9 | Todos los `cargarX()` | El `error` de Supabase se descarta; un fallo de red se ve como "lista vacía". Esto afecta también a los estados vacíos del admin, que son sobrios a propósito para no mentir cuando la petición falló. **Excepción ya resuelta** en `Servicios.jsx`, `Productos.jsx` (públicos, con botón Reintentar) y `CitasCliente.jsx` (`errorCarga` + `role="alert"`). |
| 10 | Los tres `*Form` | Mensaje de error único y genérico; nunca se muestra el error real. `guardando` solo se resetea en el `catch`. |
| 11 | Los tres `*Form` | `URL.createObjectURL` nunca se revoca. |
| 12 | Deletes | `confirm()` nativo, y el `error` del `delete` no se maneja. |
| 13 | `*Form` modales | El `<img>` de preview sigue **sin `alt`**. (El `htmlFor` de los labels **ya se resolvió** en el rediseño; sigue sin resolverse el `aria-live` de los errores.) |
| 14 | ~~`AuthContext` / `ProtejerRuta`~~ | **RESUELTO** (2026-10-12): existe el sistema de 3 roles. El rol vive en `perfiles` (§10.2), lo escribe un trigger de la BD y **nadie lo cambia desde la app**; `ProtectedRoute` recibe `roles` y manda al inicio propio cuando no encaja (§5); y **RLS** cierra la escritura del panel con `es_admin()` (§10.5). Verificado simulando roles: un cliente no inserta, no actualiza y no borra nada. |
| 15 | Storage | Los deletes no borran el archivo del bucket → imágenes huérfanas. |
| 16 | `index.html` | `lang="en"` con UI en español; `<title>` = `barberia` en vez del nombre del negocio. |
| 17 | Todo el repo | Textos `Lorem ipsum` y placeholders de marca sin sustituir. |
| 18 | ~~`ResumenPage.jsx:62`~~ | **RESUELTO** en el rediseño: se eliminó el `<p className="text-2xl mb-2">{t.icono}</p>`, que renderizaba vacío porque `tarjetas` nunca define `icono`. |
| 19 | ~~`BookingPage.jsx:32`~~ | **RESUELTO** (2026-10): `BLOQUES` usa `'18:30'` en 24 h y el AM/PM sale solo de `formato12h()`. |
| 20 | `src/index.css` (`@theme`) | **RESUELTO** en el rediseño: se añadió `danger-400` (`#C04A3A`) para acciones destructivas, separando del estado `cancelada` (`cancelled-400`). |
| 21 | `LoginPage.jsx` | Mantiene el tema anterior (`neutral-*`) mientras los dos paneles usan `slate/primary/navy`. Los inputs se ven distintos al entrar al panel. Costura conocida del rediseño, documentada en §11. |
| 22 | ~~`BookingPage` vs `CitasAdmin`~~ | **RESUELTO**: la nueva tabla de citas usa `font-serif` + `tabular-nums` en la columna de hora, igual que el wizard público. |
| 23 | ~~`BookingPage.handleConfirmar`~~ | **RESUELTO** (2026-10): se manda `hora` en 24 h (`'HH:MM'`), que sí castea a `time`. El agendamiento público volvió a funcionar. |
| 24 | `citas` (modelo) | No hay columnas de pago. El botón "Cobrar" de `CitasAdmin` cierra la cita como `completada`; un registro real de cobro necesita `pagado`/`metodo_pago`/`cobrado_at`. |
| 25 | ~~sillones~~ | **DESCARTADO por el usuario**: `barberos.sillon_numero` / `sillon_nombre` existen en la BD pero `CitasAdmin` no los usa (ni badge, ni tarjeta, ni columna, ni % de ocupación). La gestión de sillones quedó en la página de Barberos, si es que algún día se retoma. |
| 26 | `CitasAdmin` — vista calendario | Placeholder navegable. Falta el modelo de horarios/slots y la detección de solapamientos (sigue sin haber forma de impedir dos citas en el mismo horario, §18.6). |
| 27 | ~~`CitasAdmin` — recordatorios~~ | **RESUELTO** (2026-10-13), en los **dos canales**. **Manual por WhatsApp** (§9.5): botón en la tabla y en la tarjeta del panel inferior, abre `wa.me` con el mensaje armado y marca `recordatorio_enviado_at`. **Automático por correo** (§10.7): Edge Function `enviar-recordatorios` desplegada, `pg_cron` la llama cada hora (`5 * * * *`) vía `pg_net`, envía en las ventanas H-24 y H-2 con Resend, protegida por un secreto en Supabase Vault, con la **clave de Resend también en Vault**, límite de 80 correos por ejecución y marcación solo si el envío fue 2xx. El interruptor "Envío automático" vive en `configuracion.recordatorios_activos` (default `false`, **hoy apagado**). ✅ Verificado de extremo a extremo, incluida la **segunda ejecución que no reenvía**. ⚠ **Le falta verificar el dominio de Resend** (#53): mientras tanto el automático no le llega a ningún cliente real. |
| 28 | `citas.barbero_id` | Existe en la BD y `BookingPage` **ya lo rellena** (RPC `asignar_barbero` cuando el cliente elige "Cualquier barbero"), pero de las 20 filas actuales **15 lo siguen teniendo en `null`**: son las creadas antes de la auto-asignación y las del alta manual. La columna Barbero sale en "Sin asignar" para esas. |
| 29 | `citas` (RLS) | **RESUELTO**: se agregó la política `Admin escribe` para `authenticated` (§10.5). Antes toda escritura del panel sobre `citas` fallaba en silencio. |
| 30 | `CitasAdmin` — tag VIP | No existe el criterio para "Club Noble" ni ningún campo VIP en `citas`. Omitido a propósito; no lo inventes. |
| 31 | ~~Tokens del tema viejo en el admin~~ | **RESUELTO**: `src/pages/admin/` ya no usa ninguna clase `cream-*`, `coffee-*`, `terracotta-*`, `danger-*`, `ink-*`, `bone-*`, `brass-*`, `sage-*`, `muted-blue-*` ni `cancelled-*`. Los cuatro formularios están en tema claro (§9.4). `src/pages/cliente/` tampoco usa tokens del tema público (§17). |
| 32 | `servicios.duracion` | Es TEXT y no tiene CHECK: conviven `'30'` (dato actual) y textos tipo `'50 min'`. `ServiciosAdmin.aMinutos()` normaliza para promediar y mostrar, y el formulario ya guarda minutos pelados (`type="number"`). El `servicio.costo` es `numeric`, no `precio` como en productos. |
| 33 | `servicios.descripcion` | La fila "Corte de Cabello" la tiene vacía. La tabla muestra "Sin descripción" en `slate-400` en vez de una celda en blanco que parece un bug. |
| 34 | `BarberosAdmin.CAPACIDAD_SLOTS_ESTIMADA` | Es una constante inventada (`= 8`) para "slots por barbero por día". Alimenta la métrica "Capacidad operativa" y la barra de citas de hoy de cada tarjeta. Está marcada como dato de ejemplo en el código; hace falta un modelo real de horarios/slots para que el número signifique algo. |
| 35 | `ResumenPage.getAccentBarbero(i)` | Muestra **"Barbero N°{i + 1}"** inventado por índice de fila en la tabla de citas de hoy, y un color por posición. No lee `citas.barbero_id` aunque la columna exista. En un panel con datos reales eso es un dato falso, no un placeholder. |
| 36 | `ProductosAdmin` — ícono "Ver" y "Contactar proveedor →" | Botones sin `onClick` y un `<a href="#">`. Son controles muertos: el mismo problema que se resolvió en `ServiciosAdmin` (donde "Ver" abre el form en `soloLectura`). |
| 37 | `citas.estado` (datos) | Sigue habiendo **1 fila con `estado = 'Pendiente'`** (mayúscula) creada fuera de la app (verificado 2026-10-12). El `estado` es `text` libre, sin CHECK ni ENUM, y el admin compara `estado \|\| 'pendiente'` **de forma sensible a mayúsculas**: `CitasAdmin.accionesDe()` cae en `default` y esa fila se queda **sin botones de acción**. ⚠ Con el portal del cliente el efecto es doble: `CitasCliente` solo considera `pendiente`/`confirmada` en minúsculas, así que esa cita cae en **Historial**, y las RPC `cancelar_cita`/`reagendar_cita` rechazan la fila porque su `estado in ('pendiente','confirmada')` no matchea. **Normaliza el dato** (`update citas set estado = 'pendiente' where estado = 'Pendiente'`) o mete un CHECK; no lo cambies sin avisar. |
| 38 | ~~`Navbar` — botón de cuenta~~ | **RESUELTO** (2026-10-12): `Navbar`, `Hero` y `LoginPage` usan ahora el helper único `rutaInicioPorRol(rol)` (§5) en vez de decidir el destino por su cuenta, y el rol viene de `perfiles`. Queda **0** lecturas de `user_metadata.role` en `src/`. |
| 39 | ~~Seguridad: `signUp` público + `role` del cliente~~ | **RESUELTO** (2026-10-12): `LoginPage` ya **no manda `role`**, solo `full_name`. El alta la hace `trg_crear_perfil`, función `security definer` que inserta **siempre `'cliente'`** e **ignora `user_metadata`** a propósito (§10.6). Y `perfiles` no tiene política de INSERT ni de UPDATE, así que nadie puede auto-asignarse un rol ni desde la API. |
| 40 | `BookingPage` — numeración de pasos | El stepper tiene 3 pasos (`PASOS`) pero los rótulos visibles van de "01" a "04" porque el bloque de barberos comparte pantalla con el paso 1. Confuso al leer la pantalla; puramente cosmético. |
| 41 | `citas.cliente_id` sin FK ni trigger | La columna es `uuid` nullable y **no** referencia `auth.users`: nada impide apuntar a un id inexistente y **borrar la cuenta de un cliente deja sus citas huérfanas** para siempre. Además 16 de las 20 filas actuales la tienen en `null`, así que esas reservas no aparecen en `/cliente` y el cliente no puede cancelarlas. Una FK a `auth.users` con `ON DELETE SET NULL` (o `CASCADE`) resolvería la mitad; la otra mitad es un backfill de datos. |
| 42 | `BLOQUES` duplicado | La lista de horarios está **copiada** en `BookingPage.jsx` y en `CitasCliente.jsx` (que la necesita para el modal de reagendar). Si cambias el horario del salón en uno, tienes que cambiarlo en el otro o el cliente podrá reagendar a horas que `/agendar` nunca ofrece. El arreglo real es una tabla `horarios` + RPC, no un constant compartido (§18.6). |
| 43 | `CitasAdmin` no muestra `cliente_id` | `cargarDatos` hace `select('*')`, así que el dato **llega**, pero ninguna columna lo usa: la celda "Cliente" muestra `nombre` y `telefono`. Con el portal `/cliente` ya existe la relación y sería el filtro más útil ("citas sin cliente" = reservas hechas antes de exigir sesión). |
| 44 | `/login` — confirmación de email | No se puede verificar desde el código si el proyecto de Supabase exige confirmar el correo: si lo exige, el registro nuevo muestra "¡Cuenta creada!" pero el usuario **no puede entrar** hasta confirmar, y `/agendar` habrá perdido el borrador si tarda más de 2 h (§8). Única duda pendiente de revisar en el panel de Supabase. |
| 45 | **Esquema aplicado fuera de las migraciones** | `list_migrations` devolvía 9 entradas y la última era `cita_productos_jsonb` (2026-10-06). La columna `citas.cliente_id`, la política `cliente ve sus citas` y las funciones `cancelar_cita` / `reagendar_cita` **no tienen entrada**: se aplicaron directamente en la BD. Si alguien reconstruye el proyecto desde cero (o cambia de proyecto de Supabase), esa parte se pierde en silencio y `/cliente` devuelve listas vacías sin error visible. ⚠ **Sigue abierto**: lo de los recordatorios (§10.7) **sí** quedó en migraciones (`cita_recordatorios_automaticos`, `configuracion_recordatorios_activos`, `cron_recordatorios`, `rpc_recordatorios_solo_service_role`), pero lo anterior no. **Conviene una migración que documente/recree el estado actual.** |
| 46 | `citas_slot_unico` no cubre `barbero_id IS NULL` | El índice único exige `barbero_id is not null`, así que **dos citas sin barbero sí pueden caer en el mismo horario**. Es raro en el flujo público (auto-asignación), pero `CitaManualForm` y el `BookingForm.jsx` muerto permiten dar de alta sin barbero, y hoy 15 de las 20 filas están así. |
| 47 | `/contacto` con datos vacíos | Las dos sedes tienen `nombre`, `direccion`, `horarios`, `telefono` y `mapQuery` **en blanco**, así que los `<iframe>` piden `?q=&output=embed` y muestran el mapa equivocado (o nada). Además `s.horarios.map(h => …)` sobre `['']` renderiza una línea vacía. |
| 48 | ARIA inconsistente en el portal del cliente | Los tabs de `CitasCliente` son un `role="tablist"` con `role="tab"` + `aria-selected` **sin `tabpanel`**, exactamente el patrón que `CitasAdmin` evita a propósito con `role="group"` + `aria-pressed`. Además el modal de confirmación de `BookingPage` no tiene `role="dialog"`. No son bugs de runtime, pero rompen la consistencia del proyecto. |
| 49 | **El rol `admin` no tiene ninguna cuenta** | Verificado 2026-10-12: `perfiles` tiene **1 `superadmin`** (que además es el admin del negocio) y **4 `cliente`**, **0 `admin`**. El rol existe en el `CHECK`, en `rutaInicioPorRol` y en `es_admin()`, pero nadie lo usa: el flujo real es "superadmin entra a `/admin`". Si mañana el dueño de la barbería es otra persona, promote con `update perfiles set rol = 'admin'` (§10.6) y ya funciona sin tocar código. |
| 50 | **Cambio de cuenta sin refrescar `rol` a tiempo** | `LoginPage` no navega dentro de `handleSubmit`: marca `entrado` y espera a que `cargandoRol` sea `false` en un efecto, porque el rol se lee de la BD justo después de iniciar sesión. Consecuencia: si alguien cierra sesión y entra con otra cuenta muy rápido, el `rol` puede ser el de la sesión anterior durante un instante. `ProtectedRoute` lo absorbe (`Cargando...`), pero **si añades una pantalla que lea `rol` fuera del guard, comprueba también `cargandoRol`**. |
| 51 | **`citas.telefono` no está normalizado** | De las 21 filas actuales (verificado 2026-10-13): 6 tienen 10 dígitos, 6 tienen 11 y **9 tienen otra longitud**, así que el botón "Recordar" aparece deshabilitado en esas 9. `telefonoParaWhatsApp()` limpia `00`/`044`/`52`/`1` para tolerar lo que se escribe a mano, pero no puede inventar los dígitos que faltan. La columna es `text NOT NULL` sin CHECK: si quieres garantía, añade `check` o normaliza los datos con un UPDATE (§). |
| 52 | `recordatorio_enviado_at` se marca desde el cliente | El `update` lo hace el navegador del barbero después de abrir WhatsApp, así que la marca depende de que **no cierre la pestaña**. Si el navegador se cierra entre el `window.open` y el `update`, el recordatorio se envió pero no consta. Las **ventanas H-24 y H-2 ya no tienen ese problema**: las marca la Edge Function desde el servidor (§10.7). |
| 53 | **Dominio de Resend sin verificar** | Con el remitente de prueba `notifications@resend.dev` **solo se puede enviar al correo de la cuenta de Resend**: cualquier otro destinatario devuelve un `HTTP 403`, la función lo registra en `resumen.fallos` y **no marca** la cita, así que reintentará cada hora. Comprobado con una cita real: `403`. Antes de apuntarlo a clientes hay que **verificar un dominio** en Resend con los registros DNS. Mientras tanto, **el único canal que llega a un cliente es el manual por WhatsApp** (§9.5). |
| 54 | **Las citas sin `correo` no reciben aviso** | El automático **se salta** toda cita sin correo (van a `resumen.sinCorreo`, que solo sale en el log de la Edge Function). De las 22 filas actuales muchas no lo tienen porque `citas.correo` es **nullable** y `BookingPage` solo lo pide en el paso 3. El panel **no muestra cuántas citas se quedan sin aviso**: solo el log de la función. Si esto molesta, la señal natural es un contador de "citas próximas sin correo" en la tarjeta de recordatorios. |
| 55 | **El automático no se ha probado con una cita real** | Solo se verificó con citas de prueba creadas y borradas a mano (§10.7). El comportamiento con una cita de verdad depende de que su `correo` sea válido (un `HTTP 422` de Resend significa que el correo está mal escrito) y de que el dominio esté verificado (#53). |
| 56 | **Comparar fechas como texto no avisa de un `NaN`** | La lección de los 2 bugs de §10.7: la Edge Function compara `(fecha::text || ' ' || left(hora::text,8))` contra los extremos de la ventana, **como texto**, y un extremo mal formado **no da error**: simplemente deja de encontrar citas… o peor, hace que la ventana matchee de más. Un `Invalid Date` en JS se convirtió en `"NaN-NaN-NaN"`, y como `'NaN…' > '2026…'` en lexicografía, **H-24 pasó a ser "toda cita futura"**. Hoy está protegido con `FORMATO_VENTANA` (aborta con `500` si los 4 extremos no cuadran) y con un `Number.isNaN` dentro de `sumarHoras`. **Si añades otra comparación de fechas por texto en este proyecto, valida el formato antes de comparar.** |
| 57 | **Casi ninguna cita real tiene `correo` usable** | El automático necesita `citas.correo`, que es **nullable**: las 4 de la prueba salían a `23302011@utfv.edu.mx` y el resto no llegó a esa columna con una dirección válida (uno devolvió `422`). O sea: **aunque verifiques el dominio, el automático no le llegaría hoy a casi ningún cliente real**. Lo que falta no es código: es un correo de verdad en esas citas, o un backfill de `citas.correo`. Mismo aviso en #54. |

---

## 19. Cómo usar CodeGraph en este repo

El repo **está indexado** (existe `.codegraph/`). Antes de grep o de leer archivos a
mano, usa `codegraph_explore` (MCP o `codegraph explore "..."` en shell): devuelve el
fuente literal con números de línea **y** el grafo de llamadas, incluidos los saltos
de dispatch dinámico (JSX) que un grep no sigue. El índice se sincroniza ~1s después
de cada escritura.

Ejemplos de consultas que funcionan bien aquí:
- `"flujo de citas agendar BookingPage handleConfirmar"`
- `"cambiarEstado CitasAdmin colorEstado estados"`
- `"supabase storage upload imagenes subirImagenSiHay"`
- `"ProtectedRoute ProtejerRuta useAuth"`

### 19.1 Skills instaladas

Hay una skill de apoyo disponible en `.agents/skills/frontend-design/`, con su
registro en `skills-lock.json` (ambos **sin trackear** en git). Se usó para orientar
el rediseño visual del dashboard (§11), pero **el resultado está en los tokens y
las clases de `src/`, no en la skill**: el sistema actual se aplica sin cargarla.

No la borres, no la agregues al tracking y no la edites sin que el usuario lo pida.

---
<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
