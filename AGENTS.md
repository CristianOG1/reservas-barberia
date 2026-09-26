# AGENTS.md — Barbería (Kromatik)

> Contexto permanente para agentes que trabajan en este repositorio.
> Todo lo que sigue fue verificado leyendo el código del repo. No hay suposiciones.
> Si algo de este documento deja de ser cierto, actualiza **este** archivo.

---

## 1. Propósito del proyecto

Sitio web de una **barbería** (cortes de cabello y barba) con dos partes:

- **Sitio público**: landing page con hero y catálogo de servicios, y un flujo de
  reserva de citas en 3 pasos.
- **Panel de administración** (`/admin`): protegido por autenticación, para dar de
  alta/editar/borrar **servicios**, **productos** y **barberos**, y para **gestionar
  las citas** (ver detalle y cambiar su estado).

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

### Grafo de dependencias (verificado con CodeGraph)

```
App.jsx
├── Navbar, Hero, Servicios            → ruta "/"
├── BookingPage                        → ruta "/agendar"
├── LoginPage                          → ruta "/login"
└── ProtectedRoute (ProtejerRuta.jsx)
    └── AdminDashboard                 → layout de "/admin" (envuelve a AdminDashboard)
        ├── Outlet
        ├── ResumenPage                → /admin         (índice)
        ├── ServiciosAdmin → ServicioForm → /admin/servicios
        ├── ProductosAdmin  → ProductoForm → /admin/productos
        ├── BarberosAdmin  → BarberoForm   → /admin/barberos
        └── CitasAdmin                    → /admin/citas

AuthProvider (main.jsx)
└── useAuth()  consumido por: ProtejerRuta, LoginPage, AdminDashboard

supabaseClient (singleton)
└── importado por 11 archivos (21 llamadas): BookingPage, BookingForm,
    AuthContext y los 6 archivos de pages/admin que tocan datos
```

`Productos.jsx` y `BookingForm.jsx` **no** aparecen en este grafo: son código muerto
(ver §4).

---

## 4. Estructura de carpetas

```
barberia/
├── .claude/ .cursor/ .kiro/ .vscode/   config de editores/agentes (solo MCP de codegraph)
├── .codegraph/                         índice de CodeGraph (ignorado por git)
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
│   │   └── AuthContext.jsx             AuthProvider + useAuth
│   ├── components/
│   │   ├── Navbar.jsx                  nav pública
│   │   ├── Hero.jsx                    hero
│   │   ├── Servicios.jsx               grid de servicios (datos hardcodeados)
│   │   ├── Productos.jsx               ⚠ CÓDIGO MUERTO (no importado)
│   │   ├── BookingForm.jsx             ⚠ CÓDIGO MUERTO (no importado, superseded por BookingPage)
│   │   └── ProtejerRuta.jsx            ProtectedRoute
│   └── pages/
│       ├── BookingPage.jsx             wizard de 3 pasos (362 líneas, el más grande)
│       ├── LoginPage.jsx               login
│       └── admin/
│           ├── AdminDashboard.jsx      layout: <aside> + <NavLink> + <Outlet> + logout
│           ├── ResumenPage.jsx         tarjetas de totales + citas de la semana
│           ├── ServiciosAdmin.jsx      CRUD
│           ├── ServicioForm.jsx        modal alta/edición
│           ├── ProductosAdmin.jsx      CRUD
│           ├── ProductoForm.jsx        modal alta/edición
│           ├── BarberosAdmin.jsx       CRUD
│           ├── BarberoForm.jsx         modal alta/edición
│           └── CitasAdmin.jsx          listado + detalle + cambio de estado
├── .env                                credenciales Supabase (gitignored)
├── .gitignore  .mcp.json  opencode.jsonc
├── eslint.config.js  vite.config.js  index.html
├── package.json  pnpm-lock.yaml
└── AGENTS.md                           este archivo
```

### Código muerto — antes de "limpiar", pregunta

| Archivo | Estado | Nota |
|---|---|---|
| `src/components/Productos.jsx` | no importado | `App.jsx` importa `ProductosAdmin`, **no** `Productos`. La landing no muestra la sección de productos. |
| `src/components/BookingForm.jsx` | no importado | Modal simple de agendar; `BookingPage` lo reemplazó. Sigue insertando en `citas` con un payload **distinto** al actual (§8). |
| `src/App.css` | no importado | CSS del template de Vite, con nesting. Inerte. |
| `src/assets/*` | sin uso | `hero.png`, `react.svg`, `vite.svg` |
| `public/icons.svg` | sin uso | |

No los borres ni los "refactorices" por tu cuenta: son trabajo guardable del usuario.

---

## 5. Rutas

Definidas todas en `src/App.jsx` (48 líneas):

| Ruta | Elemento | Auth | Notas |
|---|---|---|---|
| `/login` | `<LoginPage />` | — | Tras login OK: `navigate('/admin')` |
| `/admin` | `<ProtectedRoute><AdminDashboard /></ProtectedRoute>` | ✅ | layout con `<Outlet/>` |
| `/admin` (index) | `<ResumenPage />` | ✅ | |
| `/admin/servicios` | `<ServiciosAdmin />` | ✅ | |
| `/admin/productos` | `<ProductosAdmin />` | ✅ | |
| `/admin/barberos` | `<BarberosAdmin />` | ✅ | |
| `/admin/citas` | `<CitasAdmin />` | ✅ | |
| `/` | inline: `<Navbar /><Hero /><Servicios />` dentro de `bg-neutral-950 min-h-screen` | — | no usa `Navbar` la ruta `/agendar` |
| `/agendar` | `<BookingPage />` | — | página completa, sin navbar |

No hay ruta `*` (404) ni catch-all. No hay redirección de la raíz a otra parte.

### `ProtectedRoute` (`src/components/ProtejerRuta.jsx`, 11 líneas)

```jsx
const { session, cargando } = useAuth()
if (cargando) return <p className="text-white p-8">Cargando...</p>
if (!session) return <Navigate to="/login" replace />
return children
```

- El **nombre del archivo tiene un typo** (`ProtejerRuta.jsx`, no `ProtectedRoute.jsx`).
  Se importa como `import ProtectedRoute from './components/ProtejerRuta'`. **No lo
  renombres** sin actualizar el import en `App.jsx`.
- **No hay verificación de rol ni whitelist de usuarios.** Cualquier cuenta
  autenticada en Supabase entra al panel completo. Si añades roles, hazlo aquí.

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

### 6.2 `src/context/AuthContext.jsx` (38 líneas, íntegro)

Expone `{ session, cargando, login, logout }` y un hook `useAuth()`.

- Al montar: `supabase.auth.getSession()` → setea `session` y `cargando = false`.
- Se suscribe con `supabase.auth.onAuthStateChange(...)` y limpia con
  `listener.subscription.unsubscribe()` en el cleanup del `useEffect`.
- `login(email, password)` → `supabase.auth.signInWithPassword` (devuelve el
  `{ error }` de supabase, **no** lanza).
- `logout()` → `supabase.auth.signOut()`.

`AuthProvider` está montado en `main.jsx`, **fuera** de `App`. Moverlo dentro de `App`
o de `BrowserRouter` rompe el guard de rutas.

### 6.3 `src/pages/LoginPage.jsx` (55 líneas)

