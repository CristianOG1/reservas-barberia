# Resultados · Pruebas de integración (Supabase real)

Fecha: **2026-11-11**
Suite: `tests/integration/` (Vitest, proyecto aparte: `vitest.integration.config.js`)

## Resumen

| Resultado | Cantidad |
|---|---|
| Pasan | **32** |
| Fallo esperado (`it.fails`, documentado) | **2** (INT-02, INT-10) |
| Saltadas (`it.skipIf`, con motivo) | **2** (INT-35, INT-36) |
| Total de casos | **36** |

Salida real de la última vuelta:

```
Test Files  4 passed | 1 skipped (5)
Tests  32 passed | 2 expected fail | 2 skipped (36)
Duration  9.29s (tests 97%, import 2%)
```

**Estabilidad:** 3 vueltas seguidas **desde cero** (caché de sesiones borrada antes de la
primera) con el mismo resultado: `32 passed | 2 expected fail | 2 skipped (36)`.

**Verificación final:** `pnpm lint` → 0 errores / 0 avisos; `pnpm test` (suite unitaria)
intacta: 41 archivos, 443 passed | 3 expected fail. Los archivos de integración **no**
entran en la suite unitaria (proyecto de Vitest aparte, verificado).

## Entorno y seguridad

- **Proyecto de pruebas de Supabase:** `xdmfsyreebqjxscmehrs.supabase.co`
  (distinto del de producción, `jlwwdavshkvjqfbmyzeg` / `gools.com.mx`).
  Solo se documenta la URL; **ninguna clave** va en este archivo ni en el repo.
- **Guard de seguridad** (`tests/integration/setup.js`): aborta la suite si falta
  `TEST_SUPABASE_URL` o si la URL apunta a producción (por ref o por dominio).
  Verificado: sin variables el arranque falla con un mensaje claro.
- **Datos de prueba con prefijo `int_`** (`int_prueba-…`) en nombres de barberías,
  servicios, productos, barberos y citas. El **slug** de barberías de prueba es la
  excepción: el CHECK `barberias_slug_valido` (`^[a-z0-9]+(-[a-z0-9]+)*$`) prohíbe el
  guion bajo, así que se genera `b` + hex de la marca (el `nombre` conserva la marca).
- **Limpieza por prueba** (`afterEach` + `limpiar(sesiones, marca)`): cada caso crea
  filas con su propia marca y solo borra las de esa marca; los archivos corren en
  paralelo y una limpieza global se comía filas del archivo vecino.
- **Verificado al cerrar:** 0 filas con `int_prueba%` en `barberias`, `servicios`,
  `productos`, `barberos` y `citas` del proyecto de pruebas.

## Cómo ejecutar

Las dos variables del proyecto de pruebas deben estar en el entorno (o en `.env.test`,
que está gitignored):

- `TEST_SUPABASE_URL`
- `TEST_SUPABASE_ANON_KEY`

```bash
# Opción A: exportar y correr
pnpm test:integration

# Opción B (Windows): el puente lee .env.test y lanza vitest
node tests/helpers/ejecutar-integracion.mjs
```

Opcional: `TEST_SUPABASE_SERVICE_ROLE_KEY` habilita INT-35/INT-36 (ver abajo).

## Detalle por caso

