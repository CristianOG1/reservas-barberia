# BarberWeb — Sistema Web para Gestión de Barberías

Plataforma web multi-tenant para que una o varias barberías operen su propio
sitio con catálogo, agenda de citas y recordatorios, con los datos de cada
sucursal aislados dentro de una misma base de datos.

- **Marca:** BarberWeb · **Equipo:** BarberWeb Solutions
- **Asignatura:** Proyecto Integrador (DGS-1002) · **Docente:** Nora García González
- **Institución:** Universidad Tecnológica Fidel Velázquez
- **Naturaleza:** proyecto académico. Todos los datos de ejemplo son ficticios.

---

## 1. Nombre, descripción y propuesta de valor

**BarberWeb** es un sistema web de gestión para barberías, compuesto por un
sitio público con catálogo, un asistente de reserva en tres pasos, un panel de
administración del salón, un portal del cliente y un panel del proveedor del
software que administra todas las barberías registradas.

La **propuesta de valor** declarada por el equipo (141 palabras, Anexo A1 del
Business Model Canvas) es la siguiente:

> **Para** los dueños de barberías de una o dos sucursales en zonas urbanas de
> México **que** hoy agendan sus citas por WhatsApp y una agenda de papel,
> perdiendo el control de los horarios y de la información de su salón,
> **BarberWeb** es un **sistema web de gestión con agenda en línea** **que**
> permite a cada barbería operar su propio sitio con catálogo, reservas y
> recordatorios, con los datos aislados por sucursal dentro de una misma base de
> datos. **A diferencia de** depender de una agenda de papel junto con una
> conversación de WhatsApp o de las plataformas de reservas genéricas, que cobran
> comisión por transacción y obligan a instalar una aplicación, **nuestro
> producto** entrega un panel de administración propio, funciona sin descargas,
> mantiene el historial de citas de cada cliente en el negocio y cuesta desde
> $199 al mes por barbería.

El modelo de negocio es una **suscripción mensual por barbería** con tres planes:
Básico $199 · Profesional $299 · Empresarial $399.

---

## 2. Tecnologías y versiones

### 2.1 Frontend

| Tecnología | Declarada en `package.json` | Versión probada |
|---|---|---|
| React / React DOM | `^19.2.8` | 19.3.0 |
| React Router | `^7.18.4` | 7.18.4 |
| Vite (bundler y servidor de desarrollo) | `^8.3.0` | 8.3.0 |
| `@vitejs/plugin-react` | `^6.1.1` | 6.1.1 |
| Tailwind CSS + `@tailwindcss/vite` | `^4.3.3` | 4.3.3 |
| `@supabase/supabase-js` | `^2.116.0` | 2.116.0 |
| ESLint + `react-hooks` + `react-refresh` | `^10.10.0` / `^7.1.1` / `^0.5.6` | 10.10.0 / 7.1.1 / 0.5.7 |

El proyecto es **JavaScript/JSX puro**: no hay TypeScript en el frontend ni
`tsconfig.json`. La única excepción es el runtime **Deno** de las Edge Functions,
cuyo código sí está en TypeScript.

### 2.2 Backend y base de datos (Supabase)

| Componente | Versión / configuración |
|---|---|
| PostgreSQL | **17.6** |
| Tablas en el esquema `public` | **8** — `barberias`, `barberos`, `citas`, `configuracion`, `membresias`, `perfiles`, `productos`, `servicios` |
| Políticas de RLS activas | **23** sobre las 8 tablas |
| Funciones (RPC) | **19** en el esquema `public` |
| Extensiones | `pgcrypto` 1.3 · `supabase_vault` 0.3.1 · `pg_cron` 1.6.4 · `pg_net` 0.20.4 |
| Autenticación | Supabase Auth — correo y contraseña (sin OAuth, sin magic link) |
| Almacenamiento | Supabase Storage — bucket público `imagenes` (5 MB por archivo; JPEG, PNG, WebP, GIF, AVIF) |
| Secretos | Supabase Vault |
| Tareas programadas | 2 activas en `pg_cron` |

### 2.3 Edge Functions

Runtime **Deno** con TypeScript (`supabase/functions/*/index.ts`), desplegadas
con `import_map` sobre `npm:@supabase/supabase-js@2`.