Formulario controlado de email + password. `handleSubmit` previene el default, pone
`cargando`, llama a `login`, y si hay `error` muestra el texto fijo
**"Correo o contraseña incorrectos."** (no distingue el error real); si no,
`navigate('/admin')`. El botón se deshabilita con `disabled:opacity-50` y el texto pasa
a `'Entrando...'`.

### 6.4 `src/components/` — sitio público

- **`Navbar.jsx`** — logo "K" + "Nombre Barberia" / "Cortes de Cabello y Barba"; links
  `Inicio / Servicios / Productos / Contacto` que son **`href="#"` placeholders**
  (no navegan a ninguna sección); teléfono `+00 00000000`; botón `AGENDAR CITA` →
  `navigate('/agendar')`. Los links se ocultan con `hidden md:flex`, el teléfono con
  `hidden lg:block`. **No hay menú hamburguesa.**
- **`Hero.jsx`** — dos columnas (`md:grid-cols-2`): texto con `navigate('/agendar')` en
  el CTA, y `/barber.jpg` en un contenedor `relative rounded-2xl overflow-hidden` con
  marca de agua y barra inferior (`absolute ... bg-black/70 backdrop-blur-sm`).
- **`Servicios.jsx`** — array `servicios` hardcodeado de 4 objetos
  (`numero, categoria, badge, titulo, descripcion, duracion, tarifa, destacado`),
  grid `md:grid-cols-4`. Al hacer click navega a
  `` `/agendar?servicio=${encodeURIComponent(s.titulo)}` `` — **pero ese query param
  no lo lee nadie** (ver §8, trampa 3). Link inferior `VER TODOS LOS SERVICIOS →`
  también es `href="#"`.

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

`/agendar` → `BookingPage`. Un solo componente de 362 líneas con un wizard de 3 pasos
controlado por `pasoActual` (`1 | 2 | 3`) y un sidebar de resumen pegajoso.

### Constantes de módulo (hardcodeadas, líneas 6–34)

```js
const PASOS = ['Servicio', 'Fecha & Hora', 'Tus Datos']
const servicios = [ { nombre: 'Corte', descripcion: '...', precio: 680 },
                    { nombre: 'Definicion de Barba', descripcion: '...', precio: 540 } ]
const dias = [ {label:'LUN',numero:21,disponible:true}, ... 22,23,24,25,26,
               {label:'DOM',numero:27,disponible:false} ]        // 7 días
const bloques = [ { titulo: 'Mañana (10:00 – 13:00)', horas: [...] },
                  { titulo: 'Tarde (...)', horas: [...] },
                  { titulo: 'Noche (18:30 – 20:00)', horas: ['18:30 PM'] } ]
```

**El wizard NO consulta Supabase para los servicios, ni los días, ni las horas.**
Todo sale de estas constantes. La tabla `servicios` de Supabase no se usa aquí.

### Estado del componente

```js
fechaElegida, horaElegida, pasoActual, servicioElegido, addon,
form = { nombre:'', telefono:'', correo:'', notas:'' }, estadoEnvio
const total = (servicioElegido?.precio || 0) + (addon ? 250 : 0)
```

### Paso a paso

1. **Paso 1 — Servicio.** Grid `sm:grid-cols-2` de tarjetas-botón. Seleccionar fija
   `servicioElegido`; el botón "Siguiente →" está `disabled={!servicioElegido}`.
2. **Paso 2 — Fecha & Hora.** Grid `grid-cols-7` de días (los no disponibles con
   `disabled={!d.disponible}` y `disabled:opacity-30`), y los bloques de hora como
   chips `flex flex-wrap gap-3`. Botones "← Atrás" (a paso 1) y "Siguiente →"
   `disabled={!fechaElegida || !horaElegida}`.
3. **Paso 3 — Tus Datos.** Formulario en `grid sm:grid-cols-2`: nombre*,
   teléfono (WhatsApp)*, correo* (`sm:col-span-2`), notas (`textarea`, opcional).
   Solo tiene "← Atrás".

El **stepper** superior (círculos + líneas `w-8 h-px`) se genera con `PASOS.map()`,
completado = `numero < pasoActual`.

### Envío — `handleConfirmar()` (líneas 53–74)

```js
setEstadoEnvio('enviando')
const { error } = await supabase.from('citas').insert([{
  nombre, telefono, correo, notas,
  servicio: servicioElegido.nombre,          // TEXTO, no FK
  fecha: `2026-09-${fechaElegida.numero}`,   // ← mes/año fijos
  hora: horaElegida, addon, total,
}])
if (error) { console.error(error); setEstadoEnvio('error') }
else        { setEstadoEnvio('exito') }
```

- El botón "CONFIRMAR RESERVACIÓN →" vive en el **sidebar de resumen**, no en el paso 3,
  y se habilita solo si hay servicio + fecha + hora + nombre + telefono + correo.
- `estadoEnvio === 'exito'` hace **early return** de una pantalla de confirmación con
  `<Link to="/">Volver al inicio</Link>`.
- `estadoEnvio === 'error'` muestra "Algo salió mal, intenta de nuevo." bajo el botón.
- La UI declara "No se cobra nada en línea. Pago directo en sucursal." y "Te
  contactaremos por WhatsApp" — no hay pasarela de pago ni envío real de WhatsApp.

### Trampas verificadas en este flujo (no las "arregles" sin avisar)

1. **La fecha está fijada a septiembre de 2026.** Línea 62, con el comentario del propio
   autor: `// ajusta el formato/mes según tu calendario real`. `dias` son 21–27 fijos y
   el encabezado dice "Septiembre 2026". Cambiar el calendario es una feature, no un fix.
2. **`setAddon` se declara pero nunca se llama.** `addon` es siempre `false`; no existe
   UI para activarlo, aunque `total` suma `250` si lo estuviera y `CitasAdmin` muestra
   "Con add-on de vapor ozono" cuando `cita.addon` es true. Está a medio implementar.
3. **`Servicios.jsx` pasa `?servicio=` y `BookingPage` no lo lee.** No hay
   `useSearchParams` en el archivo. El query param se ignora y el paso 1 arranca sin
   preseleccionar nada.
4. **Campos renderizados que no existen:** líneas 157 y 169 imprimen `s.etiqueta` y
   `s.duracion`, pero los objetos de `servicios` solo tienen
   `{ nombre, descripcion, precio }` → ambos salen vacíos.
5. El payload de `citas` que inserta el `BookingForm.jsx` muerto es **distinto**
   (`{nombre, telefono, servicio, fecha, hora}`, sin `correo`/`notas`/`addon`/`total`).
   Si resucitas ese componente, actualiza su payload primero.

---

## 9. Dashboard (`/admin`)

### 9.1 `AdminDashboard.jsx` — layout

Array `links` (constante de módulo) de 5 entradas `{ to, label, fin }`; `fin: true` en
"Resumen" mapea a `end` de `NavLink` para que no quede activo en las subrutas. Clase
dinámica con `className={({ isActive }) => ...}`. La identidad de la tienda es
`EL TALLER` en serif + `Kromatik` debajo.

Raíz: `min-h-screen bg-ink-950 lg:flex`. El `<aside>` es
`border-b border-ink-700 bg-ink-900 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64
lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r`.

**Es responsive sin JavaScript, y no lleva `useState`:**

- `lg+`: rail lateral pegajoso, nav en columna, logout al pie separado por
  `border-t border-ink-700`.