| ID | Qué verifica | Mapeo | Resultado |
|---|---|---|---|
| INT-01 | El admin de A no ve las citas de B (0 filas, RLS por `barberia_id`) | F-08 | ✅ pasa |
| INT-02 | El admin de A no ve los servicios de B (0 filas) | F-08 | ⚠️ fallo esperado (ver abajo) |
| INT-03 | El admin de A no modifica las citas de B (UPDATE afecta 0 filas) | F-08 | ✅ pasa |
| INT-04 | El admin de A no modifica los servicios de B (0 filas) | F-08 | ✅ pasa |
| INT-05 | El cliente ve exactamente sus citas y ninguna más | F-07 | ✅ pasa |
| INT-06 | El cliente no puede modificar una cita (ni la propia: solo RPC) | F-07 | ✅ pasa |
| INT-07 | El cliente no puede borrar una cita | F-07 | ✅ pasa |
| INT-08 | El cliente no puede insertar en `membresias` (solo la RPC) | F-14 | ✅ pasa |
| INT-09 | Nadie puede insertar citas en una barbería inactiva | F-05 | ✅ pasa |
| INT-10 | `anon` sí puede insertar citas en una barbería activa | F-05 | ⚠️ fallo esperado (ver abajo) |
| INT-11 | El admin de su barbería sí registra una cita (control positivo) | F-05 | ✅ pasa |
| INT-12 | `anon` no puede llamar `recordatorios_citas_pendientes` | — | ✅ pasa |
| INT-13 | `anon` no puede llamar `recordatorios_api_key_resend` | — | ✅ pasa |
| INT-14 | `anon` no puede llamar `turnstile_api_key` | — | ✅ pasa |
| INT-15 | Un usuario autenticado tampoco puede reclamar recordatorios | — | ✅ pasa |
| INT-16 | `horas_ocupadas` responde a `anon` y lista las horas tomadas | F-05 | ✅ pasa |
| INT-17 | `asignar_barbero` responde a `anon` con un barbero de esa barbería | F-17 | ✅ pasa |
| INT-18 | `cancelar_cita` sobre una cita ajena se rechaza (`cita_no_modificable`) | F-06 | ✅ pasa |
| INT-19 | Un admin tampoco cancela la cita de otro con la RPC | F-06 | ✅ pasa |
| INT-20 | `superadmin_resumen_barberias` rechaza a `anon`, admin y cliente (`42501`) | F-15 | ✅ pasa |
| INT-21 | `superadmin_resumen_barberias` responde al superadmin | F-15 | ✅ pasa |
| INT-22 | `unirme_a_barberia` se rechaza para admin y superadmin (`solo_clientes`) | F-14 | ✅ pasa |
| INT-23 | El cliente se une a una barbería y repetir no duplica (idempotente) | F-14 | ✅ pasa |
| INT-24 | `rol_actual` devuelve el papel real de cada cuenta del seed | F-01 | ✅ pasa |
| INT-25 | `es_superadmin` solo es cierto para la cuenta proveedor | F-08 | ✅ pasa |
| INT-26 | `reagendar_cita` sobre una cita ajena se rechaza | F-07 | ✅ pasa |
| INT-27 | Segunda reserva en la misma franja da `23505` (`citas_slot_unico`) | F-05 | ✅ pasa |
| INT-28 | La franja de una cita cancelada se puede volver a reservar | F-05 | ✅ pasa |
| INT-29 | La misma franja sí se puede en dos barberías distintas | F-05 | ✅ pasa |
| INT-30 | Dos reservas simultáneas de la misma franja: gana exactamente una | F-05 | ✅ pasa |
| INT-31 | Un slug reservado se rechaza | F-16 | ✅ pasa |
| INT-32 | Un slug duplicado da `23505` (`barberias_slug_unico`) | F-16 | ✅ pasa |
| INT-33 | Un slug válido sí crea la barbería (control positivo) | F-16 | ✅ pasa |
| INT-34 | Una barbería inactiva no se ve desde `anon` (`Lectura publica` = `activa`) | F-15 | ✅ pasa |
| INT-35 | El trigger `trg_crear_perfil` crea el perfil como `cliente` aunque `user_metadata` pida `admin` | F-01 | ⏭️ saltada (ver abajo) |
| INT-36 | Borrar un usuario de auth deja sus citas con `cliente_id` en `NULL` | F-07 | ⏭️ saltada (ver abajo) |

Los mapeos a F-xx salen únicamente de `Matriz_Funcionalidades.md`. INT-12 a INT-15 no
mapean a ninguna funcionalidad: son permisos de funciones internas de la base.

## Los 2 fallos esperados (`it.fails`), documentados

### INT-02 · el admin de A ve el catálogo de servicios de B

