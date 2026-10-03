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
- **`estaEnCurso(cita)`** no lee un estado: lo deriva comparando la hora actual contra
  `hora + duración` del servicio, solo para citas `confirmada`. Si algún día se agrega el
  literal `en_curso`, también lo acepta.
- **`buscarServicio(nombre, servicios)`** resuelve la duración con 3 escalones: nombre
  exacto → categoría exacta → categoría contenida en el texto. Hace falta porque
  `citas.servicio` es texto libre y casi nunca coincide con `servicios.nombre` (las citas
  dicen "Corte", el catálogo dice "Corte de Cabello").
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

#### Lo que es UI pendiente de lógica

Marcado con `PENDIENTE` en el código, no lo tomes por implementado:

- **Vista Calendario**: la pestaña del toggle es navegable y muestra un placeholder con
  las 3 piezas que faltan (franjas por hora, bloqueos, aviso de solapamiento). No hay
  modelo de horarios.
- **Recordatorios SMS/WhatsApp**: tarjeta estática, botones **deshabilitados** a propósito
  (no fingen mandar nada). Falta proveedor + Edge Function + regla de disparo.
- **Cobrar**: ver arriba.
- **Tag "Club Noble" (VIP)**: omitido a propósito, no hay ningún criterio real en el
  modelo que lo sostenga. No lo inventes sin hablarlo.

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

**No hay carpeta `supabase/` en el repo ni SQL versionado en archivos**, pero SÍ hay
migraciones aplicadas desde el MCP de Supabase (§10.5). El esquema solo se puede inferir
del uso en el código. Lo que se ve en las consultas:

| Tabla | Columnas usadas | Evidencia |
|---|---|---|
| `citas` | `id`, `nombre`, `telefono`, `correo`, `notas`, `servicio`, `fecha`, `hora`, `addon`, `total`, `estado`, `barbero_id`, `created_at` | `BookingPage` inserta todos salvo `id`/`estado`/`barbero_id`; `CitasAdmin` lee `estado`, `addon`, `total`, `notas`, `correo`, `barbero_id`; `CitaManualForm` escribe `barbero_id` |
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

### 10.5 RLS y políticas (verificado en la BD, no en el código)

**Las 4 tablas tienen RLS habilitado.** Esto no se ve en el repo: se comprobó con el MCP
de Supabase (`pg_policies`). Las políticas vigentes:

| Tabla | Política | Comando | Rol |
|---|---|---|---|
| `citas` | `Cualquiera puede agendar` | INSERT | `anon` |
| `citas` | `Admin escribe` | ALL | `authenticated` |
| `barberos` | `Lectura publica` | SELECT | `anon` |
| `barberos` | `Admin escribe` | ALL | `authenticated` |
| `productos` | `Lectura publica` | SELECT | `anon` |
| `productos` | `Admin escribe` | ALL | `authenticated` |
| `servicios` | `Lectura publica` | SELECT | `anon` |
| `servicios` | `Admin escribe` | ALL | `authenticated` |

⚠ **`citas` NO tiene política de SELECT para `anon`.** Es intencional: la tabla de
reservas solo la lee el panel (que va autenticado), mientras el sitio público únicamente
la inserta. No la abras.

⚠ **El `Admin escribe` sobre `citas` es nuevo** (migración `admin_escribe_citas`, aplicada
con autorización explícita del usuario). Antes, el panel **no podía escribir en `citas`**:
`citas` solo tenía la política `INSERT` de `anon`, así que todo `update` de estado
(`cambiarEstado` y el nuevo `aplicarEstado`) era rechazado por RLS en silencio, porque el
código nunca revisaba el `error`. **No vuelvas a descartar el `error` de una escritura.**

Tipos de columna que importan para el cliente:

- `citas.fecha` es `date` → llega como `'YYYY-MM-DD'` y se compara lexicográficamente.
- `citas.hora` es `time without time zone` → llega como `'HH:MM:SS'`, **no** `'10:00 AM'`.
  Insertar `'11:50 AM'` **falla**: Postgres no puede castearlo a `time`. Mandar siempre
  `'HH:MM'` (24 h); el AM/PM es solo presentación.