- `<lg`: barra superior con la identidad + logout (`lg:hidden`), y la nav en fila
  con `overflow-x-auto` y `whitespace-nowrap shrink-0` por ítem.
- El logout se **renderiza dos veces** (una `lg:hidden`, otra `hidden lg:block`),
  ambas llamando al mismo `logout` de `useAuth()`. Así sigue disponible en todos
  los tamaños sin necesidad de estado.
- **No hay menú hamburguesa**, por decisión de diseño (§12.3).

Indicador de ruta activa: `border-l-2 border-brass-400` + `text-bone-100`, con
`border-transparent` en el inactivo para no desplazar el layout. **No lleva fondo
de color** (antes era `bg-sky-500`).

`main`: `min-w-0 flex-1 p-4 lg:p-8` con un contenedor `mx-auto max-w-6xl` que
aloja el `<Outlet />`.

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

#### Presentación actual de las filas

Los tres comparten exactamente el mismo lenguaje visual (§11):

- Las filas viven en **un solo contenedor** con `bg-ink-900 border border-ink-700
  rounded-lg` + `divide-y divide-ink-700`. No son tarjetas aisladas con `gap` entre
  ellas: los separadores son los propios bordes del contenedor.
- Fila: `flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4
  sm:px-5 sm:py-4`. En `<sm` las acciones bajan a su propia línea (`w-full
  justify-end sm:w-auto`); desde `sm` todo queda en una línea.
- Imagen: `h-12 w-12 sm:h-14 sm:w-14 shrink-0` — `rounded-md` en Servicios y
  Productos, `rounded-full` (avatar) en Barberos.
- Nombre: `truncate font-semibold text-bone-100` en un bloque `min-w-0 flex-1`.
  El bloque de datos lleva `truncate` para no desbordar.
- Precio: `tabular-nums text-bone-400`, `shrink-0`. Ojo: el precio es un dato
  **secundario** y por eso va en `bone-400`; el nombre manda en `bone-100`.
- Acción primaria del encabezado: `bg-brass-400 text-ink-950` con
  `hover:bg-brass-300 active:bg-brass-500`. **Sin el símbolo `+`** en el texto.
- Editar: acción ghost, `text-bone-400 hover:bg-ink-800 hover:text-bone-100`.
- Eliminar: acción de texto en `text-cancelada` con `hover:bg-cancelada/10`
  (`ring-cancelada/60` en el foco). **Nada de `bg-red-500/20` relleno.**
- Título de página: `font-serif text-3xl text-bone-100 mb-8`.
- Estado vacío: bloque `bg-ink-900 border border-ink-700 rounded-lg px-5 py-10
  text-center`, texto `text-sm text-bone-600` y **una sola** acción primaria brass.
- Todos los botones llevan `focus-visible:ring-2` con anillo brass.

**Switch de disponibilidad (solo `BarberosAdmin`)**

Control real, no un texto ni un pill. Es un `<button type="button">` con
`role="switch"` y `aria-checked={b.disponible}`, y la etiqueta visible
"Disponible" / "No disponible" hace de nombre accesible.

- Pista: `relative h-4 w-7 rounded-full` → `bg-ink-800` inactivo, `bg-brass-400` activo.
- Knob: `absolute top-0.5 h-3 w-3 rounded-full` que viaja de `left-0.5`
  (`bg-bone-600`) a `left-3.5` (`bg-ink-950`), con `transition-colors` /
  `transition-all`.
- Borde exterior: `border-ink-700` inactivo, `border-brass-400/40` activo.
- `BarberoForm` reutiliza el mismo control (§9.4). Si añades un switch nuevo,
  copia este markup, no improvises otro.

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

Estructura del modal: overlay `fixed inset-0 bg-black/70 flex items-center
justify-center p-4 z-50`. El `<form>` es **idéntico en los tres**:

```
flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto
rounded-lg border border-ink-700 bg-ink-900 p-5 sm:p-6
```

**Los tres tienen `max-h-[90vh] overflow-y-auto`.** Antes solo lo tenían
`ServicioForm` y `ProductoForm`; `BarberoForm` se añadir al unificarlos. Si
añades un modal nuevo, copie ese contenedor tal cual.

Presentación común a los tres:

- Título: `font-serif text-lg text-bone-100`, con
  `esEdicion ? 'Editar x' : 'Nuevo x'`.
- **Cada campo tiene label visible** encima: `<label htmlFor="…"
  className="block text-sm text-bone-400">` + `*` en los obligatorios. Los inputs
  llevan `id` para que la asociación sea real. No dependas del placeholder para
  explicar el campo (los placeholders originales se conservan como texto de ayuda).
- Input, `textarea` y `select`: `mt-1 w-full rounded-md border border-ink-700
  bg-ink-800 px-4 py-2.5 text-sm text-bone-100 transition-colors
  placeholder:text-bone-600 focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-brass-400/60`. El `textarea` añade `resize-none`.
- Foco: **anillo brass**, nunca azul. El `outline-none` siempre va acompañado de
  su `focus-visible:ring-2`.
- Input de archivo: label "Imagen" + `<input type="file">` con el botón estilizado
  vía variantes `file:` (`file:rounded-md file:border-0 file:bg-ink-800
  file:px-3 file:py-1.5 file:text-sm file:text-bone-100 hover:file:bg-ink-700`).
- Botón **Guardar**: `flex-1 rounded-md bg-brass-400 px-5 py-2.5 text-sm
  font-semibold text-ink-950` con `hover:bg-brass-300 active:bg-brass-500` y
  `disabled:opacity-50`. Texto `{guardando ? 'Guardando...' : 'Guardar'}`.
  **Nunca `bg-white`.**
- Botón **Cancelar**: `rounded-md border border-ink-700 px-5 py-2.5 text-sm
  text-bone-400` con `hover:bg-ink-800 hover:text-bone-100`. Es secundario, no
  compite con Guardar.
- Mensaje de error: `text-sm text-cancelada` (antes `text-red-400`). El texto del
  mensaje sigue siendo el genérico de `handleSubmit`.
- En `ServicioForm`, Costo y Duración van en `grid gap-4 sm:grid-cols-2` para que
  en móvil apilen en vez de comprimirse.

**Switch "Disponible" (solo `BarberoForm`)**

Sustituye al `<input type="checkbox">` nativo. Es el **mismo control que
`BarberosAdmin`** (§9.3): `<button type="button" role="switch"
aria-checked={form.disponible} onClick={() => setForm({ …form, disponible:
!form.disponible })}>`, pista `h-4 w-7 rounded-full` (`bg-ink-800` /
`bg-brass-400`), knob `h-3 w-3 rounded-full` de `left-0.5` a `left-3.5`, y el
texto "Disponible" al lado.

La etiqueta es simplemente **"Disponible"**, no "Disponible desde que se crea": el
mismo control sirve para crear y para editar, y el texto antiguo mentía al editar.

**El valor que va a Supabase no cambió**: el campo sigue siendo `form.disponible`
(booleano) y `payload` sigue haciendo `{ ...form, imagen: urlImagen }`. Lo único
que cambió es el control visual.

### 9.5 `CitasAdmin.jsx`

Dos columnas `grid gap-6 lg:grid-cols-3`: rail en `lg:col-span-2`, panel de detalle
`h-fit rounded-lg border border-ink-700 bg-ink-900 p-5 sm:p-6 lg:sticky lg:top-8`.