| Función | Estado | Qué hace |
|---|---|---|
| `enviar-recordatorios` | ✅ versionada en el repositorio | Correo al cliente 24 h y 2 h antes de la cita |
| `crear-barberia` | ✅ versionada en el repositorio | Da de alta una barbería y la cuenta `admin` de su dueño |
| `enviar-whatsapp` | ⚠️ **desplegada pero NO versionada** | Aviso por WhatsApp en las mismas dos ventanas |

### 2.4 Despliegue

| Archivo | Plataforma |
|---|---|
| `wrangler.jsonc` | Cloudflare — `gools.com.mx` y un subdominio por barbería (`<slug>.gools.com.mx`) |
| `vercel.json` | Vercel — reescritura de todas las rutas a `index.html` (SPA) |

---

## 3. Requisitos previos

| Requisito | Versión | Comprobación |
|---|---|---|
| Node.js | `^20.19.0` o `>=22.12.0` (lo exige Vite 8) | `node -v` |
| pnpm | 9 o superior — el lockfile está en formato `lockfileVersion 9.0` | `pnpm -v` |
| Git | cualquiera | `git --version` |
| Una cuenta de Supabase | el plan gratuito es suficiente | Dashboard de Supabase |
| Un cliente SQL | el SQL Editor del panel o `psql` (PostgreSQL 15+) | — |

No hace falta instalar PostgreSQL localmente: la base corre en Supabase.

---

## 4. Instalación

> ⚠️ Los pasos 3 a 5 se hacen en un **proyecto de pruebas**. El proyecto de
> producción no se debe tocar.

### Paso 1 · Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd <CARPETA_DEL_REPOSITORIO>
```

**Resultado esperado:** el directorio del proyecto aparece en disco, con
`package.json`, `src/`, `database/` y `supabase/` dentro.

### Paso 2 · Instalar las dependencias

```bash
pnpm install
```

**Resultado esperado:** termina con `Done in Ns` y crea la carpeta
`node_modules/`. No modifica `package.json` ni `pnpm-lock.yaml`.

### Paso 3 · Crear un proyecto de pruebas en Supabase

1. Dashboard de Supabase → **New project**.
2. Ponle un nombre (por ejemplo `barberweb-prueba`), elige región y contraseña.
3. Ve a **Project Settings → API** y copia dos valores:
   - **Project URL** → será `VITE_SUPABASE_URL`
   - la **clave publicable** (`sb_publishable_…`) → será `VITE_SUPABASE_PUBLISHABLE_KEY`

**Resultado esperado:** tienes la URL y la clave a la vista. La clave secreta
(`sb_secret_…`) **no** se usa en el frontend: no la necesitas para esta guía.

### Paso 4 · Crear el esquema

En el **SQL Editor** del proyecto nuevo, pega el contenido de
`database/schema.sql` y pulsa **Run**.

O con `psql`:

```bash
psql "postgresql://postgres:<PASSWORD>@db.<REF>.supabase.co:5432/postgres" \
     -v ON_ERROR_STOP=1 -f database/schema.sql