- `citas.estado` tiene **default `'pendiente'`**: el insert del sitio público no lo envía.
- `citas.total`, `servicios.costo` y `servicios.duracion` son `numeric`/`text`: castear
  con `Number()` antes de sumar o comparar.

#### Función RPC `horas_ocupadas` (migración `rpc_horas_ocupadas`)

```sql
public.horas_ocupadas(fecha_consulta date) returns setof time
  language sql  security definer  set search_path = public  stable
```

Devuelve **solo la columna `hora`** de las citas no canceladas de esa fecha. Existe
porque `citas` **no** es legible por `anon` (expondría nombre, teléfono y correo), y sin
embargo `/agendar` necesita saber qué horas están tomadas. Se llama desde el cliente con
`supabase.rpc('horas_ocupadas', { fecha_consulta: 'YYYY-MM-DD' })`.

- `revoke all … from public` + `grant execute … to anon, authenticated`: sin esto,
  cualquier rol nuevo podría ejecutarla.
- Devuelve `'HH:MM:SS'`; el cliente recorta a `'HH:MM'` con `.slice(0, 5)`.

#### Índice único parcial `citas_slot_unico` (migración `slot_unico_por_fecha_hora`)

```sql
create unique index citas_slot_unico on public.citas (fecha, hora)
  where coalesce(estado, 'pendiente') <> 'cancelada'
```

Bloqueo optimista: dos personas no pueden tomar el mismo slot. El insert duplicado falla
con **`error.code === '23505'`**, que `BookingPage` traduce a "Ese horario acaba de ser
tomado, elige otro" + refresco de las horas ocupadas.

⚠ La misma migración tuvo que **cancelar una fila duplicada** (2025-09-30 11:50, dos
citas 'pendiente') porque Postgres no puede crear el índice con el conflicto. **No se
borró**: la fila sigue existiendo con `estado = 'cancelada'`. Cualquier intento de
recrear el índice con datos duplicados fallará otra vez.

---

## 11. Reglas de UI/UX

**El proyecto tiene DOS sistemas visuales, y es intencional.** No los unifiques sin
que el usuario lo pida:

| Zona | Sistema | Tokens |
|---|---|---|
| **Dashboard `/admin`** (8 archivos en `src/pages/admin/`) | Sistema actual, rediseñado | `slate` / `primary` / `amber` / `navy` |
| **Sitio público** (`/`, `/agendar`, `/login`) | Sistema anterior, **sin tocar** | `neutral-*` / `sky-500` / `emerald` / `amber` / `yellow` |

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
- **Light mode en el admin, dark en el público.** El admin usa tema claro;
  el público conserva su dark. **No hay theme switcher** en ninguna zona.
- Textos `Lorem ipsum` y datos de ejemplo son placeholders, no contenido final.
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

**Pendiente (no lo escales sin consultarlo, pero no lo empeores):**
- Sin `aria-live` en los mensajes de error ni en los estados de carga. `CitasAdmin`
  usa `role="alert"` en el banner de error de escritura (parcial, no es `aria-live`).
- La barra de búsqueda del topbar es decorativa: no filtra nada.
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

### 12.1 Dashboard `/admin` (sistema crema actual)