- Estados (`const estados`): `['pendiente', 'confirmada', 'completada', 'cancelada']`.
  **Estos 4 valores no cambian** y `estados` no se toca. Se leen con
  `…[e] || ….pendiente` porque **`estado` es nullable en la BD** (las citas nuevas
  se insertan sin `estado`).
- Mapa `colorEstado` (nodo del rail) + `textEstado` (etiqueta) + `puntoEstado`
  (punto). Los tres leen con fallback a `pendiente`.
- Estados vacíos: `'Cargando...'` (`text-bone-400`), `'Aún no hay citas
  agendadas.'` y en el panel `'Selecciona una cita para ver su información.'`
  (`text-sm text-bone-600`).
- `cambiarEstado(nuevoEstado)`: **optimistic update** en las dos listas
  (`setCitaSeleccionada({...})` y `setCitas(citas.map(...))`) y luego
  `update({ estado }).eq('id', citaSeleccionada.id)`.
- El panel muestra teléfono, correo (si existe), servicio, fecha, hora, add-on
  (si `addon`), total (si `total`) y notas (si hay). **No hay fila de barbero**:
  la tabla `citas` no tiene ese campo y no se añadió ninguno.

#### Estructura del rail

```
<ol>  →  <li>  →  <button onClick={() => setCitaSeleccionada(c)}>
```

Lista **semántica**: `<ol>` → `<li>` → `<button>`. Antes era una lista plana de
`<button>` sueltos sin `<li>`. El botón conserva la misma interacción: el click
sigue fijando `citaSeleccionada`. Es una mejora semántica de la estructura visual,
**no** un cambio de lógica.

Dentro de cada `<li>`, el orden en el DOM es `<button>` y **después** los
elementos decorativos (`hairline`, línea del rail, nodo), para que pinten por
encima del `hover:bg-ink-800` del botón.

- Contenedor: `rounded-lg border border-ink-700 bg-ink-900 p-4 sm:p-5`.
- Línea del rail: `absolute -bottom-1 left-3 top-7 w-px bg-ink-700`, un `<span>`
  real, y **no se renderiza en la última cita** (`const esUltima = i === citas.length - 1`).
- Nodo: `absolute h-2.5 w-2.5 rounded-full border` en reposo, `h-4 w-4` al
  seleccionarse, manteniéndose **centrado sobre la línea** (`left-[7px]`/`top-2` en
  reposo, `left-1`/`top-[5px]` seleccionado).
- El estado se lee **por forma y color del nodo**, no por pills:
  `pendiente` hueco con `border-brass-400` sobre `bg-ink-950`; `confirmada` relleno
  `bg-confirmada`; `completada` relleno `bg-completada`; `cancelada` relleno
  `bg-cancelada`.
- Transición: `transition-[left,top,width,height,background-color,border-color]
  duration-200 motion-reduce:transition-none`. Es la **única animación** de la
  página. Sin pulso, sin rebote, sin glow, sin sombras.
- Hora: `w-12 sm:w-16 shrink-0 font-serif text-lg tabular-nums text-bone-400` —
  columna de ancho fijo para que las horas alineen.
- Nombre: `truncate font-semibold text-bone-100`; si `cancelada`, se muestra
  `text-bone-600 line-through`.
- Fecha + estado: `shrink-0 text-right`, con un punto de estado
  (`h-1.5 w-1.5 rounded-full`) + etiqueta `text-xs capitalize`. **Sin pill grande.**

#### Cita seleccionada

- Hairline brass de 2px pegado al borde izquierdo:
  `absolute bottom-0 left-0 top-0 w-0.5 rounded-full bg-brass-400`, con
  `transition-opacity duration-200` entre opaco y `opacity-0`.
- El nodo crece de 10px a 16px. **Nada de borde de color alrededor de la tarjeta.**
- `aria-current` en el botón seleccionado.

#### Panel de detalle: filas de definición

Un `<dl>` con `sm:grid-cols-[6.5rem_minmax(0,1fr)]`: etiqueta en columna fija
`text-sm text-bone-600`, valor `text-sm text-bone-100` alineado a la derecha,
filas separadas por `border-b border-ink-700`. La ficha se construye con un array
`ficha` (view-model) que replica 1:1 las condicionales del JSX original; el
`.filter(Boolean)` descarta las filas cuyos campos no existen.

- **Notas** es la excepción: `ancho: true` la renderiza a ancho completo y
  alineada a la izquierda, porque es texto largo y no tiene sentido a la derecha.
- El encabezado lleva el nombre en `font-serif text-xl text-bone-100` y debajo el
  punto + etiqueta de estado (mismo lenguaje que el rail, no un badge).

#### Botones de estado

`flex flex-wrap gap-2` sobre `estados.map(...)`, sin cambiar el array:

- Activo (`citaSeleccionada.estado === e`):
  `border-brass-400 bg-brass-400 font-semibold text-ink-950` + `aria-pressed`.
- Inactivo: `border-ink-700 bg-ink-800 text-bone-400` con
  `hover:border-bone-600 hover:text-bone-100`.
- **Nunca `bg-white`** — antes el estado activo usaba el mismo blanco que el CTA
  "agregar", y eso los confundía.

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

**No hay migraciones, ni SQL, ni carpeta `supabase/` en el repo.** El esquema solo se
puede inferir del uso en el código. Lo que se ve en las consultas:

| Tabla | Columnas usadas | Evidencia |
|---|---|---|
| `citas` | `id`, `nombre`, `telefono`, `correo`, `notas`, `servicio`, `fecha`, `hora`, `addon`, `total`, `estado` | `BookingPage` inserta todos salvo `id`/`estado`; `CitasAdmin` lee `estado`, `addon`, `total`, `notas`, `correo` |
| `servicios` | `id`, `nombre`, `categoria`, `descripcion`, `costo`, `duracion`, `imagen`, `created_at` | `ServicioForm` escribe `{nombre, categoria, descripcion, costo:Number, imagen}`; los tres ordenan por `created_at` |
| `productos` | `id`, `nombre`, `categoria`, `descripcion`, `precio`, `imagen`, `created_at` | `ProductoForm` escribe `{nombre, categoria, descripcion, precio:Number, imagen}` |
| `barberos` | `id`, `nombre`, `especialidad`, `disponible`, `imagen`, `created_at` | `BarberoForm` escribe `{nombre, especialidad, disponible, imagen}`; `ResumenPage` filtra `.eq('disponible', true)` |

⚠ **Inconsistencia real a respetar:** `servicios` usa la columna **`costo`** y
`productos` usa **`precio`**. La UI lo normaliza a `$X MXN` al mostrar. No unifiques
una sin cambiar la otra y las consultas.

⚠ `citas.servicio` almacena el **nombre del servicio como texto**, no un id ni una FK.
Por eso el wizard puede mandar nombres que no existen en la tabla `servicios`. Igual
`citas.fecha` es un **string** (no `timestamptz`) y se compara lexicográficamente en
`ResumenPage` — de ahí el formato `YYYY-MM-DD` en `BookingPage`.

`barberos.disponible` es booleano, default `true` (`barbero?.disponible ?? true`).

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

Solo **email + password** (`signInWithPassword`). No hay OAuth, magic link, ni
`signUp`. La sesión se persiste automáticamente por supabase-js (localStorage) y se
recupera con `getSession()` al montar. El primer usuario administrador se crea fuera de
la app (dashboard de Supabase).

