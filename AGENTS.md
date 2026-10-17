# AGENTS.md — Barbería (Kromatik)

> Contexto permanente para agentes que trabajan en este repositorio.
> Todo lo que sigue fue verificado leyendo el código del repo. No hay suposiciones.
> Si algo de este documento deja de ser cierto, actualiza **este** archivo.

---

## 1. Propósito del proyecto

Sitio web de una **barbería** (cortes de cabello y barba) con cuatro partes:

- **Sitio público**: landing page con hero y catálogos (servicios y productos), y un
  flujo de reserva de citas en 3 pasos (`/agendar`).
- **Panel de administración** (`/admin`): protegido por autenticación, para dar de
  alta/editar/borrar **servicios**, **productos** y **barberos**, y para **gestionar
  las citas** (ver detalle y cambiar su estado).
- **Portal del cliente** (`/cliente`): protegido por el mismo `ProtectedRoute`
  (cualquier cuenta autenticada entra; ver trampa de roles en §5 y §18.14). El
  cliente autenticado ve solo **sus** citas (`cliente ve sus citas`, §10.5) y puede
  cancelarlas o reagendarlas vía RPC.
- **Panel del superadmin** (`/superadmin`): el dueño del software, **fuera de toda
  barbería** (se entra por el dominio principal, sin slug). Ve **todas** las barberías
  con sus números, crea nuevas (con la cuenta de su dueño, vía Edge Function) y las
  activa/desactiva. Solo hay **una** cuenta con ese rol (§5, §9.9).

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
- **No hay variables de entorno más allá de las 3 del proyecto** (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_BARBERIA_SLUG`; ver §14.1).
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
              <App />
                └─ <BarberiaProvider>  ← (DENTRO de App) resuelve la barbería por slug
                     └─ <Routes>        ← las rutas NO se montan sin barbería resuelta
```

`src/main.jsx` (418 bytes) monta exactamente eso e importa `./index.css`.

`src/App.jsx` es el **único** archivo que define rutas. No hay `createBrowserRouter`,
ni `loaders`, ni `actions`, ni data fetching en el router: son `<Route>` + `<Routes>`
de `react-router-dom` v7 y componentes que hacen `useEffect`.

### Multi-barbería (`BarberiaProvider`) — 2026-10-16, dominio `gools.com.mx` desde 2026-10-17

Varias barberías conviven en **un solo proyecto de Supabase** y cada fila de negocio
lleva `barberia_id`. La barbería del visitante se resuelve por **slug**, en `resolverSlug()`
de `BarberiaProvider.jsx`, que devuelve **`{ slug, sitioPrincipal }`**:

1. **Subdominio**: si el host termina en `.<VITE_DOMINIO_BASE>` (hoy `gools.com.mx`), lo
   que va antes es el slug: `kromatik.gools.com.mx` → `kromatik`.
2. **Sin barbería, `sitioPrincipal: true`**: el host **es** el dominio base (`gools.com.mx`),
   `www.` o un **slug reservado** (`www`, `app`, `admin`, `api`, `superadmin`, `mail`,
   `soporte`, `avisos`, `send`), o tiene más de un nivel (`a.b.gools.com.mx`).
   ⚠ Aquí **no** se cae a `VITE_BARBERIA_SLUG`: el dominio pelado es la **entrada del
   superadmin**, no el kiosko de la primera barbería.
3. **`VITE_BARBERIA_SLUG`** (env var): si el host **no es** el dominio real (localhost,
   `127.0.0.1`, un `*.workers.dev`, una preview) o si `VITE_DOMINIO_BASE` no está
   definida, se usa esa variable. Es lo que permite trabajar en local sin subdominios.
4. Si no hay slug → `noEncontrada`, que el gate de `App.jsx` traduce a una pantalla u otra.

⚠ **La comparación es siempre contra `VITE_DOMINIO_BASE`. NO cuentes las partes del host.**
`gools.com.mx` tiene **tres** etiquetas (`gools`, `com`, `mx`) y una barbería serían
cuatro; el dominio anterior (`tusoftware.com`) tenía dos y una eran tres. El cálculo por
partes que se usaba en `BarberiaProvider` y en `dominioBaseDeBarberias()` era correcto con
uno y **falso con el otro**: por eso los dos leen ahora la variable. El `.ts` de la Edge
Function y el `check` de la base ya no dependen del dominio (§10.10).

`BarberiaProvider` **está dentro de `App`**, no en `main.jsx`: `AuthProvider` sigue
arriba de todo y no se movió (§17). Exporta `{ barberia, cargando, noEncontrada, slug,
sinSlug, sitioPrincipal }` por tres archivos partidos igual que el contexto de configuración (§9.1):
`barberia.js` (`createContext`), `BarberiaProvider.jsx` (el provider) y
`useBarberia.js` (el hook, que lanza si falta el provider).

`App.jsx` monta un `Contenido` que, mientras `cargando`, muestra `Cargando...`; si
`noEncontrada`, `BarberiaNoDisponible` muestra **una de dos pantallas** según `sitioPrincipal`:

| Motivo | Pantalla |
|---|---|
| `sitioPrincipal` (dominio base, `www`, reservado o `a.b`) | **"Elige tu barbería"**: texto que explica que cada barbería tiene su dirección (con el ejemplo `kromatik.<base>`) y un CTA a `/login`. **No consulta datos.** |
| el resto (slug que no existe, barbería de baja, o sin slug en local) | **"Esta barbería no está disponible"**, con el aviso de `VITE_BARBERIA_SLUG` si `sinSlug` |

**Ninguna ruta existe sin barbería resuelta**, salvo `/login` y `/superadmin` (§5).

El `barberia.id` que expone ese contexto es la llave del aislamiento en el frontend:
todas las lecturas y escrituras de negocio (`servicios`, `productos`, `barberos`,
`citas`, `configuracion`) llevan `.eq('barberia_id', barberiaId)` y los inserts
incluyen `barberia_id`. La autorización real, de todos modos, está en RLS (§10.5).

**Hay cuatro layouts, todos como `<Route>` con `<Outlet/>`** (2026-10):

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
- `SuperadminDashboard` (`src/pages/superadmin/SuperadminDashboard.jsx`): layout de
  `/superadmin`, dentro de `<ProtectedRoute roles={['superadmin']}>` y **sin**
  `ConfiguracionProvider`. Misma estructura responsive que `AdminDashboard` (rail
  lateral en `lg+`, hamburguesa en `<lg`, logout), un solo link ("Barberías") y la
  identidad del **software**, no la de una barbería. §9.9.

### Zona del superadmin (`/superadmin`) — 2026-10-17

Es la **cuarta zona** de la app y la única que **no pertenece a ninguna barbería**: aquí
el dueño del software administra todas. Se abre desde el **dominio principal**, sin slug,
así que no puede depender de `BarberiaContext` (si dependiera, la pantalla "Esta barbería
no está disponible" la taparía en local y en cualquier host sin subdominio). Dos ajustes
la sacan del gate, uno en cada extremo:

- **`Contenido` (`src/App.jsx`)** calcula `sinBarberia` con `useLocation`: es `true`
  para `/superadmin` (y sus subrutas) **y para `/login`** (y las suyas), y **salta** tanto
  el `Cargando...` de resolución de barbería como el `noEncontrada`. Las demás rutas
  siguen igual. ⚠ **`/login` entra en ese conjunto desde 2026-10-17**: antes la tapaba
  "Esta barbería no está disponible", con lo que sin `VITE_BARBERIA_SLUG` (o con un slug
  que no existe) no se podía iniciar sesión **en ninguna zona**, tampoco en la del
  superadmin. El login es la puerta: no puede depender de que haya barbería.
- **`ProtectedRoute`** deriva
  `esZonaSuperadmin = roles.length === 1 && roles[0] === 'superadmin'` y **no espera
  `cargandoBarberia`**; además pinta el `Cargando...` en `text-slate`, porque esta zona
  es clara (§11). Ningún archivo de `src/pages/superadmin/` llama a `useBarberia()` ni a
  `useConfiguracion()`, así que `/superadmin` renderiza bien con `barberia === null`.

`rutaInicioPorRol('superadmin')` → `/superadmin` (§5). La ruta va **sin
`ConfiguracionProvider`**: esa fila es por barbería y aquí no hay ninguna que mostrar. El
`superadmin` **sigue** entrando a `/admin` (su lista `roles` no cambió) cuando abre el
sitio de una barbería concreta.

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
├── ProtectedRoute (mismo guard, §18.14)
│   └── ClienteDashboard               → layout de "/cliente"
│       └── Outlet
│           └── CitasCliente           → /cliente (índice)
└── ProtectedRoute (solo 'superadmin', §5)
    └── SuperadminDashboard            → layout de "/superadmin" (sin barbería)
        └── Outlet
            └── BarberiasSuper → BarberiaForm → /superadmin (índice)

AuthProvider (main.jsx)
└── useAuth()  consumido por: ProtejerRuta, LoginPage, AdminDashboard,
    ClienteDashboard, CitasCliente, SuperadminDashboard, Navbar, BookingPage y App (el
    efecto que da de alta la membresía del cliente, §5.1)

BarberiaProvider (dentro de App)
└── useBarberia()  consumido por: App (gate), ProtejerRuta, Navbar, Hero,
    BookingPage, Servicios, Productos, ServicesPage, ProductosPage,
    ConfiguracionProvider, el admin y CitasCliente

useConfirmarCita (src/hooks)
└── usado por ResumenPage y CitasAdmin, no por CitasCliente (que se sirve de RPC)

supabaseClient (singleton)
└── importado por: BookingPage, BookingForm, Servicios (público), Productos (público),
    ProductosPage, ServicesPage, AuthContext, ConfiguracionProvider, LoginPage (signUp),
    CitasCliente, useConfirmarCita, BarberiasSuper (la RPC del resumen) y BarberiaForm
    (la Edge Function `crear-barberia`), y los 6 archivos de pages/admin que tocan datos
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
│       ├── enviar-recordatorios/
│       │   └── index.ts               Edge Function de recordatorios (§10.7). Sin
│       │                               secretos: los lee del entorno. Se despliega
│       │                               con el MCP, no con la CLI.
│       └── crear-barberia/
│           └── index.ts               Edge Function del alta de barberías (§10.10).
│                                       Es lo único fuera de `src/` junto con la
│                                       anterior, y el **único** camino para crear
│                                       el usuario del dueño de una barbería y
│                                       escribir su rol en `perfiles`. Sin
│                                       secretos: usa `service_role` solo dentro.
│                                       Se despliega con el MCP y con
│                                       `import_map_path: "deno.json"` explícito.
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
│   │   ├── AuthContext.jsx             AuthProvider + useAuth (sesión, rol y barbería, §6.2)
│   │   ├── barberia.js                 solo `createContext` del contexto de barbería
│   │   ├── BarberiaProvider.jsx        resuelve la barbería por slug (§3)
│   │   ├── useBarberia.js              hook del contexto de barbería
│   │   ├── configuracion.js            solo `createContext` (partido en 3 archivos, §9.1)
│   │   ├── ConfiguracionProvider.jsx   carga la fila de `configuracion` de la barbería
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
│       ├── superadmin/
│       │   ├── SuperadminDashboard.jsx  layout de /superadmin: rail + hamburguesa (242)
│       │   ├── BarberiasSuper.jsx       lista de barberías: métricas, filtros, tabla (539)
│       │   └── BarberiaForm.jsx         modal de alta (dueño + contraseña) y de edición
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
| `src/components/BookingForm.jsx` | no importado | Modal simple de agendar; `BookingPage` lo reemplazó. Inserta `{nombre, telefono, servicio, fecha, hora}` **sin `cliente_id` ni `barberia_id`**,
así que esa cita no aparecería en el portal `/cliente` y además el insert **falla** hoy
(`barberia_id` es `NOT NULL` desde el multi-barbería, §10.2). Además su `<select>` de servicios es una lista hardcodeada de 4 nombres que ya no coinciden con `servicios.nombre`. |
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

Definidas todas en `src/App.jsx` (5 bloques de `<Route>`: rutas sueltas, el layout
público, el panel del superadmin, el panel y el portal del cliente):

⚠ **Las rutas de barbería (`/`, `/servicios`, `/productos`, `/contacto`, `/agendar`,
`/admin*`, `/cliente`) solo existen con barbería resuelta** (§3). En el **dominio base**
(`gools.com.mx`, `www.` o un subdominio reservado) no se montan y sale la pantalla
**"Elige tu barbería"**. `/login` y `/superadmin` son las dos excepciones: funcionan sin
barbería y son, precisamente, la entrada a esa zona.

| Ruta | Elemento | Auth | Notas |
|---|---|---|---|
| `/login` | `<LoginPage />` | — | **Fuera** de todo layout, sin navbar. Login **y registro** (`signUp`). Tras login: `volverA` → si no, `rutaInicioPorRol(rol)`, que es la **única** fuente de destino (`superadmin` → `/superadmin`, `admin` → `/admin`, `cliente` → `/cliente`). ⚠ **No depende de `BarberiaContext`**: desde 2026-10-17 `/login` está en el conjunto `sinBarberia` de `Contenido` (§3), así que el formulario abre aunque falte `VITE_BARBERIA_SLUG` o apunte a una barbería inexistente |
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
| `/cliente` (index) | `<CitasCliente />` | ✅ | es la única sub-ruta por ahora; la consulta filtra por `barberia_id` **además** del `cliente_id`, así que solo salen las citas de la barbería abierta (§10.9) |
| `/superadmin` | `<ProtectedRoute roles={['superadmin']}><SuperadminDashboard /></…>` | ✅ | layout con `<Outlet/>` y **sin** `ConfiguracionProvider`; la única zona que **no** depende de `BarberiaContext` (§3) |
| `/superadmin` (index) | `<BarberiasSuper />` | ✅ | lista de **todas** las barberías con sus números; "Nueva barbería" y "Editar" abren `BarberiaForm` (§9.9) |

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
| `superadmin` | `/superadmin` | Dueño del software: ve **todas** las barberías, crea nuevas (con la cuenta de su dueño) y las activa/desactiva. **Solo hay 1** (`23302011@utfv.edu.mx`). También entra al `/admin` de cualquier barbería (§5, §9.9) |
| `admin` | `/admin` | Dueño de una barbería: todo lo del panel de ESA barbería. Lo crea el superadmin desde `/superadmin` (§10.10); hoy **1 cuenta**, la de Kromatik (§18.49) |
| `cliente` | `/cliente` | Se registra en `/login`, y ve, cancela y reagenda **sus** citas. Su pertenencia a cada barbería vive en **`membresias`** y se crea sola al entrar (§10.9) |

El rol vive en la tabla **`perfiles`** (§10.2), **nunca** en `auth.users.user_metadata`:
ese campo lo escribe el propio cliente al registrarse, así que era auto-asignable.
Desde el 2026-10-12 **ningún archivo lee `user_metadata.role`** (verificado: 0
coincidencias).

`src/utils/rutaInicioPorRol.js` es el **helper único** que decide a dónde va cada rol.
Los tres que lo necesitan lo usan y **no deciden por su cuenta**:

```js
export function rutaInicioPorRol(rol) {
  if (rol === 'superadmin') return '/superadmin'
  return rol === 'cliente' ? '/cliente' : '/admin'
}
```

`superadmin` → `/superadmin`; `admin` → `/admin`; `cliente` → `/cliente`; y **cualquier
otro valor, incluido `null`**, cae en **`/admin`**, que es el comportamiento que ya tenía
el proyecto: sin un rol legible el visitante acaba en el login del panel, no en una zona
de cliente que no le toca. Si añades un rol, actualízalo aquí **y** las listas `roles` de
`App.jsx`.

### Membresías: una cuenta, varias barberías (2026-10-17)

La cuenta de Supabase es **única por correo**, pero un cliente puede pertenecer a varias
barberías: eso es lo que dice la tabla **`membresias`** (§10.9), `(user_id, barberia_id)`.
`perfiles.rol` sigue siendo global (`cliente` | `admin` | `superadmin`); `membresias` es
lo que es **por barbería**.

El alta es automática y sin pantallas: un efecto de `Contenido` (`src/App.jsx`) llama a
la RPC `unirme_a_barberia(barberia.id)` cuando hay sesión, el rol es `cliente` y la
barbería está resuelta. Con un solo mecanismo cubre los tres caminos: iniciar sesión,
registrarse y llegar con la sesión ya abierta a otro subdominio. La RPC es idempotente y
**decide en el servidor** (exige sesión, exige rol `cliente` y exige barbería activa), así
que un `rol` todavía sin refrescar no puede colar a un admin (§18.50).

Los roles `admin` y `superadmin` **no** generan membresías, y `membresias` **no tiene
política de INSERT/UPDATE/DELETE**: el único camino de alta es la RPC.

### `ProtectedRoute` (`src/components/ProtejerRuta.jsx`)

```jsx
const { session, cargando, rol, cargandoRol, barberiaId, logout } = useAuth()
const { barberia, cargando: cargandoBarberia } = useBarberia()

// La zona del superadmin es la única que NO pertenece a ninguna barbería: se entra
// desde el dominio principal, sin slug, así que no hay nada que resolver.
const esZonaSuperadmin = Array.isArray(roles) && roles.length === 1 && roles[0] === 'superadmin'

// `cargandoRol` no vuelve a `true` al cambiar de usuario: con sesión pero sin
// `rol` todavía se está leyendo. Sin esto se decidía el destino con el `rol`
// viejo —`null` tras un login sin sesión previa— y el superadmin caía en `/admin`.
const cargandoRolDeVerdad = cargandoRol || (!!session && !rol)

if (cargando || (session && cargandoRolDeVerdad) || (cargandoBarberia && !esZonaSuperadmin)) {
  return <p className={`p-8 ${esZonaSuperadmin ? 'text-slate' : 'text-white'}`}>Cargando...</p>
}
if (!session) return <Navigate to="/login" replace />
if (roles && !roles.includes(rol)) return <Navigate to={rutaInicioPorRol(rol)} replace />
if (rol === 'admin' && barberia && barberiaId !== barberia.id) return <CuentaAjena />
return children
```

- Recibe `roles`: lista de roles admitidos. `/admin` → `['admin','superadmin']`,
  `/cliente` → `['cliente']`, `/superadmin` → `['superadmin']`. Si `roles` no viene,
  acepta cualquier cuenta.
- Espera **tres** cosas: que la sesión esté resuelta (`cargando`), que el rol esté
  leído (`cargandoRol`, ampliado por `cargandoRolDeVerdad`) y que la barbería esté
  resuelta (`cargandoBarberia`). Sin el segundo chequeo, un cliente que recarga en
  `/admin` vería un instante el panel antes de ser expulsado; sin el tercero, un admin
  ajeno vería un instante el panel de otra barbería.
- ⚠ **`cargandoRol` solo es fiable si además el `rol` existe.** `AuthContext` lo pone en
  `false` y **no lo vuelve a subir** cuando cambia el usuario (§6.2): tras abrir `/login`
  sin sesión ya está en `false`, con `rol = null`, y durante el login dentro de la app
  sigue así mientras la consulta de `perfiles` va en vuelo. Decidir el destino con ese
  `rol` era el bug que mandaba **al superadmin a `/admin`** (`roles.includes(null)` falla
  → `Navigate` a `rutaInicioPorRol(null)` → `/admin`). Con sesión, `rol === null` solo
  significa "se está leyendo": el contexto siempre termina poniendo uno
  (`data?.rol ?? 'cliente'`), así que esperar a `rol` no cuelga. Lo mismo hace
  `LoginPage` con `rolListo` (§6.3). ⚠ No sustituyas esto por volver a poner
  `setCargandoRol(true)` en el cuerpo del efecto de `AuthContext`: eso es un
  `setState` síncrono y dispara el error `react-hooks/set-state-in-effect` (§15.1).
- ⚠ **`esZonaSuperadmin` es la única excepción al tercer chequeo**, y es
  `roles.length === 1 && roles[0] === 'superadmin'`: en `/superadmin` no hay barbería que
  resolver, así que esperarla dejaría el panel en `Cargando...` para siempre. Además el
  `Cargando...` sale en `text-slate` porque esa zona es clara (§3).
- Sin sesión → `/login`. Con sesión y rol incorrecto → **a su propio inicio**
  (`rutaInicioPorRol`), no a `/login`: así un admin que teclea `/cliente` aterriza en
  `/admin` sin pasar por el login.
- **`barberiaId`** viene de `perfiles.barberia_id` (vía `AuthContext`) y se compara
  con la barbería del sitio. Un **`admin` cuyo `barberia_id` no es el de la barbería
  abierta no entra**: ve la pantalla *"Esta cuenta no pertenece a esta barbería"* con
  botón "Cerrar sesión" (tema claro `slate/navy`, porque el guard no monta ningún
  layout). El **`superadmin` entra a cualquiera** (el chequeo es `rol === 'admin'`), y
  el cliente ya quedó fuera por la lista `roles`.
- ⚠ Esto es UX, no autorización: quien impide de verdad que un admin toque datos de
  otra barbería es RLS (§10.5).
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

### 6.2 `src/context/AuthContext.jsx` (90 líneas, íntegro)

Expone `{ session, cargando, login, logout, rol, cargandoRol, barberiaId, unirmeABarberia }` y un hook `useAuth()`.

- Al montar: `supabase.auth.getSession()` → setea `session` y `cargando = false`.
- Se suscribe con `supabase.auth.onAuthStateChange(...)` y limpia con
  `listener.subscription.unsubscribe()` en el cleanup del `useEffect`.
- `login(email, password)` → `supabase.auth.signInWithPassword` (devuelve la respuesta
  completa de Supabase, **no** lanza).
- `logout()` → `supabase.auth.signOut()`.
- **`barberiaId`** sale de la **misma** consulta (`perfiles.barberia_id`): es la barbería
  del **admin**, y es `null` para el superadmin y para los clientes.
- **`unirmeABarberia(barberiaId)`** → `supabase.rpc('unirme_a_barberia', { p_barberia_id })`.
  Es el alta automática de la membresía del cliente (§5.1, §10.9). Va en `useCallback`
  con deps vacías **a propósito**: `App.jsx` la usa como dependencia de un efecto, y una
  identidad nueva en cada render dispararía la RPC una y otra vez.
- **`rol`** y **`cargandoRol`** salen de un **segundo `useEffect`** con dependencia
  `[session?.user?.id]`:

```js
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
  options: { data: { full_name: nombre } } })`. El rol **no** se envía: lo pone el trigger de la BD, que siempre crea el perfil
  como `cliente` e **ignora** `user_metadata` (§10.4, §10.6) — mandarlo aquí permitía
  auto-asignarse `admin` (§18.39). Si el registro va bien muestra
  `"¡Cuenta creada con éxito! Ya puedes iniciar sesión."` y **vuelve al modo login**
  (no entra solo).
- ⚠ **Si el correo ya tiene cuenta**, Supabase lo delata de dos maneras distintas según
  tenga o no activada la confirmación por correo: con la confirmación **desactivada**
  devuelve un error de "ya registrado"; con la confirmación **activada** devuelve un
  **éxito falso** con la lista de identidades vacía (para no revelar qué correos existen).
  Las dos se detectan y muestran *"Ya tienes una cuenta. Inicia sesión con tu contraseña y
  te agregamos a esta barbería."*, y **vuelven al modo login**. El aviso **no** menciona
  ninguna otra barbería. Cualquier otro fallo sí muestra `registerError.message` **crudo**.
- **Login**: `const { error } = await login(email, password)`. Si hay `error` muestra el
  texto fijo **"Correo o contraseña incorrectos."**; si no, `setEntrado(true)` y el
  **efecto** de arriba decide el destino:
  1. `location.state?.volverA` → navega ahí (lo usa `/agendar` al pedir sesión, §8);
  2. si no → `rutaInicioPorRol(rol)`: `superadmin` → `/superadmin`, `admin` → `/admin`,
     `cliente` → `/cliente` (§5). Antes esta lista era `role === 'admin'` → `/admin` y
     "si no" → `/`, lo que mandaba al superadmin al panel de una barbería.
- ⚠ El efecto **espera a `rolListo`** (`!cargandoRol && !!rol`), no solo a
  `cargandoRol`: `cargandoRol` ya está en `false` desde que se abrió la página sin
  sesión, así que esperarlo no esperaba nada y el destino se decidía con `rol = null` →
  `/admin`. Es el bug que reportaba el superadmin (§5, `ProtectedRoute`). No lo
  simplifiques a `if (!entrado || cargandoRol) return`.

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

#### Envío automático: H-24 y H-2 (2026-10-13, canal de WhatsApp 2026-10-17)

Hay **tres canales de recordatorio y son independientes**. El manual de arriba no se
sustituyó: pasó a ser el respaldo cuando un automático no llega.

| Canal | Quién lo dispara | Interruptor | Columnas que marca |
|---|---|---|---|
| Manual (WhatsApp) | El barbero, pulsando "Recordar" | — | `recordatorio_enviado_at` |
| Automático (correo) | `pg_cron` → Edge Function `enviar-recordatorios` → Resend | `configuracion.recordatorios_activos` | `recordatorio_24h_enviado_at` y `recordatorio_2h_enviado_at` |
| Automático (WhatsApp) | `pg_cron` → Edge Function `enviar-whatsapp` | `configuracion.whatsapp_activo` | `recordatorio_wa_24h_enviado_at` y `recordatorio_wa_2h_enviado_at` |

Enviar por un canal **no silencia** a los otros: cada columna filtra solo su propia
ventana, y hasta el WhatsApp manual (`recordatorio_enviado_at`) es una columna
distinta de las automáticas. La lógica de los automáticos está en §10.7.

En `CitasAdmin.jsx`:

- **`alternarInterruptor(columna, canal)`** (2026-10-17) escribe **una columna de la fila de su barbería**: `.update({ [columna]: nuevo }, { count: 'exact' }).eq('barberia_id', barberiaId)`. La comparten los dos interruptores, del correo (`recordatorios_activos`) y de WhatsApp (`whatsapp_activo`); `canal` solo nombra el canal en el mensaje de error. Son lo único que puede parar un envío automático desde el panel, y **revierten el interruptor** si la escritura falla: revisan el `error` **y el `count`**, porque un `UPDATE` que RLS no deja pasar afecta 0 filas **sin lanzar error** (§10.5) — sin esa revisión el interruptor mentiría. El patrón del `count` es el de `BarberiasSuper` (§9.9). El fallo se avisa en el banner `role="alert"` que la página ya usa.
- **`InterruptorCanal({ etiqueta, activo, ayuda, bloqueado, onToggle })`** es un componente local **de módulo** (junto a los iconos) que renderiza el switch. Es el **mismo control que `BarberosAdmin` y `BarberoForm`** (§9.3, §9.4): `<button type="button" role="switch" aria-checked>`, pista `relative inline-flex h-5 w-9 rounded-full` (`bg-slate-300` / `bg-primary`) y knob `h-3.5 w-3.5 rounded-full bg-white` que viaja con `translate-x-1` / `translate-x-4`. La etiqueta visible hace de nombre accesible; no hay animación nueva, solo el `transition-colors` que ya usa todo el admin. **Existe para que los dos canales no puedan divergir por accidente**: si añades un tercer canal, reusa el componente en vez de copiar el markup.
- Los dos interruptores van en un `grid gap-3 sm:grid-cols-2`: son la misma decisión tomada dos veces (encender / apagar el envío), no dos pasos, y leerlos de un vistazo es el punto. Por debajo de `sm` se apilan.
- **Los interruptores son optimistas** (2026-10-17): el valor pintado sale de `overrides[columna] ?? Boolean(configuracion[columna])`, y `overrides` es un objeto con el estado local que se mueve **antes** de escribir (una clave por canal). Se limpia con `await refrescarConfiguracion()` para que no parpadee al valor viejo; si la escritura falla, esa clave vuelve a `anterior`.
- **Se deshabilitan en tres casos** (`bloqueado`): mientras carga la fila (`cargando` de `useConfiguracion`), mientras escribe (`guardandoInterruptor`, compartido: los dos se bloquean a la vez) y **si la barbería no tiene fila en `configuracion`** (`hayConfiguracion = Boolean(configuracion.id)`, porque `ConfiguracionProvider` devuelve `CONFIG_VACIA` con `id: null` cuando no existe). En ese último caso el texto de ayuda de los dos pasa a **"Falta la configuración de la barbería"**: sin fila el `UPDATE` no tiene destino y el interruptor "guardaría" sin guardar. No se crea la fila desde aquí.
- Los textos de ayuda son fijos, en `text-xs text-slate`: correo → *"Se envía un correo al cliente 24 horas y 2 horas antes de su cita. Solo a citas con correo."*; WhatsApp → *"Envía un WhatsApp al cliente 24 horas y 2 horas antes de su cita. Puede tener costo por mensaje."*
- **`MarcasCorreo({ cita })`** muestra **"24 h enviado"** y/o **"2 h enviado"** según las
  columnas, en `text-[10px] uppercase tracking-wide text-slate`, **sin pill** (§11.4). Si
  no se envió ninguno no renderiza nada. Es la versión **corta**: va en la celda del
  cliente de la tabla, donde solo interesa lo que ya salió, con la fecha real en el
  `title`.
- **`EstadoRecordatorio({ cita, correoActivo, whatsappActivo })`** es la versión **completa**
  de la tarjeta de recordatorios: **una línea por canal** (cuatro datos en un renglón no se
  leen). Correo → "24 h enviado / pendiente" y "2 h enviado / pendiente"; WhatsApp → igual
  con el prefijo **"WA "** ("WA 24 h enviado"). Separador `·` `aria-hidden`. Reglas:
  - `cancelada` y `completada` → **no renderiza nada** (hoy `paraRecordar` ya las filtra;
    el estado se decide dentro del componente para que ningún uso futuro prometa un envío
    que la función no hará).
  - cita sin `correo` (o en blanco) → **"Sin correo"** en `text-slate-400`, en vez de los
    dos estados; **sin `telefono`** → **"Sin teléfono"**, igual. Cada línea decide por su
    canal: una cita puede tener teléfono y no correo.
  - el filtro de "sin dato" copia el de las funciones del servidor: nulo o en blanco, nada
    más. Un teléfono que existe pero **no se puede normalizar** no sale por aquí: la Edge
    Function lo reclama, no lo puede enviar y **libera la marca** con
    `liberar_recordatorio_wa` (§10.7), así que esa línea se queda en "pendiente".
  - con el interruptor **de su canal** apagado, lo pendiente se atenúa a `text-slate-400` y
    lleva `title="Envío automático por <canal> apagado"`; lo ya enviado conserva su `title`
    con la fecha real.
  - El color **no** es la señal: la llevan el `✓` y la palabra. `text-slate` para lo activo,
  `text-slate-400` para lo atenuado (§11.4).
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

- `cargarCitas()` va en un **`useCallback`** con dependencias `[userId, barberiaId]` y el efecto llama
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

### 9.9 Panel del superadmin (`/superadmin`) — 2026-10-17

Tres archivos nuevos en `src/pages/superadmin/`. Es la única zona fuera de una barbería
(§3) y la única que **no** monta `ConfiguracionProvider`. Reutiliza el sistema visual del
admin sin inventar nada (§11).

**`SuperadminDashboard.jsx` (242 líneas)** — copia recortada del shell de `AdminDashboard`:

| | `AdminDashboard` | `SuperadminDashboard` |
|---|---|---|
| Identidad | `configuracion` (nombre + logo) | **`Multi-Barbería` / "Panel del software"** (placeholder) + badge `SUPERADMIN` en `amber` |
| Links | 6 | **1** ("Barberías", `fin: true`) |
| Topbar | buscador (decorativo) + "Ver sitio web público" + campana | **solo** el texto de contexto + "Ver sitio web" (`hidden lg:block`) |
| `aria-controls` del menú | `menu-movil-admin` | `menu-movil-superadmin` |

- ⚠ El **buscador decorativo y la campana se omitieron a propósito**: en el admin son
  controles muertos (§9.1, §18.9) y copiarlos aquí sería duplicar la deuda.
- Lo demás es idéntico: `flex min-h-screen flex-col bg-slate-50 lg:flex-row`, rail
  `fixed … lg:static lg:flex lg:w-64`, barra superior `lg:hidden` con hamburguesa, panel
  `fixed inset-x-0 top-14 z-50`, capa exterior `bg-navy/20`, `Escape` con `onKeyDown` en
  el contenedor y `tarjetaPerfil` en una sola variable. §12.1c.
- ⚠ **No lee `configuracion`**: esa fila es por barbería y aquí no hay ninguna.

**`BarberiasSuper.jsx` (539 líneas)** — la página índice.

- **Una sola llamada**: `supabase.rpc('superadmin_resumen_barberias')`. La RPC agrega por
  barbería `citas_mes`, `citas_total`, `servicios`, `barberos` y `productos`, así que no
  hay N+1 ni varias consultas (§10.10).
- 4 métricas (`grid-cols-2 lg:grid-cols-4`): barberías, activas, inactivas y citas del mes
  (la suma de `citas_mes`).
- Barra de filtros: buscador por **nombre o slug** + select de estado
  (Todas / Activas / Inactivas) + contador "Mostrando X–Y de Z registros".
- Tabla `overflow-x-auto` + `min-w-[900px]` con 7 columnas: Nombre (avatar, con
  `citas_total` y `productos` como línea secundaria), Slug (`<code>`), Estado (**punto +
  etiqueta**, `bg-green-600` / `bg-slate-300`, sin pill §11.3), Citas del mes,
  Servicios / Barberos, Alta (`toLocaleDateString('es-MX')`) y Acciones.
- Paginación real de **8** por página, y **solo se dibuja si hay más de una**.
- Tres mensajes separados a propósito: `errorCarga` (con botón **Reintentar**),
  `errorAccion` (escrituras, `role="alert"`) y `aviso` (éxito del alta, `role="status"` +
  botón "Cerrar"). No se pisan entre sí.
- Carga con `useCallback` + `useEffect` y el
  `// eslint-disable-next-line react-hooks/set-state-in-effect`: el mismo patrón con **0
  problemas** de `CitasCliente` (§9.7, §15.1).

Acciones por fila (3 botones con ícono, `aria-label` y `title`; se deshabilitan mientras
esa fila tiene una escritura en curso):

1. **Editar** → abre `BarberiaForm` con la barbería; solo se cambia el **nombre**.
2. **Activar / Desactivar** → `confirm()` nativo y
   `update({ activa }).eq('id', b.id)` con `{ count: 'exact' }`. ⚠ El `count` **se revisa
   a propósito**: un `UPDATE` que RLS no deja pasar afecta **0 filas sin lanzar error**
   (§10.5), y sin ese chequeo el interruptor mentiría.
3. **Abrir sitio** → `window.open('https://<slug>.<dominio-base>')`.

**`dominioBaseDeBarberias()`** (2026-10-17) lee **`VITE_DOMINIO_BASE`** (§14.1) y nada más.
Ya **no** deduce el dominio quitándole el primer subdominio al host, porque contar partes
funcionaba con `tusoftware.com` (2 etiquetas) y **se rompía** con `gools.com.mx` (3); ahora
`BarberiaProvider` y este archivo leen la misma variable y no pueden discrepar. Devuelve
`null` —y el botón sale **deshabilitado con `title`**— solo cuando la variable no está
definida (local sin configurar), que es el único caso en que esa dirección no existe.

**`BarberiaForm.jsx` (291 líneas)** — un solo modal para alta y edición, con las clases de
`ServicioForm` (§9.4): label visible + `id`, `soloCampo`, foco con anillo `primary` y
errores `role="alert"`.

- **Con `barberia` → edición**: solo el nombre; el slug sale `disabled` con la nota "El
  slug no se puede cambiar porque es parte de la dirección".
- **Sin `barberia` → alta**: nombre, slug, correo del dueño y contraseña temporal
  (mín. 8). El slug se **sugiere** desde el nombre (`slugDeNombre`, sin acentos) mientras
  el usuario no lo escriba a mano (`slugManual`).
- La contraseña va `type="text"` **a propósito**: hay que copiarla y pasársela al dueño,
  que entra con ella.
- La validación del cliente está **duplicada de la base y de la Edge Function**:
  `^[a-z0-9]+(-[a-z0-9]+)*$`, 3–40 caracteres y no reservado (`www`, `app`, `admin`,
  `api`, `superadmin`, `mail`, `soporte`). El **check de la BD es la última palabra**
  (§10.10).
- El alta llama a `supabase.functions.invoke('crear-barberia', { body })`. Como supabase-js
  solo deja un "non-2xx status code", **`mensajeDeLaFuncion(error)`** lee `error.context`
  (el `Response` original) y saca el `error` en español del cuerpo; si no lo consigue,
  cae al texto genérico.
- Al guardar bien: el padre (`BarberiasSuper.alGuardar`) recalcula `eraAlta` **antes de
  cerrar** el modal y, solo en el alta, muestra una vez *"Barbería creada. Pásale al dueño
  su correo y la contraseña temporal."*

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

**Sí hay carpeta `supabase/`** desde 2026-10-13 (la Edge Function de recordatorios,
§4) y el esquema **sí quedó versionado en migraciones** desde 2026-10-16 (las del
multi-barbería, §10.8). Hoy hay **dos** Edge Functions en `supabase/functions/`
(`enviar-recordatorios` y `crear-barberia`, §10.7 y §10.10) y **11 migraciones** por MCP
(resumen completo en §10.11). Esquema verificado por MCP (2026-10-16), columna por
columna:

| Tabla | Columnas reales | Notas |
|---|---|---|
| **`barberias`** | `id uuid PK`, `nombre text NOT NULL`, `slug text NOT NULL`, `activa boolean NOT NULL DEFAULT true`, `created_at timestamptz NOT NULL DEFAULT now()` | **Entidad raíz del multi-barbería.** `slug` con `barberias_slug_valido` (3–40 caracteres, regex `^[a-z0-9]+(-[a-z0-9]+)*$` y no reservado, §10.10) + `barberias_slug_unico`. **Una sola política de lectura: `activa`** → una barbería dada de baja desaparece del sitio sin borrar nada. Fila raíz: `Kromatik` / `kromatik` (`565afd8a-`…). Las políticas que leen/escriben **todas** las filas son `Superadmin lee todas` / `Superadmin escribe` (§10.5). Hoy hay **2** filas: `kromatik` (la raíz, del backfill) y `barber-shop` (creada por el usuario; **no borrarla**) |
| `citas` | `id uuid PK`, `nombre text NOT NULL`, `telefono text NOT NULL`, `servicio text NOT NULL`, `fecha date NOT NULL`, `hora time NOT NULL`, `estado text NULL DEFAULT 'pendiente'`, `created_at timestamp NULL DEFAULT now()`, `correo text`, `notas text`, `addon boolean NULL DEFAULT false`, `total numeric`, `barbero_id uuid`, `productos jsonb NOT NULL DEFAULT '[]'`, `cliente_id uuid`, `recordatorio_enviado_at timestamptz NULL`, **`recordatorio_24h_enviado_at timestamptz NULL`**, **`recordatorio_2h_enviado_at timestamptz NULL`**, **`barberia_id uuid NOT NULL → barberias(id)`** | las **dos FK** son `citas_barbero_id_fkey` → `barberos(id)` con **`ON DELETE SET NULL`** y `citas_barberia_id_fkey` → `barberias(id)` (sin cascade, **no se puede borrar una barbería con citas**). `cliente_id` **no tiene FK ni trigger**: apunta a `auth.users` por convención. Las **3 columnas `recordatorio_*`** son marcas, **no** estados: la del WhatsApp la escribe el panel (§9.5), las otras dos la Edge Function (§10.7) |
| `servicios` | `id`, `nombre`, `categoria`, `descripcion`, `costo numeric`, `duracion text`, `imagen`, `created_at`, **`barberia_id uuid NOT NULL → barberias(id)`** | `duracion` es TEXT sin CHECK |
| `productos` | `id`, `nombre`, `descripcion`, `categoria NOT NULL`, `precio numeric NOT NULL`, `imagen`, `created_at`, **`stock integer`**, **`barberia_id uuid NOT NULL → barberias(id)`** | `stock` solo lo lee `ProductosPage`; ni el admin ni `BookingPage` lo tocan |
| `barberos` | `id`, `nombre`, `especialidad`, `disponible boolean NULL DEFAULT true`, `imagen`, `created_at`, **`rating numeric DEFAULT 0`**, **`total_resenas integer DEFAULT 0`**, `sillon_numero integer`, `sillon_nombre text`, **`barberia_id uuid NOT NULL → barberias(id)`** | `rating`/`total_resenas` los usa `BarberosAdmin`; `sillon_*` no los usa nadie (§18.25) |
| `configuracion` | `id integer PK` (**con secuencia**, ya no forzado a `1`), `nombre text NOT NULL`, `estado text`, `municipio text`, `logo text`, `descripcion text`, `updated_at timestamptz`, **`recordatorios_activos boolean NOT NULL DEFAULT false`**, **`barberia_id uuid NOT NULL → barberias(id)`** con **`unique (barberia_id)`** | **una fila por barbería** (se eliminó el `check (id = 1)` y el `id` tiene secuencia). La usan los dos rails, `ConfiguracionAdmin` y el provider, todos filtrando por `barberia_id`. **`recordatorios_activos` es el interruptor del envío automático de ESA barbería** (§10.7) |
| **`perfiles`** | `id uuid PK → auth.users(id) ON DELETE CASCADE`, `rol text NOT NULL DEFAULT 'cliente'` con **`check (rol in ('superadmin','admin','cliente'))`**, `nombre text`, `created_at timestamptz NOT NULL DEFAULT now()`, **`barberia_id uuid NULL → barberias(id)`** | **Fuente de verdad del rol y de la barbería del admin.** La app solo hace SELECT; el INSERT lo hace el trigger `trg_crear_perfil` de `auth.users` (§10.6) y **nunca escribe `barberia_id`**: se asigna por SQL (§10.4) |
| **`membresias`** | `user_id uuid NOT NULL → auth.users(id)` con **`ON DELETE CASCADE`**, `barberia_id uuid NOT NULL → barberias(id)` (sin cascade: no cascadea con `citas`, que ya lo impide), `created_at timestamptz NOT NULL DEFAULT now()`, **PK `(user_id, barberia_id)`** | **Una cuenta, varias barberías** (§10.9). Es la pertenencia del **cliente** a una barbería; `perfiles.rol` sigue siendo global. Índice en `barberia_id`. La app **solo hace SELECT**: el alta la hace la RPC `unirme_a_barberia`, y no hay política de INSERT/UPDATE/DELETE |

⚠ **Inconsistencia real a respetar:** `servicios` usa la columna **`costo`** y
`productos` usa **`precio`**. La UI lo normaliza a `$X MXN` al mostrar. No unifiques
una sin cambiar la otra y las consultas.

⚠ `citas.servicio` almacena los **nombres de los servicios como texto**, no un id ni
una FK, y ahora puede traer **varios separados por `,`** (§8). Por eso el admin tiene
que resolverlos a mano con `buscarServicio()` (§9.5). Igual `citas.fecha` es un
**string** (no `timestamptz`) y se compara lexicográficamente en `ResumenPage` — de ahí
el formato `YYYY-MM-DD` en `BookingPage`.

⚠ **`barberia_id` es la llave del multi-barbería.** Está en las 5 tablas de negocio
(`citas`, `servicios`, `productos`, `barberos`, `configuracion`) como `uuid NOT NULL →
barberias(id)`, con índice en cada tabla, y **sin `ON DELETE CASCADE`**: no se puede
borrar una barbería que tenga citas. `perfiles.barberia_id` es **nullable** (los 5
clientes lo tienen `NULL`; solo el admin de una barbería lo lleva) y `configuracion` es
`unique (barberia_id)`. El backfill de 2026-10-16 mandó **todas** las filas existentes a
la barbería raíz `Kromatik` (3/3 servicios, 12/12 productos, 1/1 barberos, 25/25 citas,
1/1 configuracion, 1/7 perfiles).

`barberos.disponible` es booleano, default `true` (`barbero?.disponible ?? true`).

⚠ `citas.cliente_id` es **nullable**: de las 25 filas actuales (2026-10-16), **16 la
tienen en `null`** (creadas antes del portal del cliente). Si borras la cuenta de un
cliente en Supabase, sus citas quedan huérfanas para siempre porque no hay FK ni trigger
que las limpie (§18.41).

⚠ **`perfiles` tiene `ON DELETE CASCADE` contra `auth.users`**, pero `citas.cliente_id`
**no**: borrar la cuenta de un cliente elimina su perfil (y su rol) al instante y deja
sus citas apuntando a un `auth.users` que ya no existe. `perfiles` y `citas` precisam
estrategias distintas de borrado; no las trates igual.

⚠ La columna `rol` tiene `CHECK (rol in (...))` pero **no tiene índice propio**: es un
`text` y se busca por `id` (la PK), así que para la app da igual. Si algún día se
consulta "dame todos los admins", ese índice hará falta.

### 10.3 Storage

- Bucket: **`imagenes`** (público).
- **Con el multi-barbería la ruta empieza por la barbería**:
  `` `<barberia_id>/servicios/…` ``, `` `<barberia_id>/productos/…` ``,
  `` `<barberia_id>/barberos/…` `` y `` `<barberia_id>/configuracion/…` ``.
  Nombre completo: `` `${barberiaId}/${carpeta}/${Date.now()}-${archivoOriginal}` ``.
- ⚠ **Las imágenes anteriores a 2026-10-16 siguen en `servicios/…`, `productos/…`,
  `barberos/…` y `configuracion/…` (sin barbería)**: **no se movieron ni se borraron**,
  y siguen funcionando porque la URL se guarda entera en la columna `imagen`/`logo`.
  El prefijo nuevo solo aplica a los archivos que se suban de ahora en adelante.
- Se sube con `.upload(path, file)` y se resuelve la URL con
  `supabase.storage.from('imagenes').getPublicUrl(path).data.publicUrl`.
  No hay `createSignedUrl`.
- **No hay borrado de archivos en storage**: al eliminar un registro, su imagen queda
  huérfana en el bucket. Preexistente.
- No hay buckets de `videos`/`audio`, ni transformaciones, ni `upsert`.
- ⚠ **Deuda (no se tocó): la única política del bucket es `Admin sube imagenes`
  (INSERT, `with check (bucket_id = 'imagenes')`)**, sin `es_admin()` y sin condición
  de carpeta. Cualquier cuenta autenticada puede subir cualquier archivo a cualquier
  ruta del bucket, incluida la carpeta de otra barbería. El aislamiento de imágenes
  **no** está en RLS: está en que el panel solo escribe en la carpeta que le toca
  (§9.4). Si algún día se endurece, hay que revisar que las URLs ya guardadas (que son
  públicas) sigan resolviendo (§18.58).

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
- ⚠ **La barbería del admin vive en `perfiles.barberia_id`** (nullable: los clientes lo
  tienen `NULL`). El trigger `trg_crear_perfil` **no** lo escribe: se asigna por SQL
  (`update public.perfiles set barberia_id = '<uuid>' where id = '…'`), igual que el
  rol. `AuthContext` lo expone como `barberiaId` y `ProtectedRoute` lo compara con la
  barbería del sitio (§5).
- ⚠ `AuthContext` **no expone** ningún helper de rol: cada pantalla que lo necesita
  saca `rol` de `useAuth()` y, para decidir destinos, usa `rutaInicioPorRol(rol)`
  (§5). No vuelvas a leer `user_metadata` "porque es más rápido".

### 10.5 RLS y políticas (verificado en la BD por MCP, 2026-10-16)

**Las 8 tablas tienen RLS habilitado** (`barberias`, `barberos`, `citas`,
`configuracion`, `membresias`, `perfiles`, `productos`, `servicios`). Esto no se ve en el repo: se
comprobó con `pg_tables.relrowsecurity`. Las **23 políticas** vigentes, con su
expresión real (las **3 de `membresias`** se detallan en §10.9):

| Tabla | Política | Comando | Rol | USING / WITH CHECK |
|---|---|---|---|---|
| `barberias` | `Lectura publica` | SELECT | `anon`, `authenticated` | **`activa`** |
| `barberias` | `Superadmin lee todas` | SELECT | `authenticated` | **`es_superadmin()`** |
| `barberias` | `Superadmin escribe` | ALL | `authenticated` | **`es_superadmin()`** / idem |
| `citas` | `Cualquiera puede agendar` | INSERT | `anon`, **`authenticated`** | — / **`EXISTS (select 1 from barberias b where b.id = citas.barberia_id and b.activa)`** |
| `citas` | `Admin escribe` | ALL | `authenticated` | **`barberia_id = barberia_del_usuario()`** / idem |
| `citas` | `Superadmin escribe` | ALL | `authenticated` | **`es_superadmin()`** / idem |
| `citas` | `cliente ve sus citas` | SELECT | `authenticated` | `(auth.uid() = cliente_id)` |
| `servicios` | `Lectura publica` | SELECT | `anon`, **`authenticated`** | `true` |
| `servicios` | `Admin escribe` | ALL | `authenticated` | **`barberia_id = barberia_del_usuario()`** / idem |
| `servicios` | `Superadmin escribe` | ALL | `authenticated` | **`es_superadmin()`** / idem |
| `productos` | `Lectura publica` | SELECT | `anon`, **`authenticated`** | `true` |
| `productos` | `Admin escribe` | ALL | `authenticated` | **`barberia_id = barberia_del_usuario()`** / idem |
| `productos` | `Superadmin escribe` | ALL | `authenticated` | **`es_superadmin()`** / idem |
| `barberos` | `Lectura publica` | SELECT | `anon`, **`authenticated`** | `true` |
| `barberos` | `Admin escribe` | ALL | `authenticated` | **`barberia_id = barberia_del_usuario()`** / idem |
| `barberos` | `Superadmin escribe` | ALL | `authenticated` | **`es_superadmin()`** / idem |
| `configuracion` | `Lectura publica` | SELECT | `anon`, `authenticated` | `true` |
| `configuracion` | `Admin escribe` | ALL | `authenticated` | **`barberia_id = barberia_del_usuario()`** / idem |
| `configuracion` | `Superadmin escribe` | ALL | `authenticated` | **`es_superadmin()`** / idem |
| `perfiles` | `Usuario lee su perfil` | SELECT | `authenticated` | `(auth.uid() = id)` |

⚠ **El aislamiento por barbería vive en `barberia_id = barberia_del_usuario()`** (§10.6).
Un admin solo ve y escribe **su** barbería; el `superadmin`, todas. `barberias` es la
excepción: se lee con `activa` (público, sin sesión) y solo el superadmin ve las
inactivas.

⚠ **`Cualquiera puede agendar` exige que la barbería esté `activa`**: cualquier INSERT
público en `citas` **tiene que** llevar un `barberia_id` de una barbería activa o RLS lo
rechaza con un error (este sí es error, no 0 filas).

⚠ **El catálogo (`servicios`, `productos`, `barberos`, `configuracion`) sigue con
`using (true)`**: RLS **no puede ver el subdominio**, así que un visitante lee el
catálogo de *todas* las barberías. Es dato público por diseño (nombre, precio, foto) y
el frontend se lo queda solo del de la barbería del slug (§3). Queda como deuda: si
algún día hay catálogos que no deban verse entre barberías, la RLS necesita un cambio de
modelo (§18.60).

⚠ **`Admin escribe` ahora es por barbería, no por rol**: la condición es
`barberia_id = barberia_del_usuario()`. Antes de 2026-10-16 era `es_admin()` (cualquier
admin escribía en todas las filas) y, antes, `using true` /
`with check true` para **cualquier** cuenta autenticada, o sea que un cliente
registrado podía editar el catálogo entero desde el navegador. Verificado simulando
roles el 2026-10-16: el admin de Kromatik consigue **0 filas** al tocar datos de otra
barbería y **3** en los suyos, y un cliente logueado **0 filas** en todo el catálogo.

⚠ **La autorización de escritura descansa en `barberia_del_usuario()`, y esa función NO
mira el rol** (§10.6): devuelve `perfiles.barberia_id` sin comprobar que el perfil sea
`admin` o `superadmin`. Hoy los 5 clientes lo tienen `NULL` — y `NULL = uuid` nunca es
`true`, así que quedan fuera —, pero **si algún día se le asigna una barbería a un perfil
de cliente, ese cliente gana escritura en esa barbería**. Queda anotado (§18.59).

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
(por barbería: `Admin escribe` → `barberia_id = barberia_del_usuario()`). Por eso las
horas ocupadas se piden por RPC (§10.7).

⚠ **`perfiles` no tiene política de INSERT ni de UPDATE**, a propósito: nadie cambia
su rol **ni su barbería** desde la app, **ni siquiera un admin**. El alta la hace el
trigger (§10.6) y una
promoción se hace por SQL. Un `update perfiles set rol = 'superadmin'` devuelve **0
filas**, silenciosamente — y lo mismo un `set barberia_id = '…'`.

⚠ **`configuracion` es legible por `anon`**: el nombre, el logo y la descripción de la
barbería son públicos por diseño (se muestran en el sitio y en los dos paneles). No
añadas ahí columnas de negocio privada sin revisar esta política.

⚠ **`configuracion` pasó de `INSERT` + `UPDATE` a un `ALL` por barbería**: antes no
tenía DELETE y nadie podía borrar la fila, ni
siquiera un admin. Con el `ALL` actual el admin **sí** puede borrar la de su barbería;
hoy no hay pantalla que lo haga, pero si algún día hay que impedirlo, habrá que partirlo
otra vez en `INSERT`/`UPDATE`.

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
- Estado verificado (2026-10-16): **1 `superadmin` + 1 `admin` + 5 `cliente`** (§18.49).
- Para promover a alguien: `update public.perfiles set rol = 'admin' where id = (…)`.
  **No se puede desde la app**, ni siquiera con sesión de admin (§10.5).

#### Funciones del multi-barbería (migración `funciones_barberia_y_superadmin`)

```sql
public.barberia_del_usuario() returns uuid     -- perfiles.barberia_id del usuario; NULL sin sesión
public.es_superadmin()        returns boolean  -- true solo si el rol es 'superadmin'
```

`language sql stable security definer set search_path = ''`, con `revoke all` + `grant
execute to authenticated` (verificado en `proacl`) y **nada para `anon`**.

- **`barberia_del_usuario()`** es la llave del aislamiento: es la condición `USING` **y**
  `WITH CHECK` de las 5 políticas `Admin escribe` (§10.5). ⚠ **No comprueba el rol**: solo
  devuelve `perfiles.barberia_id` (ver §10.5 y la deuda §18.59).
- **`es_superadmin()`** gobierna `Superadmin escribe` (en las 6 tablas) y `Superadmin lee
  todas` (`barberias`).

⚠ **`es_admin()` quedó huérfano**: sigue definido y concedido a `authenticated`, pero
**ninguna política lo usa ya** (antes gobernaba todas las escrituras del panel). No lo
uses en políticas nuevas: el equivalente por barbería es `barberia_del_usuario()`.

#### Funciones de rol (migración `funciones_rol`)

```sql
public.rol_actual() returns text   -- rol del usuario autenticado; NULL si no hay sesión
public.es_admin()   returns boolean -- true si es 'superadmin' o 'admin'
```

Las dos `language sql stable security definer set search_path = ''` (verificado
`provolatile = 's'`, `prosecdef = true`). `security definer` porque RLS de `perfiles`
solo deja ver la fila propia; `stable` porque no cambian dentro de la sentencia.

Permisos verificados (`proacl`): `revoke all from public` **+** `grant execute to
authenticated`, y **nada para `anon`**. Comprobado simulando `anon`: la llamada falla
con *permission denied*, así que un visitante sin sesión no puede ni preguntar su rol.

⚠ **`es_admin()` ya no lo usa ninguna política** (§10.5): desde el multi-barbería la
escritura la decide `barberia_del_usuario()` y, para el dueño del software,
`es_superadmin()`. Sigue definido y concedido a `authenticated`, pero es **código
huérfano**: no lo uses en políticas nuevas. Si algún día hay un cuarto rol con permisos
de escritura, amplía las funciones del multi-barbería y las políticas, no el frontend.

#### Función RPC `horas_ocupadas` (migración `rpc_horas_ocupadas`, ampliada después)

```sql
public.horas_ocupadas(fecha_consulta date, barberia_id uuid, barbero_id uuid default null)
  returns setof time  language sql  stable  security definer  set search_path = public
```

Devuelve **solo la columna `hora`** de las citas no canceladas. Existe porque `citas`
**no** es legible por `anon` (expondría nombre, teléfono y correo) y sin embargo
`/agendar` necesita saber qué horas están tomadas. Se llama desde el cliente con
`supabase.rpc('horas_ocupadas', { fecha_consulta: 'YYYY-MM-DD', barberia_id, barbero_id: null })`
(los tres parámetros; el último es opcional).

- `revoke all … from public` + `grant execute … to anon, authenticated`: sin esto,
  cualquier rol nuevo podría ejecutarla.
- Devuelve `'HH:MM:SS'`; el cliente recorta a `'HH:MM'` con `.slice(0, 5)`.
- Con **barbero concreto** devuelve las horas ocupadas de ese barbero; con
  `barbero_id = null` ("Cualquier barbero") devuelve las horas en las que **ya no queda
  ni un barbero libre**, y si no hay ningún barbero disponible devuelve cualquier cita
  viva del día. Son tres ramas en `UNION`.
- ⚠ Como `citas.hora` es `time`, la comparación es exacta: `'11:00'` y `'11:50'` **no**
  chocan aunque una cita de 70 min se solape con la siguiente. §18.6.

#### Función RPC `asignar_barbero(fecha_consulta date, hora_consulta time, barberia_id uuid) → uuid`

`language sql, stable, security definer`, ejecutable por `anon` y `authenticated`.
Devuelve el `id` del **primer barbero de esa barbería, disponible y libre a esa hora
exacta**
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

#### Índice único parcial `citas_slot_unico` (migración `slot_unico_por_fecha_hora`, recreado en `slots_y_rpc_por_barberia`)

```sql
create unique index citas_slot_unico on public.citas (barberia_id, fecha, hora)
  where coalesce(estado, 'pendiente') <> 'cancelada'
```

Bloqueo optimista: dos personas no pueden tomar la misma franja **en la misma barbería**
(antes de 2026-10-16 el índice era `(fecha, hora, barbero_id)`: solo chocaba el mismo
horario **con el mismo barbero**).
El insert o el update duplicado falla con **`error.code === '23505'`**, que
`BookingPage` y `CitasCliente` traducen a "Ese horario acaba de ser tomado, elige otro" +
refresco de las horas ocupadas.

✅ **Las citas sin barbero ya están cubiertas**: el índice nuevo **no lleva `barbero_id`**,
así que repetir la misma franja en la misma barbería falla con `23505` **aunque
`barbero_id` sea `null`** (verificado). Antes quedaban fuera (§18.46) y hoy **20 de las 25
filas siguen sin `barbero_id`**, pero ya no pueden solaparse entre sí.

⚠ La misma migración tuvo que **cancelar una fila duplicada** (2025-09-30 11:50, dos
citas 'pendiente') porque Postgres no puede crear el índice con el conflicto. **No se
borró**: la fila sigue existiendo con `estado = 'cancelada'`. Cualquier intento de
recrear el índice con datos duplicados fallará otra vez.

### 10.7 Envío automático de recordatorios (Edge Function + `pg_cron`)

Única parte del proyecto que corre **fuera de `src/`**: el código vive en
`supabase/functions/enviar-recordatorios/index.ts` (versionado en el repo, sin secretos) y
está **desplegado** en Supabase. Sus migraciones sí están en el historial
(`cita_recordatorios_automaticos`, `configuracion_recordatorios_activos`,
`cron_recordatorios`, `rpc_recordatorios_solo_service_role` y, desde el multi-barbería,
`recordatorios_citas_pendientes_por_barberia`).

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

#### Estado real de `cron.job` (verificado por MCP el 2026-10-17)

Lo que hay **en la base** ya no es lo que dice la migración `cron_recordatorios`:

| jobname | schedule | Función que llama | Canal |
|---|---|---|---|
| `enviar-recordatorios-cada-hora` | `0 * * * *` | `enviar-recordatorios` | correo |
| `enviar-whatsapp-cada-hora` | `10 * * * *` | `enviar-whatsapp` | WhatsApp |

- ⚠ El job de la migración, **`enviar-recordatorios` (`5 * * * *`), ya NO existe**: se
  quitó y lo sustituyó `enviar-recordatorios-cada-hora` (`0 * * * *`), que **contradice el
  motivo del minuto 5** documentado arriba (minuto 0 era justo lo que la migración quería
  evitar). Si alguna vez se recrea desde la migración, aparecerían **dos jobs de correo**
  a la vez y la función no remandaría (solo marca lo que ya envió), pero duplicaría
  disparos.
- ⚠ Ninguno de los dos nombres coincide con el de la migración, así que
  `cron.unschedule('enviar-recordatorios')` de esa migración **ya no limpia nada**.
  **No borres ni recrees jobs sin autorización**: es un cambio de base de datos.
- Los minutos están separados (0 y 10) a propósito: los dos canales no se disparan a la vez.

⚠ **`resend` sigue en `dependencies` del `package.json` del frontend** (verificado el
2026-10-17), que es donde §17 dice que no debe estar: la Edge Function corre en Deno y
trae su propia resolución de imports, y la app web no usa esa librería. No entra al bundle
mientras nada en `src/` la importe, pero queda como dependencia de la web.

#### Canal de WhatsApp (2026-10-17, sin migración registrada)

Es el gemelo del de correo y **funciona igual**, pero con su propia pila:

- **Edge Function `enviar-whatsapp`** (desplegada, `verify_jwt: false`, al igual que la de
  correo: se autentica con el secreto, no con el JWT del gateway).
- **Job `enviar-whatsapp-cada-hora`** (`10 * * * *`).
- **Columnas de marca** en `citas`: `recordatorio_wa_24h_enviado_at` y
  `recordatorio_wa_2h_enviado_at` (`timestamptz`, nullable, sin default).
- **Interruptor** `configuracion.whatsapp_activo` (`boolean NOT NULL DEFAULT false`), **por
  barbería** como el del correo. Lo controla el panel (§9.5).
- **RPC `reclamar_recordatorios_wa(p_tipo text, p_limite_total int, p_limite_por_barberia int)`**
  (`security definer`): **reclama y marca en la misma operación** (un `UPDATE ... returning`
  sobre las candidatas), así que dos ejecuciones simultáneas no mandan dos veces lo mismo.
  Filtra por `barberias.activa`, `configuracion.whatsapp_activo` (esta es la que respeta el
  interruptor), `telefono` no vacío, `estado in ('pendiente','confirmada')`, la marca de su
  ventana en `NULL`, y la ventana de 1 h `[ahora+23h, ahora+24h]` / `[ahora+1h, ahora+2h]`
  **en la zona horaria de la barbería** (`barberias.zona_horaria`, columna nueva; hoy las
  dos barberías están en `America/Mexico_City`). Aplica además un **tope por barbería**
  (`row_number() partition by barberia_id` + `p_limite_por_barberia`), que es lo que
  impide que una sola barbería se lleve todo el presupuesto del día.
- **RPC `liberar_recordatorio_wa(p_cita_id uuid, p_tipo text)`** (`security definer`): pone
  en `NULL` la marca de esa ventana. Es la que se llama cuando **el envío falla**, para que
  el siguiente intento pueda reintentarlo en vez de dar la cita por avisada. ⚠ Es también
  la razón de que un teléfono no normalizable se quede en "pendiente" en el panel (§9.5).

⚠ **Nada de esto tiene entrada en `supabase_migrations`**: la última migración sigue siendo
`barberias_slug_valido_check` (§10.11). Las columnas, las dos RPC, el job y la Edge Function
se aplicaron a mano. Misma deuda que §18.45, ahora también en el canal de WhatsApp: quien
reconstruya el proyecto las pierde en silencio y el interruptor del panel se guardaría sin
que nada lo lea.

#### Las 2 RPC (`service_role` únicamente)

Ambas son `security definer` + `set search_path = ''`, con `revoke all from public` y
`grant execute to service_role`. ⚠ **Pero eso NO las deja solo para `service_role`**: ver
la advertencia inmediatamente debajo.

- **`recordatorios_secreto_valido(p_secreto text) → boolean`**: compara el header con el
  secreto de Vault. Es `security definer` porque una Edge Function llega por JWT y su
  rol no puede leer `vault.decrypted_secrets` directamente.
- **`recordatorios_citas_pendientes(p_desde, p_hasta, p_columna_marca, p_maximo)`**:
  devuelve las citas de la ventana `[p_desde, p_hasta]` cuya marca sigue en `NULL`, con
  el nombre del barbero (`left join barberos`) y, desde el multi-barbería, también
  **`barberia_id`** y **`barberia_nombre`** (`join barberias`) — así el correo sale con
  el nombre del negocio correcto. Filtra con
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
2. **Interruptores (uno por barbería)**: lee `configuracion.recordatorios_activos` de
   **cada** barbería. Las que lo tengan en `false` se omiten (van a
   `omitidas_por_interruptor`); si no queda ninguna activa, responde
   `200 {enviados: 0, motivo: 'interruptor apagado'}`.
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

### 10.8 Migraciones del multi-barbería (2026-10-16 y 2026-10-17)

Nueve migraciones aplicadas por MCP, en este orden, todas verificadas (las 7-9 son las de
membresías, §10.9). Más tarde se añadieron las dos del superadmin (§10.10) — el **resumen
completo de las 11 está en §10.11**. `list_migrations` las devuelve con fecha `20261017…`:

| # | Migración | Qué hizo |
|---|---|---|
| 1 | `barberias_tabla` | creó `barberias` (con `barberias_slug_unico` y `barberias_slug_formato`) y su política `Lectura publica` (`activa`). Insertó la fila raíz `Kromatik` / `kromatik` (`565afd8a-…`) |
| 2 | `barberia_id_en_tablas_de_negocio` | añadió `barberia_id` a las 5 tablas de negocio **y** a `perfiles`, **backfilleó** todo a Kromatik, lo puso `NOT NULL` (salvo `perfiles`), creó un índice por tabla y el `unique (barberia_id)` de `configuracion`, y quitó el `check (id = 1)` |
| 3 | `funciones_barberia_y_superadmin` | `barberia_del_usuario()` y `es_superadmin()` (§10.6), `stable`, `security definer`, `search_path ''`, ejecutables por `authenticated` |
| 4 | `rls_multi_barberia` | reescribió las políticas de escritura de `es_admin()` a `barberia_id = barberia_del_usuario()`, añadió `Superadmin escribe` en las 6 tablas, `Superadmin lee todas` en `barberias`, y el `WITH CHECK` de `Cualquiera puede agendar` (barbería **activa**) |
| 5 | `slots_y_rpc_por_barberia` | recreó `citas_slot_unico` como `(barberia_id, fecha, hora)` y las RPC `horas_ocupadas` / `asignar_barbero` con `barberia_id` (drop + create: cambia la firma) |
| 6 | `recordatorios_citas_pendientes_por_barberia` | la RPC de recordatorios devuelve además `barberia_id` y `barberia_nombre` (join a `barberias`) |
| 7 | `membresias_tabla` | creó `membresias` (§10.9) con PK `(user_id, barberia_id)`, índice en `barberia_id`, RLS activado y **3 políticas de SELECT** (cliente / admin de su barbería / superadmin). **Sin** INSERT/UPDATE/DELETE |
| 8 | `rpc_unirme_a_barberia` | la RPC `unirme_a_barberia(p_barberia_id uuid)`: `security definer`, `search_path ''`, exige sesión + rol `cliente` + barbería `activa`, idempotente. Con los `revoke` explícitos de `anon`/`authenticated`/`public` y `grant` solo a `authenticated` |
| 9 | `membresias_backfill_desde_citas` | alta de las membresías de los clientes que ya tenían citas: por `cliente_id`, y por `correo` para las citas viejas que lo tienen en `null`. `on conflict do nothing`: 0 duplicados |

⚠ **No se perdió ningún dato**: la migración 2 mandó todas las filas existentes a
Kromatik (verificado: 3/3 servicios, 12/12 productos, 1/1 barberos, 25/25 citas, 1/1
configuracion, 1/7 perfiles). El esquema anterior quedó copiado en el esquema
`respaldo_2026_10_17` (su propia migración, con el mismo md5): se restaura con
`insert into public.<tabla> select * from respaldo_2026_10_17.<tabla> on conflict do
nothing;` y se borra con `drop schema respaldo_2026_10_17 cascade;`.

⚠ **Las RPC de cliente siguen sin migración** (`cancelar_cita`, `reagendar_cita`, la
columna `cliente_id` y la política `cliente ve sus citas`): ver §18.45.

---

### 10.9 Membresías por barbería (2026-10-17)

Tres migraciones por MCP —`membresias_tabla`, `rpc_unirme_a_barberia` y
`membresias_backfill_desde_citas` (§10.8, 7-9)—. **Ninguna toca roles, ni las políticas
de otras tablas, ni el índice de horarios.**

**La tabla `membresias`** (`user_id`, `barberia_id`, `created_at`, PK
`(user_id, barberia_id)`) dice qué **cliente** pertenece a qué barbería. `user_id` es
`auth.users` con **`ON DELETE CASCADE`**: borrar la cuenta se lleva sus membresías.
`barberia_id` es `public.barberias(id)` **sin** cascade. Índice propio en `barberia_id`.
RLS activado, con **tres políticas de SELECT y ninguna de escritura**:

| Tabla | Política | Comando | Rol | USING |
|---|---|---|---|---|
| `membresias` | `Cliente lee sus membresias` | SELECT | `authenticated` | `auth.uid() = user_id` |
| `membresias` | `Admin lee las de su barberia` | SELECT | `authenticated` | `barberia_id = barberia_del_usuario()` |
| `membresias` | `Superadmin lee todas las membresias` | SELECT | `authenticated` | `es_superadmin()` |

⚠ **No hay INSERT, UPDATE ni DELETE.** Verificado: un cliente autenticado que intenta
`insert into membresias` recibe **`42501`**, y un `update`/`delete` suyos afectan **0
filas** en silencio (el modo de fallo de §10.5). El único camino de alta es la RPC.

**La RPC `unirme_a_barberia(p_barberia_id uuid) → void`**: `plpgsql`, `security definer`,
`set search_path = ''`. Es idempotente (`on conflict (user_id, barberia_id) do nothing`) y
comprueba, en este orden: que hay sesión (`auth.uid() is not null`, si no `raise
'sin_sesion'`), que el perfil es `cliente` (si no `raise 'solo_clientes'`: **admin y
superadmin quedan fuera**) y que la barbería existe y está `activa` (si no `raise
'barberia_no_disponible'`). Inserta `(auth.uid(), p_barberia_id)`. La llama el efecto de
`Contenido` en `src/App.jsx` (§5.1).

⚠ **`revoke all from public` NO bastó** (la misma lección que §10.7): Supabase concede
`execute` a `anon` y `authenticated` por `alter default privileges`. La migración hace
`revoke execute … from anon, authenticated, public` y **después** `grant execute … to
authenticated`. Verificado con `has_function_privilege`: `anon` → **false**,
`authenticated` → **true**; y `select unirme_a_barberia(…)` como `anon` da **`permission
denied for function`**. (`service_role` conserva la concesión por defecto; es inalcanzable
desde el navegador.)

**El backfill** hizo dos pasadas, las dos con `on conflict (user_id, barberia_id) do
nothing` para **no duplicar**: (a) las citas que ya traen `cliente_id`, uniendo con
`perfiles` y filtrando `rol = 'cliente'`; (b) las citas **sin `cliente_id`** pero con
`correo`, casando `lower(correo)` contra `lower(auth.users.email)` — la columna que existe
es **`correo`**, no un `email`. Resultado: **3 membresías**, todas en Kromatik, y las **9
citas con `cliente_id` quedaron cubiertas**. La pasada por correo **añadió 0 filas
nuevas**: el único correo que casaba (`mau.rs0309@gmail.com`) ya había entrado por
`cliente_id`, y el `on conflict` evitó el duplicado.

⚠ **Los otros 2 clientes no tienen ni una cita**, así que no tienen membresía hasta que
entren a una barbería (ahí la crea la RPC). Y de los **16 correos** de citas sin
`cliente_id`, 15 no corresponden a ninguna cuenta: son correos de prueba
(`2313@correo.con`, `Juan@Perezgmail.com`, `d`, `jhghj`…). El backfill **no inventa
cuentas**.

**En el frontend** (§5.1, §6.2): `AuthContext` expone `unirmeABarberia(barberiaId)` en un
`useCallback` de identidad estable, y un efecto de `Contenido` (`src/App.jsx`) lo llama
cuando hay sesión, `rol === 'cliente'` y la barbería está resuelta. Se corre **una vez por
usuario y barbería**: `Contenido` no se remonta al navegar, así que no se repite en cada
cambio de ruta (en `StrictMode` sí son 2 llamadas en desarrollo; la RPC es idempotente).

**Aislamiento verificado** (con una barbería temporal `prueba-membresias-b` y su gemela
inactiva, borradas al terminar; el admin se movió temporalmente a B y se devolvió a
Kromatik, verificado al final):

| Caso | Resultado |
|---|---|
| Cliente X se une a A y luego a B; repite B | 2 membresías, sin duplicar ✅ |
| Cliente Y solo en B | 1 membresía ✅ |
| Cliente X `select` | ve **solo las 2 suyas** ✅ |
| Admin de A (Kromatik) | ve **4** (las 3 del backfill + X) y **0** de B; **0** de la cliente que solo está en B ✅ |
| Admin de B | ve **2** (las de B) y **0** de A; **0** de los clientes que solo están en A ✅ |
| Superadmin | ve las **6** ✅ |
| Anónimo | **0** filas ✅ |
| Cliente `insert` a mano | **`42501`** ✅ |
| Cliente `update`/`delete` a mano | **0** filas ✅ |
| RPC como admin / superadmin | `solo_clientes` ✅ |
| RPC con barbería inactiva o inexistente | `barberia_no_disponible` ✅ |
| RPC como `anon` | `permission denied for function` ✅ |

⚠ **`citas` y `membresias` no están relacionadas por FK**: la membresía dice "este cliente
pertenece a esta barbería", no "esta cita es suya". El portal del cliente sigue filtrando
sus citas por `cliente_id` **y** por la barbería del sitio (§5), así que una membresía
nueva no le muestra citas de otras barberías. Queda anotado en §18.

---

### 10.10 Alta de barberías desde el superadmin (2026-10-17)

Tres piezas nuevas, todas aplicadas por MCP y verificadas. **Ninguna toca roles,
políticas de otras tablas ni datos existentes** (la única que escribió datos fue la
prueba, ya borrada). El resumen completo de migraciones está al final de §10.11.

#### Migración `superadmin_resumen_barberias`

```sql
public.superadmin_resumen_barberias()
  returns table (id uuid, nombre text, slug text, activa boolean, created_at timestamptz,
                 citas_mes bigint, citas_total bigint, servicios bigint, barberos bigint,
                 productos bigint)
  language plpgsql  stable  security definer  set search_path = ''
```

- Agrega en **una sola llamada** los números de **todas** las barberías (un
  `count(*)` por tabla de negocio dentro de la función), así que el panel no hace N+1
  (§9.9).
- `citas_mes` cuenta las citas del **mes en curso**; `citas_total`, todas.
- Empieza con `if not public.es_superadmin() then raise exception 'solo_superadmin' using
  errcode = '42501'; end if;` → un admin o un cliente que la llame recibe **`42501:
  solo_superadmin`**. Verificado.
- `revoke all from public` + `grant execute … to authenticated`, **y además** los
  `revoke execute … from anon, authenticated, public` explícitos: `revoke all from public`
  **no basta** en Supabase (§10.7). `proacl` verificado
  (`{postgres, service_role, authenticated}`) y `has_function_privilege('anon') = false`.

#### Migración `barberias_slug_valido_check`

```sql
alter table public.barberias drop constraint barberias_slug_formato;
alter table public.barberias add constraint barberias_slug_valido
  check (length(slug) between 3 and 40
         and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
         and slug not in ('www','app','admin','api','superadmin','mail','soporte'));
```

- Sustituye el `barberias_slug_formato` viejo (que solo miraba minúsculas/números/guiones)
  por las **tres** reglas del formulario y de la Edge Function: longitud, forma y
  reservados.
- ⚠ **Se comprobó antes que los datos actuales cumplían** (`kromatik`, `barber-shop`): si
  alguna fila no cumpliera, el `add constraint` falla y hay que limpiarla primero. La
  regex del check es la **fuente de verdad**; el frontend y la función solo la anticipan
  para dar un mensaje mejor.
- ⚠ **La lista de este `check` tiene hoy menos reserved que el frontend** (2026-10-17):
  el resolver de `BarberiaProvider` (§3) reserva además **`avisos` y `send`**, y este
  `check`, la Edge Function `crear-barberia` y `BarberiaForm` **no**. El `check` es el
  que manda, así que un slug de esos **se puede dar de alta** y su sitio nunca resuelve.
  Añadirlos requiere **una migración** (y tocar la función y el formulario); está
  pendiente y anotado en §18.74. El dominio (`gools.com.mx`) **no aparece aquí** porque
  este `check` solo valida el slug, no la dirección.

#### Edge Function `crear-barberia`

`supabase/functions/crear-barberia/index.ts`, desplegada por MCP (`verify_jwt: true`,
`import_map_path: "deno.json"` **explícito** — sin eso el deploy reutiliza el import map
absoluto del despliegue anterior y falla, §10.7). Es el **único** camino para crear la
cuenta de un dueño: `perfiles` no tiene política de INSERT/UPDATE (§10.5) y el navegador
no tiene `service_role`.

Orden de ejecución (todo o nada):

1. **CORS + `POST`** obligatorio (el preflight `OPTIONS` se responde antes que nada).
2. **Quién llama**: valida el JWT (`auth.getUser`) y lee `perfiles.rol`; si no es
   `superadmin`, **403** con *"Solo el superadmin puede crear barberías."*. Un `anon` ni
   llega: el gateway lo corta antes con **401**.
3. **Validaciones** con los mismos límites que el check y el formulario (nombre, slug
   3–40 + regex + no reservado, correo con regex, contraseña ≥ 8) → **400**.
4. **Slug libre**: `select id from barberias where slug = …`. Si ya está → **409**.
5. **Alta escalonada**, deshaciendo a mano lo anterior si algo falla:
   `barberias` → `auth.admin.createUser({ email, password, email_confirm: true })` →
   `update perfiles set rol='admin', barberia_id=…` (con `{ count: 'exact' }`) →
   `insert` en `configuracion`.
   - El trigger `trg_crear_perfil` ya creó el perfil como `cliente` al crear el usuario de
     auth; aquí solo se **promueve** (§10.6).
   - `deshacer()` borra el usuario de auth (que arrastra su perfil por el
     `ON DELETE CASCADE`) y la barbería con su `configuracion`.
   - `email_confirm: true` para que el dueño pueda entrar sin confirmar el correo: el
     correo se lo pasa el superadmin a mano y no hay bandeja (§18.44).
6. **Errores traducidos al español**: correo ya registrado → **409** *"Ya existe una cuenta
   con ese correo…"*; contraseña débil → **400**; y el `23505` del índice
   `barberias_slug_unico` → **409** con el mismo mensaje del paso 4. ⚠ **Dos altas del
   mismo slug a la vez** pasan las dos el chequeo previo y chocan en el `insert`: el
   rechazo es correcto, pero el mensaje tiene que ser el del slug en uso y no un 500
   genérico — lo encontró la prueba de extremo a extremo y se corrigió.

⚠ **`SUPABASE_URL`, no `SUPABASE_API_URL`** (§10.7), y `SUPABASE_SERVICE_ROLE_KEY` los
inyecta el runtime: la función **no lleva ningún secreto** y no necesita ninguno nuevo.

#### Verificación de extremo a extremo (2026-10-17)

Con cuentas temporales creadas por SQL y sus tokens sacados con `net.http_post`
(`grant_type=password`), luego **borradas** junto con la barbería de prueba:

| Prueba | Resultado |
|---|---|
| Superadmin llama `crear-barberia` | **200**, barbería + usuario creados, perfil `admin` con su `barberia_id`, fila en `configuracion` ✅ |
| Cliente autenticado llama la función | **403** *"Solo el superadmin…"* ✅ |
| Sin cabecera `Authorization` | **401** del gateway ✅ |
| Slug repetido (secuencial) | **409** *"El slug … ya está en uso…"* ✅ |
| Slug repetido (carrera entre dos altas) | **409** por el `23505` (tras el fix) ✅ |
| Slug reservado (`admin`) | **400** ✅ |
| Correo ya existente | **409** y **rollback completo** (0 barberías y 0 usuarios de más) ✅ |
| Admin (no superadmin) llama la RPC del resumen | **42501: solo_superadmin** ✅ |
| `anon` llama la RPC | `permission denied for function` ✅ |
| Superadmin lee la RPC | **3** barberías (las 2 reales + la temporal), conteos por barbería ✅ |
| Dueño nuevo: `update` sobre servicios de **otra** barbería | **0 filas** ✅ |
| Dueño nuevo: `insert` de un servicio con `barberia_id` ajeno | **42501** ✅ |
| Dueño nuevo: `select citas` | **0 filas** (no ve las de Kromatik) ✅ |
| Admin de Kromatik: `update` sobre `barberias` | **0 filas** ✅ |
| Superadmin: `update activa` sobre `barberias` | **1 fila** ✅ |
| Barbero desactivado + `anon` | `barberias` deja de devolverlo (`Lectura publica` = `activa`) ✅ |

⚠ **La prueba dejó la BD en el estado de partida** (verificado): 2 barberías, 8 perfiles,
5 membresías y **0 filas** `zz-*`.

### 10.11 Resumen de migraciones aplicadas por MCP

`list_migrations` las devuelve con fecha `20261017…`, en este orden. Las 1-6 son del
multi-barbería (§10.8), las 7-9 de membresías (§10.9) y las 10-11 del superadmin (§10.10):

| # | Migración | Qué hizo |
|---|---|---|
| 1 | `barberias_tabla` | creó `barberias` + su política `Lectura publica` (`activa`); fila raíz `Kromatik` |
| 2 | `barberia_id_en_tablas_de_negocio` | `barberia_id` en las 5 tablas + `perfiles`, backfill a Kromatik, `NOT NULL`, índices, `unique (barberia_id)`, quitó `check (id = 1)` |
| 3 | `funciones_barberia_y_superadmin` | `barberia_del_usuario()` y `es_superadmin()` |
| 4 | `rls_multi_barberia` | políticas de escritura por barbería + `Superadmin escribe` / `Superadmin lee todas` |
| 5 | `slots_y_rpc_por_barberia` | `citas_slot_unico` `(barberia_id, fecha, hora)` + RPC `horas_ocupadas` / `asignar_barbero` con `barberia_id` |
| 6 | `recordatorios_citas_pendientes_por_barberia` | la RPC de recordatorios devuelve `barberia_id` y `barberia_nombre` |
| 7 | `membresias_tabla` | creó `membresias` con 3 políticas de SELECT y sin escritura |
| 8 | `rpc_unirme_a_barberia` | la RPC de alta de membresías (solo `cliente`, barbería activa, idempotente) |
| 9 | `membresias_backfill_desde_citas` | membresías de los clientes que ya tenían citas |
| 10 | `superadmin_resumen_barberias` | RPC del resumen por barbería (§10.10) |
| 11 | `barberias_slug_valido_check` | constraint del slug: longitud + forma + reservados (§10.10) |

⚠ **Sigue sin migración** el esquema de cliente (`citas.cliente_id`, la política
`cliente ve sus citas` y las RPC `cancelar_cita` / `reagendar_cita`): ver §18.45.

---

## 11. Reglas de UI/UX

**El proyecto tiene DOS sistemas visuales, y es intencional.** No los unifiques sin
que el usuario lo pida:

| Zona | Sistema | Tokens |
|---|---|---|
| **Dashboard `/admin`** (8 archivos en `src/pages/admin/`) | Sistema actual, rediseñado | `slate` / `primary` / `amber` / `navy` |
| **Portal del cliente `/cliente`** (2 archivos en `src/pages/cliente/`) | **El mismo sistema claro del admin** | `slate` / `primary` / `navy` |
| **Panel del superadmin `/superadmin`** (3 archivos en `src/pages/superadmin/`) | **El mismo sistema claro del admin** | `slate` / `primary` / `amber` / `navy` |
| **Sitio público** (`/`, `/agendar`, `/login`, `/servicios`, `/productos`, `/contacto`) | Sistema anterior, **sin tocar** | `neutral-*` / `sky-500` / `emerald` / `amber` / `yellow` |

⚠ **`/superadmin` también es tema claro aunque su usuario sea el dueño del software**: es
la misma decisión de "zona de la empresa" que `/cliente`, y sus archivos son copias
recortadas del shell y de los patrones del admin. Cualquier zona futura del software
(ej. facturación) debe copiar esos mismos tokens.

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
- Los **cuatro** menús hamburguesa (`AdminDashboard` en `<lg`, `ClienteDashboard` en
  `<lg`, `SuperadminDashboard` en `<lg`, `Navbar` en `<md`) exponen `aria-label`
  dinámico ("Abrir menú" / "Cerrar menú"), `aria-expanded` y `aria-controls` apuntando al
  `id` del panel desplegable (`menu-movil-admin`, `menu-movil-cliente`,
  `menu-movil-superadmin`); los íconos SVG llevan `aria-hidden` y el botón tiene
  `focus-visible:ring-2`.
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

### 12.1c Panel del superadmin `/superadmin`

`SuperadminDashboard.jsx` es la **tercera copia** del mismo shell (§12.1, §12.1b): misma
raíz `flex min-h-screen flex-col bg-slate-50 lg:flex-row`, mismo `<aside>`
`fixed … lg:static lg:flex lg:w-64` oculto por debajo de `lg`, misma barra móvil
`relative z-40 h-14 … lg:hidden`, mismo panel `fixed inset-x-0 top-14 z-50`, misma capa
exterior `fixed inset-0 z-30 bg-navy/20 lg:hidden` y el mismo `Escape` por `onKeyDown`.
Solo cambia el `aria-controls` (`menu-movil-superadmin`) y que el único link es
"Barberías". **Si cambias el shell de uno, revisa los tres.**

`BarberiasSuper` (la página) sigue §12.1 al pie de la letra:

| Patrón | Dónde |
|---|---|
| `grid grid-cols-2 gap-4 lg:grid-cols-4` | las 4 métricas |
| `flex flex-wrap items-center gap-2` | barra de filtros (buscador + select de estado) |
| `overflow-x-auto` + `min-w-[900px]` en la `<table>` | las 7 columnas de barberías: scroll horizontal en móvil |
| `flex flex-wrap items-start justify-between gap-3` | cabecera (título + "Nueva barbería") |
| `max-h-[90vh] overflow-y-auto` + `w-full max-w-md` | el modal `BarberiaForm` (igual que los del admin) |
| `grid gap-4 sm:grid-cols-2` | si algún día el modal apila campos de dos en dos (hoy el formulario va en columna) |

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
- ⚠ Los **cuatro** menús hamburguesa (admin, cliente, superadmin y público) cierran con
  `Escape` **solo si el foco está dentro**, porque el listener es un `onKeyDown` en el
  contenedor y no un `document.addEventListener`. Es deliberado: evita `useEffect` +
  listener global. Si algún día hace falta cerrar desde fuera, habrá que añadir el
  listener global **solo** a esos cuatro shells.
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

⚠ **Excepción ya resuelta en 3 sitios** (patrón correcto, no lo "normalices"):
`Servicios.jsx` y `Productos.jsx` (públicos) revisan el `error`, muestran un estado
**"No pudimos cargar los servicios/productos."** con botón **"Reintentar"** que
vuelve a llamar al `cargarX()`, y `CitasCliente` tiene un `errorCarga` aparte con
`role="alert"`. Ninguno de los dos es un `try/catch`: es `if (error) { console.error;
setError(true) }` con su propio flag. **`BarberiasSuper` sigue el mismo patrón** pero con
**tres** estados separados: `errorCarga` (con Reintentar), `errorAccion` (escrituras,
`role="alert"`) y `aviso` (éxito, `role="status"`), que no se pisan entre sí (§9.9).

⚠ **La Edge Function `crear-barberia` no usa este patrón**: no es una lectura ni un modal
del admin, sino un endpoint, y responde con su propio status + `{error}` en español
(400/403/409/500) que el formulario traduce (§10.10). El frontend **nunca** ve un
`error.message` crudo de Supabase en el alta.

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

### 14.1 Variables de entorno (2026-10-17)

Son **cuatro** y las cuatro llevan el prefijo `VITE_` (sin él no llegan al bundle):

| Variable | Para qué | Dónde |
|---|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto | `.env` local **y** variable de compilación en el hosting |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clave publicable | `.env` local **y** variable de compilación en el hosting |
| **`VITE_BARBERIA_SLUG`** | barbería por defecto cuando **no** hay subdominio reconocible (§3): en `localhost`, en un preview y en `*.workers.dev` | `.env` local **y** variable de compilación en el hosting |
| **`VITE_DOMINIO_BASE`** (2026-10-17) | dominio del software contra el que se resuelve el subdominio: `kromatik.gools.com.mx` → `kromatik` (§3). La leen **`BarberiaProvider` y `BarberiasSuper`**, así que no pueden discrepar | `.env` local **y** variable de compilación en el hosting |

⚠ `VITE_DOMINIO_BASE` es de compilación, no de runtime: hay que darla de alta en Cloudflare
(u host equivalente) como *build variable* **antes** de compilar. Valor hoy: **`gools.com.mx`**
(era `tusoftware.com`, hardcodeado como `DOMINIO_BASE` en `BarberiaProvider.jsx`).
**Sin ella**: el resolver cae siempre a `VITE_BARBERIA_SLUG` —que es justo lo que
mantiene el local funcionando—, pero en producción `gools.com.mx` mostraría la barbería de
`VITE_BARBERIA_SLUG` en vez de "Elige tu barbería", y el botón "Abrir sitio" del superadmin
sale deshabilitado. Es el síntoma visible de que falta la variable.

⚠ **`VITE_BARBERIA_SLUG` es de compilación, no de runtime**: es una SPA, así que Vite la
incrusta en el bundle al hacer `build`. Hay que darla de alta en Cloudflare (u host
equivalente) como *build variable* **antes** de compilar; cambiarla en runtime no hace
nada. Valor hoy: `kromatik`.

⚠ El prefijo `VITE_` es obligatorio y las claves de Supabase no son las únicas: si
añades una cuarta, documéntala aquí y en `.env` (que está gitignored, §16).

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
✖ 19 problems (10 errors, 9 warnings)
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

✅ **Medición del 2026-10-16 (ya con el multi-barbería): `10 errors, 9 warnings`.** El
número de **errores no cambió** (los mismos 10); las líneas se movieron porque todos los
efectos de carga ganaron `barberiaId`:

| # | Archivo | Línea | Regla |
|---|---|---|---|
| 1 | `src/context/AuthContext.jsx` | 90 | `react-refresh/only-export-components` |
| 2 | `src/components/Servicios.jsx` | 29 | `react-hooks/immutability` |
| 3 | `src/components/Productos.jsx` | 22 | `react-hooks/immutability` |
| 4 | `src/pages/ServicesPage.jsx` | 16 | `react-hooks/immutability` |
| 5 | `src/pages/ProductosPage.jsx` | 17 | `react-hooks/immutability` |
| 6 | `src/pages/admin/BarberosAdmin.jsx` | 94 | `react-hooks/immutability` |
| 7 | `src/pages/admin/CitasAdmin.jsx` | 380 | `react-hooks/immutability` |
| 8 | `src/pages/admin/ProductosAdmin.jsx` | 69 | `react-hooks/immutability` |
| 9 | `src/pages/admin/ResumenPage.jsx` | 82 | `react-hooks/immutability` |
| 10 | `src/pages/admin/ServiciosAdmin.jsx` | 116 | `react-hooks/immutability` |

⚠ **Los 9 avisos son nuevos y vienen del multi-barbería**: al pasar los efectos de
`useEffect(() => { cargarX() }, [])` a
`useEffect(() => { if (barberiaId) cargarX() }, [barberiaId])`, el plugin emite
**además** el aviso `react-hooks/exhaustive-deps` ("missing dependency: 'cargarX'").
Comprobado con `git show HEAD:src/components/Servicios.jsx`: ese mismo archivo daba
`1 error, 0 warnings` antes. **No son errores y no se tocan** (§17); el arreglo real
(envolver `cargarX` en `useCallback` y subirlo) es el task aparte que §15.1 prohíbe hacer
"de paso". El único aviso que sí era un fallo propio —el `barberiaId` que faltaba en el
efecto del modal de reagendar de `CitasCliente.jsx`— **ya se corrigió** añadiéndolo a las
deps.

✅ **Medición del 2026-10-17 (membresías): sigue en `10 errors, 9 warnings`, 0 nuevos.**
Lo único que se movió fue el error de `AuthContext.jsx`: pasó de la línea 74 a la 90 al
crecer el archivo con `unirmeABarberia` (§6.2). Los otros 9 errores y los 9 avisos siguen
exactamente en las mismas líneas, y los tres archivos nuevos/tocados
(`src/App.jsx`, `src/pages/LoginPage.jsx` y el propio `AuthContext.jsx`) dan **0
problemas** salvo ese error preexistente. `App.jsx` sigue en la lista de "archivos con 0
errores" **a pesar** del efecto nuevo: no declara nada después del `useEffect`.

✅ **Medición del 2026-10-17 (superadmin): sigue en `10 errors, 9 warnings`, 0 nuevos.**
Los **seis** archivos de la tarea —`rutaInicioPorRol.js`, `ProtejerRuta.jsx`, `App.jsx`,
`SuperadminDashboard.jsx`, `BarberiasSuper.jsx` y `BarberiaForm.jsx`— dan **0 problemas**
cada uno, así que ninguno aparece en el desglose de arriba. `BarberiasSuper.jsx` usa el
patrón de carga de `CitasCliente` (`useCallback` + `useEffect` + el
`eslint-disable-next-line react-hooks/set-state-in-effect`), que es el que evita el error
`react-hooks/immutability`. ⚠ **La Edge Function `.ts` no la lintea `pnpm lint`**: el
`eslint.config.js` solo mira `**/*.{js,jsx}`, así que `supabase/functions/crear-barberia`
no hay que añadirlo a `globalIgnores` (verificado: el total no se movió al crearlo).

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
`configuracion.js`, `useConfiguracion.js`, `useConfirmarCita.js`, `rutaInicioPorRol.js`,
`ProtejerRuta.jsx`,
**`src/pages/cliente/ClienteDashboard.jsx` y `CitasCliente.jsx`**,
**`src/pages/superadmin/SuperadminDashboard.jsx`, `BarberiasSuper.jsx` y
`BarberiaForm.jsx`**, `AdminDashboard.jsx`, `ConfiguracionAdmin.jsx`, los 4 `*Form` y
`CitaManualForm.jsx`.

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
- **Multi-barbería** — con `VITE_BARBERIA_SLUG=kromatik` (o el subdominio
  `kromatik.tusoftware.com`) la app entra normal. Las **pruebas de aislamiento** hechas el
  2026-10-16 con una barbería temporal (`prueba-temp`, borrada al terminar) fueron:
  - **slug inexistente** (`VITE_BARBERIA_SLUG=no-existe`) → la pantalla "Esta barbería no
    está disponible"; si además falta la variable, el texto avisa de `sinSlug` (§3);
  - **barbería inactiva** → no se ve desde `anon` (`Lectura publica` = `activa`) y su
    INSERT en `citas` se rechaza con `42501`; con una barbería **inexistente**, igual;
  - **admin de otra barbería** → `/admin` muestra "Esta cuenta no pertenece a esta
    barbería" (§5); el **superadmin** sí entra a cualquiera;
  - **admin de Kromatik** → 0 filas al escribir en la otra barbería y 3 en la suya; un
    **cliente** → 0 filas en todo el catálogo y `42501` al intentar insertar; ambos solo
    ven las citas que les toca (el admin 25, el cliente 0 propias);
  - **franja horaria** → la misma `(fecha, hora)` convive en dos barberías; repetirla en
    la misma da `23505`, aunque la cita no tenga barbero (§10.5);
  - **recordatorios** → la Edge Function respondió `{"enviados":0,"motivo":"interruptor
    apagado"}` con el secreto correcto y `401` con uno falso (§10.7).
  ⚠ Al terminar se borraron esas filas: la base quedó en **1 barbería, 25 citas, 3
  servicios, 12 productos, 1 barbero y 1 fila de `configuracion`**.
- **Superadmin (`/superadmin`)** — entrando con la cuenta `superadmin` se llega al panel;
  con una cuenta `admin` o `cliente`, `/superadmin` **rebota** a `/admin` o `/cliente`
  (`rutaInicioPorRol`, §5). En el panel la tabla lista **todas** las barberías con sus
  conteos; "Nueva barbería" crea una con su dueño, y el dueño nuevo entra al sitio de su
  barbería y llega a un `/admin` **vacío** (esa barbería aún no tiene datos); **Desactivar**
  una barbería hace que su sitio muestre "Esta barbería no está disponible" sin borrar
  nada. Las pruebas de BD del 2026-10-17 están en §10.10 (permisos, slug repetido,
  correo existente, rollback); la barbería temporal y sus usuarios **se borraron** al
  terminar. ⚠ Lo único que no se puede probar sin navegador es el render: el botón
  "Abrir sitio" sale **deshabilitado con `title`** en `localhost` y en `*.workers.dev`
  (§18.75).
- ⚠ **Login con la cuenta `superadmin` (2026-10-17, corregido)** — este es el caso que
  fallaba y **no lo cubre la prueba anterior**, porque aquella empezaba ya dentro de
  `/superadmin`. Con la pestaña en `/login` **sin sesión previa** (que es como entra
  cualquiera), al iniciar sesión como superadmin hay que **aterrizar en `/superadmin`**,
  no en `/admin`. Antes se caía en `/admin` porque el destino se decidía con `rol = null`
  (§18.50). Comprobar también, con las tres cuentas: admin → `/admin`, cliente →
  `/cliente`. Y con `VITE_BARBERIA_SLUG` vacío o apuntando a un slug inexistente,
  **`/login` debe abrir el formulario** (no "Esta barbería no está disponible") y el
  superadmin debe poder entrar a `/superadmin`; el resto de rutas públicas sí muestran la
  pantalla de barbería no disponible (§3).

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

⚠ **Estado del working tree en 2026-10-17 (multi-barbería + membresías + superadmin):
todo este trabajo está SIN COMMITEAR** (~25 archivos modificados y ~10 nuevos, más
`supabase/functions/crear-barberia/`). Las migraciones **sí** están aplicadas en la BD
(§10.11). El commit lo decide el usuario: no lo hagas por tu cuenta ni ejecutes
`git add`/`commit` sin pedirlo.

---

## 16. Archivos sensibles

| Archivo | Por qué |
|---|---|
| `.env` | Credenciales de Supabase. Gitignored. **Nunca commitear, nunca imprimir en una respuesta, nunca subir.** |
| `src/supabaseClient.js` | Único punto de conexión. Un typo en el nombre de la env var rompe **toda** la app silenciosamente. |
| `src/context/AuthContext.jsx` | Sesión y `onAuthStateChange`. El cleanup incorrecto deja listeners duplicados. |
| `src/components/ProtejerRuta.jsx` | Guard de rutas de **`/admin` y `/cliente`**. Romperlo deja ambos paneles abiertos o inaccesibles. |
| `src/main.jsx` | Orden de los providers (`BrowserRouter` > `AuthProvider`). |
| `src/context/BarberiaProvider.jsx` | Resuelve la barbería por **slug** (subdominio o `VITE_BARBERIA_SLUG`); si no la encuentra, **ninguna ruta se monta** (§3). Un error en `DOMINIO_BASE` o en el parseo del subdominio deja la app entera en "Esta barbería no está disponible". |
| `src/App.jsx` | Tabla de rutas **y** los 3 layouts. Único lugar donde se registran las páginas. La ruta `/cliente` está al final del `<Routes>`, fuera del layout público. |
| `package.json` / `pnpm-lock.yaml` | No los edites para "subir una dependencia menor". |
| `public/barber.jpg` | 2.2 MB, referenciado por ruta absoluta `/barber.jpg` en `Hero.jsx`. Si lo mueves o renuevas, actualiza el `src`. |
| `src/pages/BookingPage.jsx` | El archivo más grande y el más frágil del flujo de citas (985 líneas: wizard + borrador en `sessionStorage` + auto-asignación de barbero). §8. |
| `src/pages/cliente/CitasCliente.jsx` | Única vista de las citas del usuario. Depende de la política `cliente ve sus citas` **y** de las RPC `cancelar_cita` / `reagendar_cita`: si cambias cualquiera de las dos cosas, revisa este archivo y sus modales. |
| `src/pages/admin/CitasAdmin.jsx` | Único archivo del frontend con los recordatorios: el WhatsApp manual (§9.5) y el interruptor del automático (§9.5). Si lo rompes, el canal de respaldo y el que apaga el automático se caen juntos. |
| `supabase/functions/enviar-recordatorios/index.ts` | **Nunca debe llevar un secreto.** Todo se lee del entorno. Si aparece una clave ahí, hay que borrarla y rotarla. |
| `supabase/functions/crear-barberia/index.ts` | **Nunca debe llevar un secreto** y **nunca** puede devolver la contraseña ni la `service_role`. Es el único camino que crea usuarios de auth y escribe `perfiles`; si su verificación de `superadmin` se afloja, cualquiera con la clave publicable podría crear barberías y dueños. Se despliega con `import_map_path: "deno.json"` explícito (§10.10). |
| `cron.job` (`enviar-recordatorios`) | El comando lleva la `anon` key (pública) y **lee el secreto de Vault en vivo**: si alguien reescribe el job a mano, que no lo hardcodee. Se recrea con `cron.unschedule` + `cron.schedule` (§10.7). |
| `src/pages/cliente/ClienteDashboard.jsx` | Shell de `/cliente`. Copia el patrón de `AdminDashboard`: si cambias uno, cambia los dos (§12.1b). |
| `src/pages/superadmin/` (3 archivos) | Shell + listado + modal del superadmin. El shell copia el patrón de `AdminDashboard` (§12.1c) y `BarberiaForm` es el único sitio del frontend que invoca `crear-barberia`: si lo rompes, no se pueden dar de alta barberías. |
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
- **No renombres ni reconfigures las tablas** de Supabase (`barberias`, `citas`,
  `servicios`, `productos`, `barberos`, `configuracion`, `perfiles`), **ni quites
  `barberia_id`** de las 5 tablas de negocio: es la llave del aislamiento (§10.5).
- **No unifiques `servicios.costo` y `productos.precio`** sin migrar también las
  consultas, los formularios y la UI.
- **No cambies el bucket `imagenes`** ni el prefijo por barbería de las rutas nuevas
  (`<barberia_id>/servicios|productos|barberos|configuracion/`). **No muevas ni borres las
  imágenes anteriores a 2026-10-16** (están sin ese prefijo y siguen resolviendo porque la
  URL se guarda entera en `imagen`/`logo`). No lo hagas privado sin migrar las URLs ya
  guardadas.
- **No introduzcas políticas de RLS, vistas, funciones SQL ni triggers** sin autorización
  explícita. **Las 7 tablas YA tienen RLS habilitado** con las políticas de §10.5: no es
  opcional ni se puede "quitar". Cinco trampas concretas: (1) el sitio público inserta en
  `citas` con la clave publicable desde el navegador, así que **cualquier política sobre
  `citas` debe admitir `INSERT` tanto a `anon` como a `authenticated`**, o se rompe el
  agendamiento para los usuarios registrados;
  (2) el panel va autenticado, así que **cualquier tabla que el panel escriba necesita una
  política `authenticated` cuya condición sea `barberia_id = barberia_del_usuario()`**
  (o `es_superadmin()` para el dueño del software), o el `update` afecta 0 filas sin
  avisar;
  (3) una política declarada solo `to anon` **desaparece para quien tiene sesión**:
  PostgREST usa el rol `authenticated` en las peticiones con JWT, así que las lecturas
  del catálogo son `to anon, authenticated`;
  (4) **el cliente solo tiene SELECT sobre `citas`** (`auth.uid() = cliente_id`): cualquier
  escritura suya tiene que pasar por una RPC `SECURITY DEFINER`, no por un `update`
  directo;
  (5) las funciones de `public` (`rol_actual`, `es_admin`, `barberia_del_usuario`,
  `es_superadmin`, `cancelar_cita`, `reagendar_cita`, `asignar_barbero`, `horas_ocupadas`,
  `recordatorios_secreto_valido`, `recordatorios_citas_pendientes`) llevan `revoke all` +
  `grant execute` a roles concretos: **al recrearlas, repite los grants**, o el cliente
  recibe `permission denied`. `barberia_del_usuario` y `es_superadmin` son **solo** de
  `authenticated` (nada a `anon`).
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

**Multi-barbería — no lo deshagas**
- **Nada de negocio sin `barberia_id`.** Toda lectura de `citas`, `servicios`, `productos`,
  `barberos` y `configuracion` va con `.eq('barberia_id', barberiaId)`; los `update` y
  `delete` del panel también; y todo `insert` lo incluye (§3). El `barberiaId` que va a la
  base es **siempre** el de la barbería del slug (`useBarberia().barberia.id`), **no** el de
  `useAuth()`.
- **No muevas `BarberiaProvider`** fuera de `App` ni por encima de `AuthProvider`: el orden
  es `BrowserRouter > AuthProvider > App (BarberiaProvider > Routes)` y el gate que impide
  montar rutas sin barbería depende de él (§3).
- **No montes las `Routes` sin el gate**: la pantalla "Esta barbería no está disponible" y
  el chequeo `barberiaId !== barberia.id` del guard son lo que impide que un admin vea el
  panel de otra barbería (§3, §5). ⚠ Es UX: la autorización real es RLS (§10.5).
- **No deshagas el gate de las zonas sin barbería** (§3): `sinBarberia` en `Contenido`
  (`src/App.jsx`) y `esZonaSuperadmin` en `ProtectedRoute` son lo que saca a
  `/superadmin` y a `/login` de `BarberiaProvider`. `/superadmin` se abre desde el
  **dominio principal, sin slug**; `/login` es la puerta y tiene que funcionar aunque
  `VITE_BARBERIA_SLUG` falte. Si quitas cualquiera de los dos, la pantalla "Esta barbería
  no está disponible" taparía el panel del software y **el login mismo**: sin login no se
  entra a ninguna zona, tampoco a la del superadmin. Cualquier ruta futura fuera de una
  barbería necesita el mismo tratamiento.
- **No decidas el destino de un rol leyendo `cargandoRol`**: úsalo junto a `rol`
  (`rolListo` en `LoginPage`, `cargandoRolDeVerdad` en `ProtectedRoute`, §5). `rol` y
  `cargandoRol` vienen en un solo objeto de `useAuth()`: si esperas solo al segundo,
  decides con el `rol` viejo y mandas al superadmin a `/admin`. Y todo sitio que decida
  un destino debe llamar a `rutaInicioPorRol` (§5), no repetir el `if`.
- **No montes `ConfiguracionProvider` en `/superadmin`**: esa fila es por barbería y ahí
  no hay ninguna que mostrar.
- **No crees un segundo camino para el alta de barberías**: el único es la Edge Function
  `crear-barberia` (§10.10), que es la que puede crear el usuario del dueño y escribir su
  rol. **No crees barberías ni usuarios "a mano" desde el frontend, ni le abras a nadie
  (ni al superadmin) la escritura de `perfiles`.**
- **No aflojes la verificación de `superadmin`** de `crear-barberia` (JWT + `perfiles.rol`)
  ni la de la RPC `superadmin_resumen_barberias` (`es_superadmin()`): son lo único que
  impide que cualquier cuenta con la clave publicable cree barberías o lea los números de
  todas.
- **El slug de una barbería no se edita desde la UI** (es parte de la dirección del sitio):
  `barberias_slug_valido` (BD, §10.10) es la última palabra del formato. No relajes el
  check ni el `barberias_slug_unico` para "permitir" un slug inválido o repetido.
- **No hardcodees el dominio base** de las barberías: `dominioBaseDeBarberias()` lo deduce
  del host actual (§9.9). Si algún día hace falta una columna, es una migración, no una
  constante.
- **No cambies el nombre ni el valor de `VITE_BARBERIA_SLUG`** sin avisar: es la barbería
  por defecto en `localhost`/preview y es una variable **de compilación** (§14.1).
- **No reintroduzcas `user_metadata.role`** ni uses `perfiles.barberia_id` desde el frontend
  como autorización: el guard es UX, RLS es la autorización (§5, §10.5).
- **No escribas en `membresias` desde la app** (`insert`/`update`/`delete` directos, ni una
  política nueva de escritura): el único camino de alta es la RPC `unirme_a_barberia`
  (§10.9), que decide con `auth.uid()` y comprueba el rol en el servidor. **No quites el
  efecto que llama a esa RPC** en `Contenido` (`src/App.jsx`) ni el `unirmeABarberia` de
  `AuthContext`: sin ellos un cliente nuevo no queda como miembro de la barbería.
- **No metas `barberia_id` en `membresias` a mano por SQL como "arreglo"**: eso es
  exactamente lo que hace la RPC y su backfill, y saltárselo deja la tabla sin la
  comprobación de barbería activa y de rol.

**Arquitectura y routing**
- **No muevas `AuthProvider`** fuera de `main.jsx` ni lo bajes dentro de `App`.
- **No elimines `ProtectedRoute`** de las rutas `/admin`, `/cliente` **y** `/superadmin`, ni
  sus redirects. Las tres listas de `roles` (`['admin','superadmin']`, `['cliente']`,
  `['superadmin']`) son la política de navegación del proyecto: no las relajes para
  "dejar pasar" a un rol que no corresponde.
- **No renombres `src/components/ProtejerRuta.jsx`** sin actualizar el import en
  `App.jsx`.
- **No introduzcas `createBrowserRouter` / loaders / actions.** El router es
  `<Routes>` plano; los datos se cargan en `useEffect`.
- **No crees un store de datos "compartido"** para deduplicar los `cargarX()`: cada
  página es dueña de sus datos. Es redundante a propósito y así funciona. La excepción es
  `useConfirmarCita`, que no guarda datos: recibe el setter de la página (§9.8).
- **No conviertas el wizard de 3 pasos** en otra cosa (un formulario único, un modal,
  multi-página). El `pasoActual` + sidebar pegajoso es el diseño acordado.
- **No compongas `AdminDashboard` con `ClienteDashboard`** (ni al revés, ni con
  `SuperadminDashboard`) para "ahorrar código": son **tres** copias deliberadas con
  contenidos distintos (6 links de administración frente a 1 del cliente y 1 del
  superadmin). Si algún día se unifican, extrae el shell común a un componente nuevo; no
  mezcles las páginas.
- **No quites el gate de sesión de `/agendar`** (`requiereLogin` + borrador) sin hablarlo:
  es lo que garantiza que `citas.cliente_id` se rellene y que el portal del cliente vea
  las reservas.

**UI/UX — aplica al dashboard `/admin`, al portal `/cliente` y al panel del
`/superadmin`; el sitio público tiene su propio sistema**

Estas reglas son **específicas de los tres paneles claros**. El sitio público (`/`,
`/agendar`, `/login`, `/servicios`, `/productos`, `/contacto`, `Navbar`, `Hero`,
`Servicios`, `Productos`, `Contacto`) conserva su lenguaje anterior (`neutral-*`,
`sky-500`, `emerald`, `amber`, `yellow`) y **no se "normalizó" al nuevo**: esa costura
es conocida y solo se cierra si el usuario lo pide.

⚠ **Las reglas que vienen a continuación rigen `src/pages/admin/`, `src/pages/cliente/` Y
`src/pages/superadmin/`.** Las tres usan el mismo sistema claro a propósito (§11) y está
verificado que **ninguna** usa los tokens del tema público (0 coincidencias de
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
| 14 | ~~`AuthContext` / `ProtejerRuta`~~ | **RESUELTO** (2026-10-12): existe el sistema de 3 roles. El rol vive en `perfiles` (§10.2), lo escribe un trigger de la BD y **nadie lo cambia desde la app**; `ProtectedRoute` recibe `roles` y manda al inicio propio cuando no encaja (§5); y **RLS** cierra la escritura del panel por barbería (`barberia_id =
barberia_del_usuario()`, §10.5), no por rol. Verificado simulando roles: un cliente no inserta, no actualiza y no borra nada. |
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
| 27 | ~~`CitasAdmin` — recordatorios~~ | **RESUELTO** (2026-10-13), en los **tres canales** (§9.5). **Manual por WhatsApp**: botón en la tabla y en la tarjeta, abre `wa.me` con el mensaje armado y marca `recordatorio_enviado_at`. **Automático por correo**: Edge Function `enviar-recordatorios` + cron, ventanas H-24 y H-2 con Resend, clave en Vault, límite de 80 correos, marca solo si el envío fue 2xx. **Automático por WhatsApp** (2026-10-17): Edge Function `enviar-whatsapp` + cron, mismas ventanas con `reclamar_recordatorios_wa` / `liberar_recordatorio_wa` y tope por barbería (§10.7). Los dos automáticos tienen su interruptor **por barbería** en `configuracion` (`recordatorios_activos`, `whatsapp_activo`), con cambio optimista, reversión y comprobación de `count`; y el estado por cita en la tarjeta ("24 h enviado / pendiente", "WA 24 h enviado", "Sin correo", "Sin teléfono", atenuado si el canal está apagado). ✅ Verificado de extremo a extremo el de correo, incluida la **segunda ejecución que no reenvía**. ⚠ **Lo que falta es salir a clientes reales**: el dominio de Resend sin verificar (#53) bloquea el correo, y el WhatsApp necesita su proveedor y credenciales configurados; hasta entonces el único canal que llega a un cliente es el **WhatsApp manual**. ⚠ **Nada de esto está en migraciones** (§18.45): columnas, RPC y jobs se aplicaron a mano. |
| 28 | `citas.barbero_id` | Existe en la BD y `BookingPage` **ya lo rellena** (RPC `asignar_barbero` cuando el cliente elige "Cualquier barbero"), pero de las 25 filas actuales **20 lo siguen teniendo en `null`**: son las creadas antes de la auto-asignación y las del alta manual. La columna Barbero sale en "Sin asignar" para esas. ⚠ Además el único barbero de Kromatik está `disponible = false`, así que `asignar_barbero` devuelve `NULL` y hoy la reserva nueva del sitio público acaba sin barbero. |
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
| 41 | `citas.cliente_id` sin FK ni trigger | La columna es `uuid` nullable y **no** referencia `auth.users`: nada impide apuntar a un id inexistente y **borrar la cuenta de un cliente deja sus citas huérfanas** para siempre. Además 16 de las 25 filas actuales (2026-10-16) la tienen en `null`, así que esas reservas no aparecen en `/cliente` y el cliente no puede cancelarlas. Una FK a `auth.users` con `ON DELETE SET NULL` (o `CASCADE`) resolvería la mitad; la otra mitad es un backfill de datos. |
| 42 | `BLOQUES` duplicado | La lista de horarios está **copiada** en `BookingPage.jsx` y en `CitasCliente.jsx` (que la necesita para el modal de reagendar). Si cambias el horario del salón en uno, tienes que cambiarlo en el otro o el cliente podrá reagendar a horas que `/agendar` nunca ofrece. El arreglo real es una tabla `horarios` + RPC, no un constant compartido (§18.6). |
| 43 | `CitasAdmin` no muestra `cliente_id` | `cargarDatos` hace `select('*')`, así que el dato **llega**, pero ninguna columna lo usa: la celda "Cliente" muestra `nombre` y `telefono`. Con el portal `/cliente` ya existe la relación y sería el filtro más útil ("citas sin cliente" = reservas hechas antes de exigir sesión). |
| 44 | `/login` — confirmación de email | No se puede verificar desde el código si el proyecto de Supabase exige confirmar el correo: si lo exige, el registro nuevo muestra "¡Cuenta creada!" pero el usuario **no puede entrar** hasta confirmar, y `/agendar` habrá perdido el borrador si tarda más de 2 h (§8). Única duda pendiente de revisar en el panel de Supabase. |
| 45 | **Esquema aplicado fuera de las migraciones** | `list_migrations` devolvía 9 entradas y la última era `cita_productos_jsonb` (2026-10-06). La columna `citas.cliente_id`, la política `cliente ve sus citas` y las funciones `cancelar_cita` / `reagendar_cita` **no tienen entrada**: se aplicaron directamente en la BD. Si alguien reconstruye el proyecto desde cero (o cambia de proyecto de Supabase), esa parte se pierde en silencio y `/cliente` devuelve listas vacías sin error visible. ⚠ **Sigue abierto**: lo de los recordatorios (§10.7) **sí** quedó en migraciones (`cita_recordatorios_automaticos`, `configuracion_recordatorios_activos`, `cron_recordatorios`, `rpc_recordatorios_solo_service_role`), pero lo anterior no. **Conviene una migración que documente/recree el estado actual.** |
| 46 | ~~`citas_slot_unico` no cubre `barbero_id IS NULL`~~ | **RESUELTO** (2026-10-16): el índice pasó a `(barberia_id, fecha, hora)` **sin `barbero_id`**, así que las citas sin barbero ya chocan (verificado: misma franja en la misma barbería → `23505`, aunque `barbero_id` sea `null`). El precio es que ahora es **una cita por franja por barbería** (§18.61). De las 25 filas actuales, **20 siguen sin `barbero_id`**. |
| 47 | `/contacto` con datos vacíos | Las dos sedes tienen `nombre`, `direccion`, `horarios`, `telefono` y `mapQuery` **en blanco**, así que los `<iframe>` piden `?q=&output=embed` y muestran el mapa equivocado (o nada). Además `s.horarios.map(h => …)` sobre `['']` renderiza una línea vacía. |
| 48 | ARIA inconsistente en el portal del cliente | Los tabs de `CitasCliente` son un `role="tablist"` con `role="tab"` + `aria-selected` **sin `tabpanel`**, exactamente el patrón que `CitasAdmin` evita a propósito con `role="group"` + `aria-pressed`. Además el modal de confirmación de `BookingPage` no tiene `role="dialog"`. No son bugs de runtime, pero rompen la consistencia del proyecto. |
| 49 | ~~El rol `admin` no tenía ninguna cuenta~~ | **RESUELTO** (2026-10-16). Con el multi-barbería se creó la cuenta del dueño de Kromatik (`crisL_rtg@outlook.com`, rol `admin`, `perfiles.barberia_id` = Kromatik). ⚠ **Remedido por MCP el 2026-10-17**: hay **1 `superadmin`**, **2 `admin`** y **5 `cliente`** (el segundo admin es `23302184@utfv.edu.mx`, con `barberia_id` = `barber-shop`, no Kromatik). El `superadmin` sigue entrando a `/admin` (su dashboard propio ya existe en `/superadmin`, §9.9, y su lista `roles` no cambió, §5). |
| 50 | **Cambio de cuenta sin refrescar `rol` a tiempo** | **PARCIALMENTE RESUELTO** (2026-10-17). Lo que sí se corrigió: `cargandoRol` **nunca vuelve a `true`** al cambiar de usuario (§6.2), así que en un login hecho dentro de la app se leía como "listo" mientras `rol` seguía siendo el de "nadie" (`null`): `LoginPage` mandaba a `rutaInicioPorRol(null)` → `/admin` **a todo el mundo, superadmin incluido**, y el guard de `/superadmin` hacía lo mismo (`roles.includes(null)` → `Navigate` a `/admin`, que además lo aceptaba). Ahora ambos esperan a que exista `rol` (`rolListo` y `cargandoRolDeVerdad`, §5). ⚠ **Lo que queda**: si se cierra sesión y se entra con otra cuenta *muy rápido*, `rol` es el de la sesión anterior y no `null`, y la espera no lo detecta: se navega con el rol viejo y el guard corrige en cuanto llega el nuevo. **Si añades una pantalla que lea `rol` fuera del guard, no confíes solo en `cargandoRol`.** El arreglo de raíz es que `cargandoRol` sea derivado (`rolDeUsuario !== userId`) en `AuthContext`, lo que exigiría tocar un archivo fuera del alcance de aquella tarea y un `setState` fuera del `.then` (ojo con `react-hooks/set-state-in-effect`, §15.1). |
| 51 | **`citas.telefono` no está normalizado** | De las 21 filas actuales (verificado 2026-10-13): 6 tienen 10 dígitos, 6 tienen 11 y **9 tienen otra longitud**, así que el botón "Recordar" aparece deshabilitado en esas 9. `telefonoParaWhatsApp()` limpia `00`/`044`/`52`/`1` para tolerar lo que se escribe a mano, pero no puede inventar los dígitos que faltan. La columna es `text NOT NULL` sin CHECK: si quieres garantía, añade `check` o normaliza los datos con un UPDATE (§). |
| 52 | `recordatorio_enviado_at` se marca desde el cliente | El `update` lo hace el navegador del barbero después de abrir WhatsApp, así que la marca depende de que **no cierre la pestaña**. Si el navegador se cierra entre el `window.open` y el `update`, el recordatorio se envió pero no consta. Las **ventanas H-24 y H-2 ya no tienen ese problema**: las marca la Edge Function desde el servidor (§10.7). |
| 53 | **Dominio de Resend sin verificar** | Con el remitente de prueba `notifications@resend.dev` **solo se puede enviar al correo de la cuenta de Resend**: cualquier otro destinatario devuelve un `HTTP 403`, la función lo registra en `resumen.fallos` y **no marca** la cita, así que reintentará cada hora. Comprobado con una cita real: `403`. Antes de apuntarlo a clientes hay que **verificar un dominio** en Resend con los registros DNS. Mientras tanto, **el único canal que llega a un cliente es el manual por WhatsApp** (§9.5). |
| 54 | **Las citas sin `correo` no reciben aviso** | El automático **se salta** toda cita sin correo (van a `resumen.sinCorreo`, que solo sale en el log de la Edge Function). De las 22 filas actuales muchas no lo tienen porque `citas.correo` es **nullable** y `BookingPage` solo lo pide en el paso 3. El panel **no muestra cuántas citas se quedan sin aviso**: solo el log de la función. Si esto molesta, la señal natural es un contador de "citas próximas sin correo" en la tarjeta de recordatorios. |
| 55 | **El automático no se ha probado con una cita real** | Solo se verificó con citas de prueba creadas y borradas a mano (§10.7). El comportamiento con una cita de verdad depende de que su `correo` sea válido (un `HTTP 422` de Resend significa que el correo está mal escrito) y de que el dominio esté verificado (#53). |
| 56 | **Comparar fechas como texto no avisa de un `NaN`** | La lección de los 2 bugs de §10.7: la Edge Function compara `(fecha::text || ' ' || left(hora::text,8))` contra los extremos de la ventana, **como texto**, y un extremo mal formado **no da error**: simplemente deja de encontrar citas… o peor, hace que la ventana matchee de más. Un `Invalid Date` en JS se convirtió en `"NaN-NaN-NaN"`, y como `'NaN…' > '2026…'` en lexicografía, **H-24 pasó a ser "toda cita futura"**. Hoy está protegido con `FORMATO_VENTANA` (aborta con `500` si los 4 extremos no cuadran) y con un `Number.isNaN` dentro de `sumarHoras`. **Si añades otra comparación de fechas por texto en este proyecto, valida el formato antes de comparar.** |
| 57 | **Casi ninguna cita real tiene `correo` usable** | El automático necesita `citas.correo`, que es **nullable**: las 4 de la prueba salían a `23302011@utfv.edu.mx` y el resto no llegó a esa columna con una dirección válida (uno devolvió `422`). O sea: **aunque verifiques el dominio, el automático no le llegaría hoy a casi ningún cliente real**. Lo que falta no es código: es un correo de verdad en esas citas, o un backfill de `citas.correo`. Mismo aviso en #54. |
| 58 | **Bucket `imagenes`: la política no aísla por barbería** | La única política del bucket es `Admin sube imagenes` (INSERT, `with check (bucket_id = 'imagenes')`), **sin `es_admin()` y sin condición de carpeta**: cualquier cuenta autenticada puede subir cualquier archivo a cualquier ruta del bucket, incluida la carpeta de otra barbería. El aislamiento de imágenes **no** está en RLS: está en que el panel solo escribe en la carpeta que le toca (§10.3). Corregirlo obliga a revisar que las URLs ya guardadas (públicas) sigan resolviendo. |
| 59 | **`barberia_del_usuario()` no comprueba el rol** | Es la condición `USING`/`WITH CHECK` de las 5 políticas `Admin escribe` (§10.5), pero solo devuelve `perfiles.barberia_id`: **no verifica que el perfil sea `admin` o `superadmin`**. Hoy los 5 clientes tienen esa columna en `NULL` (y `NULL = uuid` nunca es `true`), así que quedan fuera; pero **si algún día se le asigna una barbería a un perfil de cliente, ese cliente gana escritura en esa barbería**. El arreglo es añadir el chequeo de rol dentro de la función (o usar `es_admin() AND barberia_id = barberia_del_usuario()` en las políticas). |
| 60 | **El catálogo público se lee entre barberías** | `servicios`, `productos`, `barberos` y `configuracion` conservan `using (true)`: **RLS no puede ver el subdominio**, así que un visitante (o cualquier sesión) lee el catálogo de *todas* las barberías y el filtrado por barbería lo hace el frontend (§3). Es dato público por diseño (nombre, precio, foto), pero si algún día hay catálogos que no deban verse entre barberías, hace falta un cambio de modelo (p. ej. una RPC con el slug, o un `barberia_id` en la sesión). Igual pasa con `barberias`: `Lectura publica` deja ver **todas las activas**. |
| 61 | **`citas_slot_unico` es por franja y barbería, sin mirar al barbero** | El índice pasó a `(barberia_id, fecha, hora)` sin `barbero_id`: eso arregla el hueco de las citas sin barbero (#46), pero **una barbería con varios barberos no puede tener dos citas a la misma hora**, ni siquiera con barberos distintos. Con el salón actual (1 barbero) es irrelevante; con más, habrá que volver a un índice por barbero (resolviendo antes las citas con `barbero_id IS NULL`). **Decisión consciente y flagueada.** |
| 62 | **`VITE_BARBERIA_SLUG` es variable de compilación** | Es una SPA: Vite la incrusta en el bundle al hacer `build`, así que hay que darla de alta en el hosting (Cloudflare) como *build variable* **antes** de compilar. Cambiarla en runtime no hace nada. En un preview o en `*.workers.dev` sin esa variable, la app muestra "Esta barbería no está disponible" (§3, §14.1). |
| 63 | **Dos nombres para el mismo negocio** | `barberias.nombre` (hoy `Kromatik`) es el que usan la navbar y el hero; `configuracion.nombre` (hoy `Barberos`) es el que usan los dos rails, `ConfiguracionAdmin` y el saludo de `/cliente`. Se editan en pantallas distintas y **pueden divergir**. Definir cuál es la fuente de verdad (y hacer que la otra lo lea) es un task de producto, no un fix. |
| 64 | **`BookingForm.jsx` (muerto) ya no puede insertar** | Además de no llevar `cliente_id` (#5, §4), su `insert([form])` **no manda `barberia_id`**, que ahora es `NOT NULL`: si alguien lo resucita tal cual, el insert falla. Hay que rehacerle el payload (barbería + cliente + productos + total) o borrarlo. Va en la misma línea que §4 y §8. |
| 65 | **`membresias` no se puede escribir desde la app** | A propósito: sus **tres** políticas son de SELECT y el único camino de alta es la RPC `unirme_a_barberia` (§10.9). Consecuencia real: **no hay forma de quitar a un cliente de una barbería** —ni él, ni el admin, ni el superadmin—; haría falta una RPC de baja que hoy no existe. |
| 66 | **`membresias` y `citas` no comparten FK** | La membresía dice "este cliente pertenece a esta barbería", **no** qué citas son suyas. El portal del cliente filtra por `cliente_id` **y** por la barbería del slug, así que hoy cuadra; pero nada en la BD impide una cita de alguien que no es miembro de esa barbería (las 16 viejas sin `cliente_id`, o una cita manual a nombre de un correo ajeno). |
| 67 | **El "correo ya existe" se detecta por heurística** | `LoginPage` cubre las **dos** formas en que Supabase lo reporta (error de "ya registrado" con la confirmación desactivada, y éxito falso con `identities: []` con la confirmación activada), más el `code: 'user_already_exists'` y un regex sobre el mensaje. Es lo que hay: el cliente no puede saber la configuración del proyecto, así que un cambio de comportamiento o de idioma en Supabase podría dejar el aviso sin disparar (caería en el `registerError.message` crudo). |
| 68 | **El alta automática espera al rol** | El efecto de `Contenido` (`src/App.jsx`) sale antes si `cargandoRol`, así que con el cambio rápido de cuenta de §18.50 la membresía se crea en el render siguiente, no en el mismo. La RPC vuelve a comprobar el rol en el servidor: el peor caso es un `console.error` con `solo_clientes` (rol viejo `cliente`, rol nuevo `admin`), nunca un alta indebida. |
| 69 | **El dueño nuevo no puede cambiar su contraseña temporal** | La crea el superadmin en el alta (§10.10) y se la pasa a mano. La app **no tiene** pantalla de cambio de contraseña, ni `resetPasswordForEmail`, ni flujo de recuperación: el dueño se queda con esa contraseña hasta que alguien la cambie por SQL/deashboard. Es un task aparte (RPC + pantalla), no un fix. |
| 70 | **No hay borrado de barberías desde el panel** | `BarberiasSuper` solo **activa/desactiva** (que es lo que hace desaparecer el sitio, `Lectura publica` = `activa`). Borrar de verdad es por SQL y **falla si la barbería tiene citas** (`citas.barberia_id` sin cascade) o `membresias` (§10.9): primero hay que desvincular o borrar esas filas. El botón de "Eliminar" no existe a propósito; inventarlo obliga a decidir qué hacer con los datos. |
| 71 | **El superadmin no ve el correo del dueño** | La tabla muestra nombre, slug, estado y conteos, pero **no** qué cuenta es la dueña (ni su correo). Si el superadmin pierde ese correo no hay pantalla que lo recupere: `perfiles` no se puede leer por barbería desde el frontend (§10.5) y la RPC del resumen no lo devuelve. Añadirlo es ampliar la RPC + una columna, no un fix. |
| 72 | **El alta deja la `configuracion` a medias** | `crear-barberia` inserta la fila con el **nombre** de la barbería, pero `logo`, `estado`, `municipio` y `descripcion` quedan vacíos: el dueño tiene que rellenarlos en `/admin/configuracion`. Además ese `nombre` **puede divergir** del de `barberias.nombre` (misma deuda #63). |
| 73 | **`crear-barberia` no tiene límite de altas** | No hay rate limiting ni captcha: un superadmin (o su token filtrado) puede crear barberías y usuarios de auth sin tope. Hoy el rol es único y de confianza; si el panel se abriera a más gente, haría falta un límite. |
| 74 | **La lista de slugs reservados está en cuatro sitios y ya no coinciden** | `www`, `app`, `admin`, `api`, `superadmin`, `mail`, `soporte` viven en el check `barberias_slug_valido` (§10.10), en la Edge Function `crear-barberia` y en `BarberiaForm`. El **2026-10-17** se añadió una **cuarta** copia, `SLUGS_RESERVADOS` en `BarberiaProvider.jsx` (§3), con dos reserved más: **`avisos` y `send`**. ⚠ **La base y el formulario NO conocen esos dos**: hoy se podría dar de alta una barbería con slug `avisos` (el `check` lo permite) y su sitio **nunca resolvería**, porque el resolver trata ese subdominio como infraestructura y cae en "Elige tu barbería". El fallo es en la dirección, no un error visible. **El arreglo es añadir `avisos` y `send` al `check` de la base y a las dos listas de la Edge Function y del formulario** (con una migración para el `check`); no se hizo en esta tarea por no incluir migraciones ni el backend. ⚠ Si añades un reservado, tócalos los cuatro: el `check` de la BD es el que manda y es el más difícil de cambiar. |
| 75 | **`Abrir sitio` depende de `VITE_DOMINIO_BASE`** | `dominioBaseDeBarberias()` ya **no deduce el dominio del host contando sus partes** (eso fallaba con `gools.com.mx`, §3): lee `VITE_DOMINIO_BASE` y construye `https://<slug>.<base>`. El botón sale deshabilitado, con `title` explicativo, **solo si la variable no está definida** (local sin configurar). ✅ En un preview de Cloudflare ahora **sí** funciona, siempre que la build variable esté dada de alta; antes no (§9.9). ⚠ El valor es de compilación (§14.1): cambiarla en runtime no abre la dirección nueva. |

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