| Patrón | Dónde |
|---|---|
| `min-h-screen bg-cream-50 lg:flex` | raíz del shell en `AdminDashboard` |
| `lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0` | rail lateral en desktop |
| `border-b … lg:border-b-0 lg:border-r` | el `<aside>` es barra superior en `<lg` y rail en `lg+` |
| `border-cream-300` | bordes del sidebar |
| `bg-cream-100` | fondo del sidebar |
| `flex gap-1 overflow-x-auto … lg:flex-col lg:overflow-visible` | nav en fila con scroll horizontal en móvil, columna en `lg+` |
| `lg:hidden` / `hidden lg:block` | logout: versión móvil en la barra superior, versión desktop al pie del rail |
| `min-w-0 flex-1 p-4 lg:p-8` + `mx-auto max-w-6xl` | `main` y su contenedor de ancho máximo |
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
✖ 6 problems (6 errors, 0 warnings)
```

**Desglose exacto por archivo y regla:**

1. `src/context/AuthContext.jsx`
   * regla: `react-refresh/only-export-components`
   * 1 error (el archivo exporta `AuthProvider` y `useAuth`)
2. `src/pages/admin/BarberosAdmin.jsx`
   * regla: `react-hooks/immutability`
   * 1 error (`cargarBarberos` accessed before it is declared)
3. `src/pages/admin/CitasAdmin.jsx`
   * regla: `react-hooks/immutability`
   * 1 error (`cargarCitas` accessed before it is declared)
4. `src/pages/admin/ProductosAdmin.jsx`
   * regla: `react-hooks/immutability`
   * 1 error (`cargarProductos` accessed before it is declared)
5. `src/pages/admin/ResumenPage.jsx`
   * regla: `react-hooks/immutability`
   * 1 error (`cargarDatos` accessed before it is declared)
6. `src/pages/admin/ServiciosAdmin.jsx`
   * regla: `react-hooks/immutability`
   * 1 error (`cargarServicios` accessed before it is declared)

Totales:

| Regla | Cantidad |
|---|---|
| `react-hooks/immutability` | 5 |
| `react-refresh/only-export-components` | 1 |
| **Total** | **6 errores, 0 warnings** |

📉 **La línea base bajó de 7 a 6** al conectar `/agendar` a Supabase (2026-10): se
eliminó el estado `addon` de `BookingPage.jsx` porque la página ya no ofrece add-on
(§18.2), y con él su `no-unused-vars`. Fue un cambio **pedido explícitamente**, no un
"arreglo de paso". `BookingPage.jsx` ahora tiene **0 errores**.

Los 5 de `react-hooks/immutability` comparten el mismo mensaje,
*"Cannot access variable before it is declared"*: el patrón
`useEffect(() => { cargarX() }, [])` invoca una función declarada después con
`const`. Por eso **`src/pages/admin/AdminDashboard.jsx`, los `*Form` y
`src/pages/BookingPage.jsx` tienen 0 errores** y no aparecen en la lista.

**Estos errores son baseline preexistente. NO deben corregirse como parte del
rediseño visual ni de ningún trabajo no solicitado.** Reglas:

- No los "arregles" de paso mientras haces otra cosa: mezclar un fix no solicitado
  con tu cambio vuelve el diff imposible de revisar.
- **No subas el número.** Si tu cambio añade un error, el total será > 7 y eso es
  **un fallo tuyo**. El desglose por archivo de arriba es la referencia.
- Si te piden arreglarlos, es un task aparte: mueve la función **arriba** del
  `useEffect` o conviértela en `function` declaration / `useCallback`.

**Verificado durante el rediseño visual del admin (6 etapas).** En cada etapa se
ejecutó `pnpm lint` después de los cambios y el resultado se mantuvo **exactamente
en estos 7 errores, mismos archivos, mismas reglas, 0 errores nuevos**:

| Etapa | Archivo tocado | Lint |
|---|---|---|
| 1 | `src/index.css`, `src/pages/admin/AdminDashboard.jsx` | 7 / 0 nuevos |
| 2 | `src/index.css`, `src/pages/admin/ResumenPage.jsx` | 7 / 0 nuevos |
| 3 | `ServiciosAdmin.jsx`, `ProductosAdmin.jsx`, `BarberosAdmin.jsx` | 7 / 0 nuevos |
| 4 | `src/pages/admin/CitasAdmin.jsx` | 7 / 0 nuevos |
| 5 | `ServicioForm.jsx`, `ProductoForm.jsx`, `BarberoForm.jsx` | 7 / 0 nuevos |
| 6 | `src/index.css` (tokens crema/terracota) + todos los archivos admin | 7 / 0 nuevos |
| 7 | `CitasAdmin.jsx` (reescrito) + `CitaManualForm.jsx` (nuevo) | 7 / 0 nuevos |
| 8 | `ServiciosAdmin.jsx`, `ServicioForm.jsx` | 7 / 0 nuevos |
| 9 | `ProductoForm.jsx`, `BarberoForm.jsx`, `ProductosAdmin.jsx` (prop), `src/index.css` (`--font-sans` + antialiasing) | 7 / 0 nuevos |

`pnpm build` terminó correctamente en las 6 etapas, sin errores de compilación de
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
- **No introduzcas políticas de RLS, vistas, funciones SQL ni triggers** sin autorización
  explícita. **Las 4 tablas YA tienen RLS habilitado** con las políticas de §10.5: no es
  opcional ni se puede "quitar". Dos trampas concretas: (1) el sitio público inserta en
  `citas` con la clave publicable desde el navegador, así que **cualquier política sobre
  `citas` debe seguir admitting `INSERT` a `anon`** o se rompe el agendamiento público;
  (2) el panel va autenticado, así que **cualquier tabla que el panel escriba necesita una
  política `authenticated`** o el `update` falla en silencio.
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

- **El dashboard usa `cream-*` / `coffee-*` / `terracotta-*` / `sage-*` / `muted-blue-*` / `danger-*`** (§11.1). `terracotta` es el único
  acento interactivo del admin: acción primaria, indicador de ruta activa y foco.
- **No reintroduzcas `sky`, `emerald` ni `amber` como acentos del admin.** Ya no
  tienen ningún uso dentro de `src/pages/admin/`. Si los ves ahí, es un bug.
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
| 1 | ~~`BookingPage.jsx:62`~~ | **RESUELTO** (2026-10): la fecha se calcula en hora local con `FechaISO()` y se guarda como `'YYYY-MM-DD'`. |
| 2 | ~~`BookingPage.jsx:43`~~ | **RESUELTO** (2026-10): se eliminó el estado `addon` y el `+250`. El total es solo el `costo` del servicio y la columna `addon` ya no se envía. |
| 3 | `Servicios.jsx:70` → `BookingPage` | `?servicio=` se navega pero no se lee (sin `useSearchParams`). |
| 4 | ~~`BookingPage.jsx:157,169`~~ | **RESUELTO** (2026-10): la tarjeta usa `categoria` (antes `s.etiqueta`), `formatoDuracion(s.duracion)` y `Number(s.costo)`, todo desde la tabla real. |
| 5 | ~~`BookingPage.jsx`~~ | **RESUELTO** (2026-10): el paso 1 consulta `servicios` (`nombre, categoria, descripcion, costo, duracion, imagen`), con estado de carga y vacío ("Aún no hay servicios disponibles"). |
| 6 | `citas.servicio` | Sigue siendo texto plano, no FK → se pueden agendar servicios inexistentes desde otras vías. **Lo de la agenda ocupada sí se resolvió**: RPC `horas_ocupadas` + índice único `citas_slot_unico` (§10.5). Lo que **no** hay es un modelo de horarios/slots: las franjas siguen siendo constantes hardcodeadas en `BLOQUES`. |
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
| 20 | `src/index.css` (`@theme`) | **RESUELTO** en el rediseño: se añadió `danger-400` (`#C04A3A`) para acciones destructivas, separando del estado `cancelada` (`cancelled-400`). |
| 21 | `LoginPage.jsx` | Mantiene el tema anterior (`neutral-*`) mientras el admin usa `slate/primary/navy`. Los inputs se ven distintos al entrar al panel. Costura conocida del rediseño, documentada en §11. |
| 22 | ~~`BookingPage` vs `CitasAdmin`~~ | **RESUELTO**: la nueva tabla de citas usa `font-serif` + `tabular-nums` en la columna de hora, igual que el wizard público. |
| 23 | ~~`BookingPage.handleConfirmar`~~ | **RESUELTO** (2026-10): se manda `hora` en 24 h (`'HH:MM'`), que sí castea a `time`. El agendamiento público volvió a funcionar. |
| 24 | `citas` (modelo) | No hay columnas de pago. El botón "Cobrar" de `CitasAdmin` cierra la cita como `completada`; un registro real de cobro necesita `pagado`/`metodo_pago`/`cobrado_at`. |
| 25 | ~~sillones~~ | **DESCARTADO por el usuario**: `barberos.sillon_numero` / `sillon_nombre` existen en la BD pero `CitasAdmin` no los usa (ni badge, ni tarjeta, ni columna, ni % de ocupación). La gestión de sillones quedó en la página de Barberos, si es que algún día se retoma. |
| 26 | `CitasAdmin` — vista calendario | Placeholder navegable. Falta el modelo de horarios/slots y la detección de solapamientos (sigue sin haber forma de impedir dos citas en el mismo horario, §18.6). |
| 27 | `CitasAdmin` — recordatorios | Tarjeta estática con botones deshabilitados. Falta proveedor de mensajería, Edge Function con las plantillas y la regla de disparo (H-24 / H-2). |
| 28 | `citas.barbero_id` | Existe en la BD, pero **las 4 filas actuales lo tienen en `null`**, así que la columna Barbero sale en "Sin asignar" hasta que se asigne desde "Reprogramar" o desde el alta manual. |
| 29 | `citas` (RLS) | **RESUELTO**: se agregó la política `Admin escribe` para `authenticated` (§10.5). Antes toda escritura del panel sobre `citas` fallaba en silencio. |
| 30 | `CitasAdmin` — tag VIP | No existe el criterio para "Club Noble" ni ningún campo VIP en `citas`. Omitido a propósito; no lo inventes. |
| 31 | ~~Tokens del tema viejo en el admin~~ | **RESUELTO**: `src/pages/admin/` ya no usa ninguna clase `cream-*`, `coffee-*`, `terracotta-*`, `danger-*`, `ink-*`, `bone-*`, `brass-*`, `sage-*`, `muted-blue-*` ni `cancelled-*`. Los cuatro formularios están en tema claro (§9.4). Verificado con grep sobre el prefijo de clase real, no por substring (`shrink-` y `message-` dan falsos positivos con `ink-`/`sage-`). |
| 32 | `servicios.duracion` | Es TEXT y no tiene CHECK: conviven `'30'` (dato actual) y textos tipo `'50 min'`. `ServiciosAdmin.aMinutos()` normaliza para promediar y mostrar, y el formulario ya guarda minutos pelados (`type="number"`). El `servicio.costo` es `numeric`, no `precio` como en productos. |
| 33 | `servicios.descripcion` | La fila "Corte de Cabello" la tiene vacía. La tabla muestra "Sin descripción" en `slate-400` en vez de una celda en blanco que parece un bug. |
| 34 | `BarberosAdmin.CAPACIDAD_SLOTS_ESTIMADA` | Es una constante inventada (`= 8`) para "slots por barbero por día". Alimenta la métrica "Capacidad operativa" y la barra de citas de hoy de cada tarjeta. Está marcada como dato de ejemplo en el código; hace falta un modelo real de horarios/slots para que el número signifique algo. |
| 35 | `ResumenPage.getAccentBarbero(i)` | Muestra **"Barbero N°{i + 1}"** inventado por índice de fila en la tabla de citas de hoy, y un color por posición. No lee `citas.barbero_id` aunque la columna exista. En un panel con datos reales eso es un dato falso, no un placeholder. |
| 36 | `ProductosAdmin` — ícono "Ver" y "Contactar proveedor →" | Botones sin `onClick` y un `<a href="#">`. Son controles muertos: el mismo problema que se resolvió en `ServiciosAdmin` (donde "Ver" abre el form en `soloLectura`). |
| 37 | `citas.estado` (datos) | Hay una fila con `estado = 'Pendiente'` (mayúscula) creada fuera de la app. El `estado` es `text` libre, sin CHECK ni ENUM, y el admin compara `estado \|\| 'pendiente'` **de forma sensible a mayúsculas**: `CitasAdmin.accionesDe()` cae en `default` y esa fila se queda **sin botones de acción**. El índice `citas_slot_unico` y el RPC sí la tratan bien, pero la UI no. **Normaliza el dato** (`update citas set estado = 'pendiente' where estado = 'Pendiente'`) o mete un CHECK; no lo cambies sin avisar. |

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