---

## 11. Reglas de UI/UX

**El proyecto tiene DOS sistemas visuales, y es intencional.** No los unifiques sin
que el usuario lo pida:

| Zona | Sistema | Tokens |
|---|---|---|
| **Dashboard `/admin`** (8 archivos en `src/pages/admin/`) | Sistema actual, rediseñado | `ink-*` / `bone-*` / `brass-*` |
| **Sitio público** (`/`, `/agendar`, `/login`) | Sistema anterior, **sin tocar** | `neutral-*` / `sky-500` / `emerald` / `amber` / `yellow` |

El rediseño del admin **no** tocó el sitio público. Esa es una costura conocida y
documentada: `/` y `/admin` ya no se ven como hermanos, y `LoginPage` comparte
inputs con el admin pero conserva el tema viejo. Decidir si se alinea es un task
futuro, no un fix.

### 11.1 Tokens del dashboard

Definidos en el bloque `@theme` de `src/index.css`. **No existe
`tailwind.config.js` y no debe crearse**; no se hardcodeen hex en los componentes,
usa el token.

**Superficies** (negro cálido: tungsteno / latón / cuero)

| Token | Hex | Uso |
|---|---|---|
| `ink-950` | `#0E0C0A` | fondo de la app |
| `ink-900` | `#16130F` | cards, paneles, rail, sidebar, superficies del modal |
| `ink-800` | `#211C17` | inputs, elementos elevados, hover |
| `ink-700` | `#2E2820` | bordes y separadores |

**Texto** (hueso)

| Token | Hex | Uso |
|---|---|---|
| `bone-100` | `#F5F1E8` | texto principal |
| `bone-400` | `#A8A093` | texto secundario |
| `bone-600` | `#6E675C` | texto terciario, placeholders, labels |

**Acento brass** — un solo hue interactivo = "esto se puede tocar"

| Token | Hex | Uso |
|---|---|---|
| `brass-300` | `#E3C14E` | hover de la acción primaria |
| `brass-400` | `#C9A227` | base: acción primaria, indicador activo, foco |
| `brass-500` | `#A8851B` | pressed / active |

**Estados de cita** — escala propia, independiente del fondo

| Estado | Token | Hex | Lectura |
|---|---|---|---|
| pendiente | `brass-400` (no tiene token propio) | `#C9A227` | nodo **hueco** con borde brass |
| confirmada | `confirmada` | `#6E9BB8` | nodo relleno |
| completada | `completada` | `#7FA37A` | nodo relleno |
| cancelada | `cancelada` | `#B5645A` | nodo relleno, contenido atenuado |

⚠ `cancelada` está **semánticamente sobrecargado**: representa el estado
"cancelada" de una cita **y** las acciones destructivas ("Eliminar", mensajes de
error). Es un problema conocido y **pendiente** de separar en un token de peligro
(§18). No lo "arregles" por tu cuenta.

**Nota sobre Tailwind v4:** las variables del `@theme` se emiten **bajo demanda**,
solo si alguna clase las usa. Es normal que un token definido no aparezca en el CSS
compilado hasta que se use.

### 11.2 Tipografía

- **UI / body / navegación / labels:** pila `sans` del sistema, sin cambios.
- **Display:** pila serif del sistema,
  `ui-serif, Georgia, Cambria, "Times New Roman", serif` (token `--font-serif`).
  **Sin fuentes externas, sin CDN, sin descargas.**
- Dónde va serif: títulos de página del admin (`font-serif text-3xl`), títulos de
  panel y de modal (`text-xl` / `text-lg`), cifras de las tarjetas de `ResumenPage`
  (`text-3xl`) y la hora en el rail de `CitasAdmin` (`text-lg`).
- **Cifras y horas: `tabular-nums` siempre.** Sin esto las columnas tiemblan.
- Escala en el admin: `text-xs` / `text-sm` / `text-lg` / `text-xl` / `text-3xl`.
  El salto de UI a display es deliberado.

### 11.3 Recetas del dashboard

- **Acción primaria**: `bg-brass-400 text-ink-950 font-semibold` con
  `hover:bg-brass-300 active:bg-brass-500 disabled:opacity-50`. Botones de admin
  en minúscula y **sin símbolo `+`**. Nunca `bg-white`.
- **Acción ghost / texto**: `text-bone-400 hover:bg-ink-800 hover:text-bone-100`
  (Editar, Cancelar, logout).
- **Acción destructiva**: `text-cancelada` con `hover:bg-cancelada/10`. Nunca
  pill relleno.
- **Superficie**: `bg-ink-900 border border-ink-700 rounded-lg`. Nótese que el
  admin **ya no usa `rounded-xl`**, ni superficies como el kit de tarjetas SaaS.
- **Inputs**: `bg-ink-800 border-ink-700 text-bone-100 placeholder:text-bone-600`,
  con label visible `text-sm text-bone-400` encima.
- **Foco**: `focus-visible:ring-2 focus-visible:ring-brass-400/60` (o
  `ring-cancelada/60` en destructivas). **El `outline-none` nunca va solo** — un
  anillo brass lo acompaña siempre. Ese fue un bug real del sistema anterior
  (11 inputs sin foco visible por teclado).
- **Indicador de ruta activa**: `border-l-2 border-brass-400` + `text-bone-100`,
  con `border-transparent` en el inactivo para no desplazar el layout.
  **Nunca un fondo brass relleno.**
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
- **Sin sombras fuertes.** Si necesitas separación, usa `border-ink-700`.
- **Sin pills grandes de color.** El estado se comunica con nodo/punto + etiqueta.
- **Sin animaciones innecesarias.** La **única** transición del admin es la del
  nodo del rail de `CitasAdmin` (`duration-200` + `motion-reduce:transition-none`).
  Nada de pulso, rebote, entradas animadas ni hover en cada tarjeta.
- **Sin iconos decorativos.** El estado se marca con puntos de estado, no con SVG.
- **Sin sombras como sistema de jerarquía**: la jerarquía se construye con
  `ink-*` (superficie), `bone-*` (peso textual) y `font-serif` (display).

### 11.5 Reglas que siguen vigentes para todo el proyecto

- **Idioma de la UI: español.** No lo traduzcas.
- Dark only. **No hay light mode ni theme switcher, en ninguna zona.**
- Textos `Lorem ipsum` y datos de ejemplo son placeholders, no contenido final.
- El sitio público conserva su sistema visual anterior. No lo "normalices" al
  nuevo sin que el usuario lo pida (§17).

### 11.6 Accesibilidad (estado actual, no ideal)

**Resuelto en el rediseño del admin:**
- Foco visible por teclado en botones, enlaces de nav e inputs del admin (anillo brass).
- Todos los inputs de los tres Forms tienen `<label htmlFor>` + `id` reales.
- Los dos switches (en `BarberosAdmin` y `BarberoForm`) tienen `role="switch"` +
  `aria-checked`.
- Los botones de estado de `CitasAdmin` llevan `aria-pressed`; el de la cita
  seleccionada lleva `aria-current`.
- Las listas de citas usan `<ol>`/`<li>`/`<button>` semánticos.