Las políticas de lectura de `servicios` (y `productos`, `barberos`, `configuracion`)
siguen siendo `using (true)` porque **RLS no puede ver el subdominio**: el frontend
filtra por la barbería del slug. Es la deuda técnica #60 de `AGENTS.md`, **por diseño**,
no un bug de esta prueba. La prueba exige 0 filas y falla en consecuencia: se marca con
`it.fails` para que el fallo sea visible y esperado, no un error rojo más.

Si algún día se cierra la deuda #60 (cambio de modelo), hay que **quitar el `it.fails`**
de INT-02: Vitest reportaría «expected to fail but passed» y la suite se pondría roja.

### INT-10 · `anon` no puede agendar en el proyecto de pruebas

Producción tiene la política **«Cualquiera puede agendar»** (INSERT en `citas` para
`anon` + `authenticated`, con check de barbería activa, verificada por MCP). El proyecto
de pruebas se construyó desde `database/schema.sql`, que **no incluye esa política**,
así que el INSERT anónimo se rechaza con `42501`. No es un bug de la aplicación: es una
diferencia entre los dos proyectos.

Opciones: (a) aplicar la política al proyecto de pruebas y **quitar el `it.fails`** de
INT-10, o (b) dejarlo documentado así. Se eligió (b) para no alterar el esquema del
proyecto de pruebas dentro de esta tarea; la opción quedó reportada en
`tests/incidencias.md`.

## Las 2 saltadas, con motivo

INT-35 e INT-36 prueban el **trigger** `trg_crear_perfil` y el borrado de usuarios de
`auth.users`: ambas necesitan crear y borrar usuarios de autenticación, que es una
operación de administración (`auth.admin.*`). Solo es posible con la clave
`service_role` del proyecto de pruebas, que **no se ha compartido**. El motivo está en
el nombre de cada caso (visible en la salida de Vitest):

> «se salta: requiere TEST_SUPABASE_SERVICE_ROLE_KEY (crea y borra usuarios en auth.users)»

Al compartir la clave (variable `TEST_SUPABASE_SERVICE_ROLE_KEY`), los dos casos se
ejecutan solos sin cambiar nada del código. El guard de `setup.js` ya rechaza producción
por ref y por dominio, así que la clave nunca debe ser la de producción.

## Notas de implementación (para reproducir)

- **Helper central:** `tests/helpers/integracion.js` (fuera de `tests/integration/`:
  la config del runner recoge todo archivo de esa carpeta como suite y un helper sin
  `describe` fallaba con «No test suite found»).
- **Sesiones cacheadas** en `os.tmpdir()/barberweb-integracion-sesiones.json` (con lock
  exclusivo `wx` y espera acotada a ~20 s para no exceder el `hookTimeout` de 30 s):
  el endpoint de login de Supabase tiene rate limit y 16 inicios por vuelta lo agotaban
  («Request rate limit reached»). Para probar arranque en frío, borrar ese archivo y su
  `.lock` de `%TEMP%`.
- **Franjas únicas por archivo:** `franja()` deriva la hora de un sufijo hex aleatorio
  por archivo, para que dos archivos en paralelo no pidan la misma `(fecha, hora)`.
- **Citas de prueba creadas por `dueno`:** el proyecto de pruebas no tiene la política
  «Cualquiera puede agendar» (ver INT-10), así que el insert anónimo o de cliente no
  funciona ahí.
- **RPC de cancelar (INT-18/28):** solo la cuenta cuyo `cliente_id` figura en la cita
  puede cancelarla; el admin usa su propia cita para el control positivo.
- **INT-15:** la cita se crea **con barbero** (`BARBERO_A_1`) porque `horas_ocupadas`
  con `barbero_id = null` solo devuelve las horas en las que ya no queda ningún barbero
  libre.

## Estado del trabajo

- Rama: `feature/dashboard-admin`. **Sin commits ni push**: el commit lo decide el
  usuario (todo el trabajo de la tarea sigue pendiente de commitear).
- Los datos de prueba se limpian solos (verificado: 0 filas `int_prueba%` restantes).