```

> Usa siempre `-v ON_ERROR_STOP=1`: sin eso `psql` **continúa** tras un error y
> el fallo pasa desapercibido. El script va dentro de una transacción, así que
> si falla no queda nada a medias.

**Resultado esperado:** el script termina sin errores y el proyecto queda con
**8 tablas**, **23 políticas de RLS**, **19 funciones** y las 4 extensiones
instaladas. Puedes comprobarlo en el SQL Editor:

```sql
select count(*) from information_schema.tables where table_schema = 'public';
select count(*) from pg_policies where schemaname = 'public';
select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public';
```

### Paso 5 · Cargar los datos de ejemplo

Igual que el paso 4, pero con `database/seed.sql`.

**Resultado esperado:** termina sin errores y quedan **2 barberías**,
**2 filas de configuración**, **6 servicios**, **8 productos**, **3 barberos**,
**13 citas**, **4 usuarios de prueba**, **4 perfiles** y **1 membresía**.
Los datos incluyen a propósito casos límite (citas sin cuenta, un teléfono de
longitud inválida, una cita cancelada) para poder reproducir los errores.

### Paso 6 · Preparar las variables de entorno

```bash
cp .env.example .env.local
```

**Resultado esperado:** se crea `.env.local` en la raíz. `.env.local` está
ignorado por git (`.gitignore` ignora `.env` y `.env.*`); `.env.example` es el
único archivo de entorno que sí se versiona, y todos sus valores son de ejemplo.

### Paso 7 · Rellenar solo dos variables

Abre `.env.local` y cambia **únicamente** estas dos líneas:

```dotenv
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=ejemplo_clave_publicable_de_supabase
```

Sustituye los valores por los del paso 3. Las otras dos variables ya vienen
rellenas con valores de ejemplo y solo hay que tocarlas si quieres otro slug de
barbería u otro dominio:

| Variable | Para qué |
|---|---|
| `VITE_BARBERIA_SLUG` | Barbería que se abre cuando no hay subdominio (en local: `localhost`) |
| `VITE_DOMINIO_BASE` | Dominio contra el que se resuelve el subdominio de cada barbería |

**Resultado esperado:** `.env.local` tiene cuatro líneas de variables y ninguna
contiene un secreto real. La clave de correo no se usa desde el navegador: la
consume la Edge Function en el servidor.

### Paso 8 · Levantar el entorno de desarrollo

```bash
pnpm dev
```

**Resultado esperado:** Vite imprime la URL local (por defecto
`http://localhost:5173/`).

---

## 5. Cómo ejecutar

```bash
pnpm dev        # servidor de desarrollo con recarga en caliente
pnpm build      # compila a dist/
pnpm preview    # sirve dist/ localmente
pnpm lint       # ESLint sobre el proyecto
```

Al abrir `http://localhost:5173/` debes ver:

- El **hero** con el nombre de la barbería del slug configurado.
- Los grids de **servicios** y **productos** cargados desde la base de datos. Si
  salen vacíos, lo más probable es que `VITE_SUPABASE_URL` apunte a un proyecto
  sin el `seed` cargado.
- La **navbar** con las secciones Inicio, Servicios, Productos y Contacto, y el
  botón «AGENDAR CITA».

Las rutas del sitio son:

| Ruta | Contenido |
|---|---|
| `/` | Portada: hero, servicios y productos |
| `/servicios` · `/productos` · `/contacto` | Catálogos y contacto |
| `/agendar` | Asistente de reserva en 3 pasos |
| `/login` | Inicio de sesión y registro |
| `/admin` | Panel del dueño de la barbería (agenda, servicios, productos, barberos, configuración) |
| `/cliente` | Portal del cliente: sus citas, con opción de cancelar o reprogramar |
| `/superadmin` | Panel del proveedor del software: todas las barberías |

Para ver los paneles, entra con uno de los usuarios de prueba del apartado 6.

> La aplicación es **una SPA**: al recargar en una ruta interna el servidor
> debe devolver `index.html`. `vercel.json` y `wrangler.jsonc` ya lo configuran
> para despliegue.

---

## 6. Usuarios de prueba

Los crea `database/seed.sql`. **Solo existen en el proyecto de pruebas**: no hay
ninguna cuenta real en producción, y todos los datos de ejemplo usan el dominio
reservado `@ejemplo.com`.

| Correo | Contraseña | Rol | Qué ve |
|---|---|---|---|
| `proveedor@ejemplo.com` | `Demo1234!` | `superadmin` | Panel del proveedor: todas las barberías, sus conteos y el alta de nuevas |
| `dueno@ejemplo.com` | `Demo1234!` | `admin` | Panel del dueño de la primera barbería (`Salon Demo`) |
| `dueno.norte@ejemplo.com` | `Demo1234!` | `admin` | Panel del dueño de la segunda barbería (`Barberia Norte Ficticia`) |
| `cliente@ejemplo.com` | `Demo1234!` | `cliente` | Portal del cliente: únicamente sus propias citas |

> La contraseña es la misma para los cuatro y es de ejemplo. El registro de un
> alta real **nunca** asigna un rol: el trigger de la base crea siempre el
> perfil como `cliente`, y el rol se nombra después por SQL.