**Pendiente (no lo escales sin consultarlo, pero no lo empeores):**
- El `<img>` de preview de los tres modales sigue **sin `alt`**.
- Sin `aria-live` en los mensajes de error ni en los estados de carga.
- La navegación de la landing son `<a href="#">`, sin `aria-current`.
- El sitio público no tiene labels asociados en sus inputs.
- `setAddon` en `BookingPage` sigue declarado y sin usar (§18).

---

## 12. Responsive design

**El admin y el sitio público tienen su propio layout responsive**, ya que tienen
sistemas visuales separados (§11). El rediseño del admin **no modificó el sitio
público**: los patrones de abajo marcan qué zona usa cada patrón.

Sin `tailwind.config.js`: los breakpoints son los **defaults de Tailwind v4**
(`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px). No hay container queries ni
valores personalizados. No hay light mode ni theme switcher, y no se han añadido
librerías visuales ni de UI: el layout es Tailwind inline y nada más.

### 12.1 Dashboard `/admin` (sistema actual)

| Patrón | Dónde |
|---|---|
| `min-h-screen bg-ink-950 lg:flex` | raíz del shell en `AdminDashboard` |
| `lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0` | rail lateral en desktop |
| `border-b … lg:border-b-0 lg:border-r` | el `<aside>` es barra superior en `<lg` y rail en `lg+` |
| `flex gap-1 overflow-x-auto … lg:flex-col lg:overflow-visible` | nav en fila con scroll horizontal en móvil, columna en `lg+` |
| `lg:hidden` / `hidden lg:block` | logout: versión móvil en la barra superior, versión desktop al pie del rail |
| `min-w-0 flex-1 p-4 lg:p-8` + `mx-auto max-w-6xl` | `main` y su contenedor de ancho máximo |
| `grid gap-6 lg:grid-cols-3` + `lg:col-span-2` | `CitasAdmin` (rail + panel) |
| `sm:grid-cols-[6.5rem_minmax(0,1fr)]` | filas de definición del panel de detalle |
| `grid-cols-2 sm:grid-cols-4` | tarjetas de `ResumenPage` |
| `flex flex-wrap … sm:flex-nowrap` + `w-full justify-end sm:w-auto` | filas de los CRUD: las acciones bajan de línea en móvil |
| `truncate` + `min-w-0 flex-1` + `shrink-0` en el bloque de precio/fecha | antioverflow horizontal en listas |
| `h-fit lg:sticky lg:top-8` | panel de detalle de `CitasAdmin` |
| `w-12 sm:w-16` | columna de hora en el rail, ancho fijo para alinear |
| `max-h-[90vh] overflow-y-auto` + `w-full max-w-md` | los tres modales |
| `p-5 sm:p-6`, `gap-3 sm:gap-4`, `px-4 sm:px-5`, `h-12 sm:h-14` | padding y tamaño escalonados en todo el admin |
| `grid gap-4 sm:grid-cols-2` | Costo/Duración en `ServicioForm` |

El shell del admin **sí es responsive** (antes el `<aside className="w-64">` era fijo
y el admin era inutilizable en móvil — eso quedó resuelto).

### 12.2 Sitio público (sin cambios)

| Patrón | Dónde |
|---|---|
| `px-8 py-16` + `max-w-7xl mx-auto` | contenedores y secciones públicas |
| `grid md:grid-cols-2 gap-12` | `Hero` (texto + imagen) |
| `grid md:grid-cols-2 gap-8` | encabezado de sección de `Servicios` / `Productos` |
| `grid md:grid-cols-4 gap-4` | grid de tarjetas de la landing |
| `grid lg:grid-cols-3 gap-8` + `lg:col-span-2` | `BookingPage` |
| `grid sm:grid-cols-2 gap-4` | selector de servicio, datos del cliente en el wizard |
| `grid grid-cols-7 gap-2` | strip de días del wizard |
| `hidden md:flex` | links del `Navbar` |
| `hidden lg:block` | teléfono del `Navbar` |
| `lg:sticky lg:top-8 h-fit` | sidebar de resumen del wizard |
| `flex flex-wrap gap-3` | chips de hora del wizard |
| `px-4` | `LoginPage` y contenedores centrados pequeños |

Gaps y paddings en uso: `gap-2/3/4/6/8/10/12`, `p-4/p-5/p-6/p-8`, `mb-2/4/6/8/10`,
`px-4/5/6/8`.

### 12.3 Puntos débiles preexistentes (no los arregles sin avisar)

- `Navbar`: los links desaparecen bajo `md` y **no hay menú alternativo**; el
  teléfono desaparece bajo `lg`. **No hay hamburguesa, por decisión de diseño.**
- `BookingPage`: los `dias` son una tira fija de 7 columnas sin scroll.
- `App.css` (muerto) sí tenía sus propios `@media (max-width: 1024px)`, pero no se
  aplica.
- `AdminDashboard` no lleva `useState`: el paso de barra superior a rail lateral es
  **solo CSS** (`lg:`). No introduzcas un menú hamburguesa para "mejorarlo"; sería
  añadir estado y JS a un shell que ya funciona sin ellos.

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

**B. Escrituras en formularios — `try/catch` + mensaje genérico.**
Los tres `*Form` usan el bloque `try { … if (error) throw error; onGuardado() } catch
{ console.error; setErrorMsg('Algo salió mal, intenta de nuevo.'); setGuardando(false) }`.
El mensaje es **siempre el mismo**, nunca se muestra el error real de Supabase al
usuario. Ojo: en el `catch` se forgetea `guardando`; en éxito el componente se
desmonta (lo llama `onGuardado` → `setMostrarForm(false)`).

**C. Wizard y login — `if (error)` + estado de pantalla.**
`BookingPage` / `BookingForm` / `LoginPage` revisan el `error` y setean
`estadoEnvio`/`error` local; el texto al usuario es fijo.

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
pnpm lint        # DEBE seguir fallando con EXACTAMENTE los mismos 7 errores (§15.1)
pnpm build       # DEBE terminar sin errores
pnpm dev         # smoke test manual en el navegador
```

### 15.1 Línea base de lint (preexistente, medida)

`pnpm lint` **falla en el estado actual del repo** con:

```
✖ 7 problems (7 errors, 0 warnings)
```

**Desglose exacto por archivo y regla:**

1. `src/context/AuthContext.jsx`
   * regla: `react-refresh/only-export-components`
   * 1 error (el archivo exporta `AuthProvider` y `useAuth`)
2. `src/pages/BookingPage.jsx`
   * regla: `no-unused-vars`
   * 1 error (`setAddon` declarado y nunca llamado, §18)
3. `src/pages/admin/BarberosAdmin.jsx`
   * regla: `react-hooks/immutability`
   * 1 error (`cargarBarberos` accessed before it is declared)
4. `src/pages/admin/CitasAdmin.jsx`
   * regla: `react-hooks/immutability`
   * 1 error (`cargarCitas` accessed before it is declared)
5. `src/pages/admin/ProductosAdmin.jsx`
   * regla: `react-hooks/immutability`
   * 1 error (`cargarProductos` accessed before it is declared)
6. `src/pages/admin/ResumenPage.jsx`
   * regla: `react-hooks/immutability`
   * 1 error (`cargarDatos` accessed before it is declared)
7. `src/pages/admin/ServiciosAdmin.jsx`
   * regla: `react-hooks/immutability`
   * 1 error (`cargarServicios` accessed before it is declared)

Totales:

| Regla | Cantidad |
|---|---|
| `react-hooks/immutability` | 5 |
| `react-refresh/only-export-components` | 1 |
| `no-unused-vars` | 1 |
| **Total** | **7 errores, 0 warnings** |

Los 5 de `react-hooks/immutability` comparten el mismo mensaje,
*"Cannot access variable before it is declared"*: el patrón
`useEffect(() => { cargarX() }, [])` invoca una función declarada después con
`const`. Por eso **`src/pages/admin/AdminDashboard.jsx` y los tres `*Form` tienen
0 errores** y no aparecen en la lista.

**Estos errores son baseline preexistente. NO deben corregirse como parte del
rediseño visual ni de ningún trabajo no solicitado.** Reglas:

- No los "arregles" de paso mientras haces otra cosa: mezclar un fix no solicitado
  con tu cambio vuelve el diff imposible de revisar.
- **No subas el número.** Si tu cambio añade un error, el total será > 7 y eso es
  **un fallo tuyo**. El desglose por archivo de arriba es la referencia.
- Si te piden arreglarlos, es un task aparte: mueve la función **arriba** del
  `useEffect` o conviértela en `function` declaration / `useCallback`.

**Verificado durante el rediseño visual del admin (5 etapas).** En cada etapa se
ejecutó `pnpm lint` después de los cambios y el resultado se mantuvo **exactamente
en estos 7 errores, mismos archivos, mismas reglas, 0 errores nuevos**:

| Etapa | Archivo tocado | Lint |
|---|---|---|
| 1 | `src/index.css`, `src/pages/admin/AdminDashboard.jsx` | 7 / 0 nuevos |
| 2 | `src/index.css`, `src/pages/admin/ResumenPage.jsx` | 7 / 0 nuevos |
| 3 | `ServiciosAdmin.jsx`, `ProductosAdmin.jsx`, `BarberosAdmin.jsx` | 7 / 0 nuevos |
| 4 | `src/pages/admin/CitasAdmin.jsx` | 7 / 0 nuevos |
| 5 | `ServicioForm.jsx`, `ProductoForm.jsx`, `BarberoForm.jsx` | 7 / 0 nuevos |

`pnpm build` terminó correctamente en las 5 etapas, sin errores de compilación de
clases Tailwind.

### 15.2 Checklist manual por área

Probado en Chrome DevTools. La app necesita `.env` con las dos variables válidas y
**conectividad a Supabase** — sin red los listados del admin salen vacíos.

- **`/`** — carga el hero con `/barber.jpg`; click en una tarjeta de `Servicios`
  navega a `/agendar?servicio=...`; el query param **no** preselecciona nada
  (esperado, ver §8).
- **`/agendar`** — los 3 pasos avanzan y retroceden; "Siguiente" permanece `disabled` sin
  selección; la hora se elige; el sidebar refleja servicio/fecha/total; el total **no**
  incluye los 250 del add-on (porque `addon` es siempre `false`); al confirmar aparece
  la pantalla de "¡Reservación confirmada!" y **se inserta una fila en la tabla
  `citas`** (verifícalo en el dashboard de Supabase).
- **`/login`** — credenciales malas → "Correo o contraseña incorrectos."; buenas →
  redirige a `/admin`.
- **`/admin` sin sesión** — redirige a `/login`.
- **`/admin`** — los 4 contadores coinciden con Supabase; "Citas de esta semana" filtra
  bien; el item activo del sidebar es correcto también en las subrutas.
- **CRUD de cada entidad** — crear (con y sin imagen), editar (comprobando que **subir
  imagen nueva sustituye la URL** y que no subirla **la conserva**), eliminar (aparece
  el `confirm`), y que la lista se recargue.
- **`/admin/citas`** — seleccionar una cita abre el detalle; los 4 botones de estado
  cambian el color del badge y persisten tras recargar; una cita **sin `estado`** (las
  nuevas) se muestra como `pendiente`.
- **Logout** — cierra sesión y `/admin` vuelve a pedir login.
- **Responsive** — reduce a 375px y 768px: la landing y `/agendar` se adaptan; el admin
  **no** (esperado, ver §12).
- **Errores** — con Supabase caído, los listados del admin muestran el estado vacío, no
  un mensaje de error (esperado, ver §13.A).

### 15.3 Estado de git (importante)

El repo tiene **un solo commit** (`0a75600 Proyecto - Barberia (Inicio y Reservas de Citas)`)
y **trabajo sin commitear**: el panel de administración completo y **toda la
autenticación** (`src/context/`, `src/pages/admin/`, `src/pages/LoginPage.jsx`,
`src/components/ProtejerRuta.jsx`) existen **solo en el working tree**, no en el
historial. `App.jsx`, `BookingPage.jsx`, `BookingForm.jsx` y `main.jsx` tienen cambios
locales sin commitear.

**Consecuencia: no hagas `git checkout`, `git restore`, `git reset` ni `git stash`
sobre estos archivos** — perderías el panel de admin y la auth. Antes de cualquier
operación destructiva de git, pregunta.

---

## 16. Archivos sensibles

| Archivo | Por qué |
|---|---|
| `.env` | Credenciales de Supabase. Gitignored. **Nunca commitear, nunca imprimir en una respuesta, nunca subir.** |
| `src/supabaseClient.js` | Único punto de conexión. Un typo en el nombre de la env var rompe **toda** la app silenciosamente. |
| `src/context/AuthContext.jsx` | Sesión y `onAuthStateChange`. El cleanup incorrecto deja listeners duplicados. |
| `src/components/ProtejerRuta.jsx` | Único guard de rutas. Romperlo deja el admin abierto o inaccesible. |
| `src/main.jsx` | Orden de los providers (`BrowserRouter` > `AuthProvider`). |
| `src/App.jsx` | Tabla de rutas. Único lugar donde se registran las páginas. |
| `package.json` / `pnpm-lock.yaml` | No los edites para "subir una dependencia menor". |
| `public/barber.jpg` | 2.2 MB, referenciado por ruta absoluta `/barber.jpg` en `Hero.jsx`. Si lo mueves o renuevas, actualiza el `src`. |
| `src/pages/BookingPage.jsx` | El archivo más grande y el más frágil del flujo de citas (§8). |
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
  `productos`, `barberos`).
- **No unifiques `servicios.costo` y `productos.precio`** sin migrar también las
  consultas, los formularios y la UI.
- **No cambies el bucket `imagenes`** ni las carpetas `servicios/`, `productos/`,
  `barberos/`. No lo hagas privado sin migrar las URLs ya guardadas.
- **No introduzcas RLS, políticas, vistas, funciones SQL ni triggers** sin autorización
  explícita. **Este proyecto hoy no usa RLS y depende de ello**: el sitio público
  inserta en `citas` con la clave publicable desde el navegador. Añadir RLS sin planear
  los roles `anon` romperá el agendamiento público.
- **No metas claves de servicio (`service_role`) en el frontend.** Todo es
  cliente-side por diseño.
- **No cambies el payload de `citas`** sin actualizar a la vez `CitasAdmin` (que lee
  `correo`, `notas`, `addon`, `total`, `estado`) y su panel de detalle.

**Arquitectura y routing**
- **No muevas `AuthProvider`** fuera de `main.jsx` ni lo bajes dentro de `App`.
- **No elimines `ProtectedRoute`** de la ruta `/admin` ni su redirect.
- **No renombres `src/components/ProtejerRuta.jsx`** sin actualizar el import en
  `App.jsx`.
- **No introduzcas `createBrowserRouter` / loaders / actions.** El router es
  `<Routes>` plano; los datos se cargan en `useEffect`.