---

## 7. Cómo ejecutar las pruebas

**Estado real: no hay pruebas automatizadas.** El repositorio no tiene runner,
ni script de prueba, ni archivos de test, ni instrumentación de cobertura. La
cobertura medida es **0 %** y no existe ninguna suite que pueda ejecutarse.

La guía del proyecto exige una cobertura medida de al **70 %** y al menos dos
casos de prueba por funcionalidad. Esa medición **todavía no existe**: es la
principal tarea pendiente de la entrega de software, y la ruta acordada es un
**registro de pruebas manuales con evidencia** (pasos numerados, resultado
esperado, resultado real y captura), que no exige un framework concreto.

Lo que sí existe hoy es **verificación manual documentada**:

| Qué | Cómo |
|---|---|
| Comprobación funcional de extremo a extremo | [`database/VERIFICAR.md`](database/VERIFICAR.md) — 12 pasos con las cuatro cuentas de prueba, y las consultas para comparar el esquema resultante con el de producción |
| Lint | `pnpm lint` — la línea base del proyecto es **10 errores y 9 avisos**, todos preexistentes y medidos |

### 7.1 El registro de casos de prueba

El registro del proyecto documenta **34 casos sobre 17 funciones** (dos por
función), con el resultado real de cada uno: **18 aprobados, 5 fallidos y 11
pendientes de ejecución**. Es la base del registro manual que falta.

⚠️ El recuento **no está conciliado**: algunas notas del proyecto siguen
citando «20 casos sobre 11 funciones». La cifra de arriba es la del propio
registro de casos, y la reconciliación de los identificadores `F-xx` entre la
matriz de funcionalidades y el registro de pruebas está pendiente.

---

## 8. Estructura de carpetas

```
.
├── database/                 Esquema y datos de ejemplo (reconstruyen la base)
│   ├── schema.sql            Esquema consolidado: 8 tablas, 23 políticas, 19 funciones
│   ├── seed.sql              Datos ficticios + usuarios de prueba
│   └── VERIFICAR.md          Cómo probar la reconstrucción y comparar con producción
├── supabase/
│   └── functions/            Edge Functions (TypeScript sobre Deno)
│       ├── crear-barberia/        Alta de barbería y de la cuenta admin de su dueño
│       └── enviar-recordatorios/  Aviso por correo 24 h y 2 h antes de la cita
├── src/
│   ├── main.jsx              Punto de entrada: BrowserRouter > AuthProvider > App
│   ├── App.jsx               Tabla de rutas y los cuatro layouts
│   ├── index.css             @import "tailwindcss" y los tokens del panel
│   ├── supabaseClient.js     Cliente de Supabase (único punto de contacto)
│   ├── context/              Sesión, barbería activa y configuración del salón
│   ├── components/            Piezas del sitio público y el guard de rutas
│   ├── pages/
│   │   ├── admin/            Panel del dueño de la barbería
│   │   ├── cliente/          Portal del cliente
│   │   └── superadmin/      Panel del proveedor del software
│   ├── hooks/                Lógica compartida entre pantallas
│   └── utils/                Ayudas (destino de inicio según el rol)
├── public/                   Recursos estáticos (imagen del hero, favicon)
├── index.html                Documento raíz de la SPA
├── vite.config.js            Plugins de Vite (React + Tailwind)
├── eslint.config.js          Configuración de ESLint
├── wrangler.jsonc            Despliegue en Cloudflare
├── vercel.json               Despliegue en Vercel
└── package.json              Dependencias y scripts
```

### Notas sobre el árbol

- `src/context/` está partido en tres archivos por cada contexto
  (`AuthContext`, `barberia` / `BarberiaProvider` / `useBarberia`,
  `configuracion` / `ConfiguracionProvider` / `useConfiguracion`) para no
  mezclar un componente con un hook en el mismo archivo.
- `src/components/BookingForm.jsx`, `src/App.css`, `src/assets/` y
  `public/icons.svg` son **código muerto**: no los importa nadie. Se conservan
  como referencia y no forman parte de la aplicación.
- `resend` aparece en `dependencies` pero **no se usa desde `src/`**: la
  librería corre en el runtime de Deno, que resuelve sus propios imports.