- **No crees un store de datos "compartido"** para deduplicar los `cargarX()`: cada
  página es dueña de sus datos. Es redundante a propósito y así funciona.
- **No conviertas el wizard de 3 pasos** en otra cosa (un formulario único, un modal,
  multi-página). El `pasoActual` + sidebar pegajoso es el diseño acordado.

**UI/UX — aplica al dashboard `/admin`; el sitio público tiene su propio sistema**

Estas reglas son **específicas del admin**. El sitio público (`/`, `/agendar`,
`LoginPage`, `Navbar`, `Hero`, `Servicios`, `Productos`) conserva su lenguaje
anterior (`neutral-*`, `sky-500`, `emerald`, `amber`, `yellow`) y **no se
"normalizó" al nuevo**: esa costura es conocida y solo se cierra si el usuario lo
pide.

- **El dashboard usa `ink-*` / `bone-*` / `brass-*`** (§11.1). `brass` es el único
  acento interactivo del admin: acción primaria, indicador de ruta activa y foco.
- **No reintroduzcas `sky`, `emerald` ni `amber` como acentos del admin.** Ya no
  tienen ningún uso dentro de `src/pages/admin/`. Si los ves ahí, es un bug.
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
- **No añadas un menú hamburguesa, un sistema de toasts, skeletons o un error
  boundary** "de paso". Son features, no arreglos. El shell del admin ya resuelve
  móvil con CSS (`lg:`) y **no lleva `useState` a propósito**; no lo "mejores" con
  estado.
- **No elimines los placeholders** (`"Nombre Barberia"`, `"Nombre"`, `"+00 00000000"`,
  `Lorem ipsum`, `"Kromatik Admin"`) sin que el usuario los pida: son marcadores
  pendientes de sustituir por los datos reales del negocio.
- No introduzcas más animación en el admin. La única transición permitida es la del
  nodo del rail de `CitasAdmin` (`duration-200` + `motion-reduce:transition-none`).

**Higiene**
- **No borres los archivos de código muerto** (`Productos.jsx`, `BookingForm.jsx`,
  `App.css`, `src/assets/*`, `public/icons.svg`) sin preguntar.
- **No "mejores" los 7 errores de lint preexistentes** dentro de un cambio ajeno, y
  nunca dejes el total por encima de 7 (§15.1).
- **No ejecutes comandos destructivos de git** sobre el working tree (§15.3).
- **No toques `.codegraph/`, `.claude/`, `.cursor/`, `.kiro/`, `.vscode/`,
  `.mcp.json`, `opencode.jsonc`** — son configuración de herramientas, incluido el
  bloque `CODEGRAPH_START/END` de este mismo archivo.
- **No añadas dependencias de red en el build** (fuentes, CDNs, imágenes externas)
  salvo el placeholder `https://placehold.co/...` que ya se usa.

---

## 18. Deuda técnica conocida

Documentada para que no se rediseñe por accidente. **Ninguna de estas es un bug a
arreglar de paso:**

| # | Ubicación | Estado |
|---|---|---|
| 1 | `BookingPage.jsx:62` | Fecha fija a `2026-09-${numero}`; `dias` son 21–27 fijos; encabezado "Septiembre 2026". Hay un TODO del autor. |
| 2 | `BookingPage.jsx:43` | `setAddon` declarado y nunca llamado → `addon` siempre `false`, sin UI, pero el cálculo (`+250`) y la columna existen. |
| 3 | `Servicios.jsx:70` → `BookingPage` | `?servicio=` se navega pero no se lee (sin `useSearchParams`). |
| 4 | `BookingPage.jsx:157,169` | Renderiza `s.etiqueta` y `s.duracion`, campos que no existen en el array local. |
| 5 | `BookingPage.jsx` | El wizard **no** consulta la tabla `servicios`: los 2 servicios y todos los horarios son constantes hardcodeadas. |
| 6 | `citas.servicio` | Texto plano, no FK → se pueden agendar servicios inexistentes. **No hay comprobación de agenda ocupada**: nada impide reservar dos citas en el mismo horario. |
| 7 | ~~`AdminDashboard.jsx:18`~~ | **RESUELTO** en el rediseño: el `<aside>` fijo `w-64` pasó a ser barra superior en `<lg` y rail en `lg+`, sin `useState`. Ver §12.1. |
| 8 | `Navbar.jsx` | Links `href="#"`; sin menú móvil; sin scroll a secciones (las secciones no tienen `id`). **No lo toques como parte del rediseño del admin.** |
| 9 | Todos los `cargarX()` | El `error` de Supabase se descarta; un fallo de red se ve como "lista vacía". Esto afecta también a los estados vacíos del admin, que son sobrios a propósito para no mentir cuando la petición falló. |
| 10 | Los tres `*Form` | Mensaje de error único y genérico; nunca se muestra el error real. `guardando` solo se resetea en el `catch`. |
| 11 | Los tres `*Form` | `URL.createObjectURL` nunca se revoca. |
| 12 | Deletes | `confirm()` nativo, y el `error` del `delete` no se maneja. |
| 13 | `*Form` modales | El `<img>` de preview sigue **sin `alt`**. (El `htmlFor` de los labels **ya se resolvió** en el rediseño; sigue sin resolverse el `aria-live` de los errores.) |
| 14 | `AuthContext` / `ProtejerRuta` | Sin control de roles: cualquier usuario autenticado entra al admin. |
| 15 | Storage | Los deletes no borran el archivo del bucket → imágenes huérfanas. |
| 16 | `index.html` | `lang="en"` con UI en español; `<title>` = `barberia` en vez del nombre del negocio. |
| 17 | Todo el repo | Textos `Lorem ipsum` y placeholders de marca sin sustituir. |
| 18 | ~~`ResumenPage.jsx:62`~~ | **RESUELTO** en el rediseño: se eliminó el `<p className="text-2xl mb-2">{t.icono}</p>`, que renderizaba vacío porque `tarjetas` nunca define `icono`. |
| 19 | `BookingPage.jsx:32` | Inconsistencia de formato de hora: `'18:30 PM'` (PM con hora de 24h); el resto usa `'10:00 AM'`, `'11:50 AM'`, `'12:40 PM'`. |
| 20 | `src/index.css` (`@theme`) | **Token semánticamente sobrecargado:** `cancelada` (`#B5645A`) representa a la vez el estado "cancelada" de una cita (nodo del rail, etiqueta) y las acciones destructivas ("Eliminar" en los CRUD, mensajes de error de los Forms). Debería separarse en un token de estado y otro de peligro. **Pendiente, no lo arregles por tu cuenta.** |
| 21 | `LoginPage.jsx` | Mantiene el tema anterior (`neutral-*`) mientras el admin usa `ink/bone/brass`. Los inputs se ven distintos al entrar al panel. Costura conocida del rediseño, documentada en §11. |
| 22 | `BookingPage` vs `CitasAdmin` | El rail de citas usa `font-serif` + `tabular-nums` y el wizard público no. Consecuencia de que sean dos sistemas visuales; no lo unifiques sin decidir lo del punto 21. |

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