---

## 9. Limitaciones conocidas

Todas están medidas y verificadas; ninguna se presenta como terminada.

### 9.1 Madurez funcional

- **Ninguna función está en estado «Completa».** La matriz de funcionalidades
  define 17 funciones: **8 en estado «Parcial»** (funcionan, con al menos una
  limitación indicada) y **9 en estado «Pendiente»** (implementadas en el
  código pero sin casos de prueba redactados). La guía no permite declarar una
  función completa sin evidencia.
- **No hay cobertura de pruebas medida** (§7). Es el bloqueo principal de la
  entrega de software.

### 9.2 Datos y seguridad

- El **bucket de imágenes no aísla por barbería**: la única política permite
  subir a cualquier carpeta de cualquier barbería. El aislamiento real lo
  garantiza el frontend, no la base de datos.
- La función `barberia_del_usuario()` no comprobaba el rol en producción; ya se
  corrigió en `database/schema.sql`, pero **el cambio no está desplegado** en
  el proyecto real.
- El **catálogo público es legible entre barberías** (políticas con
  `using (true)`): es dato público por diseño, pero conviene tenerlo presente.
- El índice único que bloquea las reservas `(barberia_id, fecha, hora)` **no
  mira el barbero**: una barbería con dos barberos no puede tener dos citas a
  la misma hora. Es una decisión consciente, no un descuido.
- `citas.servicio` guarda los nombres de los servicios como **texto**, no como
  clave foránea, y `citas.cliente_id` **no tenía** clave foránea en el
  proyecto real (ya está en `schema.sql`, sin desplegar).

### 9.3 Operación

- La Edge Function **`enviar-whatsapp` no está versionada** en el repositorio:
  está desplegada y activa, pero su código fuente no está en el control de
  versiones, así que la entrega de software queda incompleta.
- Las **tareas programadas se configuran a mano**: el SQL que las crea está en
  [`database/VERIFICAR.md`](database/VERIFICAR.md) (Ruta C) y requiere crear
  antes dos secretos en Supabase Vault.
- El **dominio de correo no está verificado** en el proveedor: el canal
  automático de correo no llega todavía a clientes reales. El único canal que
  llega hoy es el aviso manual por WhatsApp desde el panel.
- **Faltan datos en el formulario de contacto**: las sedes están vacías, así que
  los mapas incrustados no muestran la ubicación real.
- Quedan **textos de relleno y marcadores de marca** sin sustituir, y el
  `index.html` declara `lang="en"` y un `<title>` provisional.

### 9.4 Reproducibilidad

- `database/schema.sql` y `database/seed.sql` son una **reconstrucción
  verificada contra el esquema real**, no el historial de migraciones. El
  proyecto acumula **34 migraciones** aplicadas y parte del esquema se aplicó
  directamente en la base sin quedar nunca en una migración. El script
  `schema.sql` cubre ese hueco, pero conviene contrastarlo con
  [`database/VERIFICAR.md`](database/VERIFICAR.md) antes de darlo por bueno.
- **No hay etiqueta de versión `v1.0`** publicada en el repositorio, y el
  `package.json` sigue en `0.0.0`.

---

## 10. Integrantes

| Integrante | Rol en el proyecto |
|---|---|
| Francisco Daniel Almazán Patlán | Planeación y análisis de negocio |
| Nicole Estefanía Cuapio Salazar | Investigación de mercado y mercadotecnia |
| Isaac Hernández Pérez | Diseño de base de datos y back-end |
| Leslie Denise Mata Luévano | Diseño de la interfaz de usuario |
| Cristian Olmos González | Desarrollo front-end y coordinación técnica |
| Mauricio Yahir Roa Sánchez | Desarrollo back-end y despliegue |
| Alejandro Vargas Vega | Pruebas y documentación |

---

## Licencia y datos

Proyecto académico. Los datos de `database/seed.sql` son **ficticios**: usan el
dominio reservado `@ejemplo.com`, nombres y teléfonos inventados y UUID fijos de
ejemplo. No hay secretos en el repositorio: `.env` y `.env.local` están
ignorados por git y `.env.example` solo contiene valores de ejemplo.
