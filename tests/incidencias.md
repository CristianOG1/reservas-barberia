# Incidencias detectadas por las pruebas

Este archivo recoge los casos que la suite de pruebas detecta como
comportamientos que la aplicación **no** cumple. Hay dos estados:

- **Corregidos**: el `it.fails` se convirtió en `it` (el test ahora pasa de
  verdad). Se conservan aquí como historial, con la fecha de la corrección y el
  commit (vacío mientras no se commitee).
- **Abiertos**: siguen siendo `it.fails`. El test falla a propósito y avisa de
  lo que falta.

**No se ha modificado `src/` fuera de lo pedido**: los bloques de corrección
han tocado solo los puntos acordados.

## Columnas

| Columna | Qué significa |
|---|---|
| **Fecha** | Día en que la prueba detectó la incidencia. En las corregidas, el día de la corrección. |
| **Commit** | Commit que la arregla. **«pendiente»** mientras no se commitee. |
| **Estado** | `Corregido` u `Abierto`. |

## Cómo se mide la severidad

| Severidad | Qué significa |
|---|---|
| **Alta** | La aplicación muestra un estado **falso** como si fuera verdad (un catálogo, una agenda o una lista vacíos cuando lo que pasó es un fallo de red). Alguien puede tomar decisiones sobre datos que no existen. |
| **Media** | La aplicación falla **en silencio** (no avisa de un error de escritura), o enseña un dato inventado, o un texto roto, o una consulta que no lleva el mismo acotado que sus hermanas. |
| **Baja** | Falta una validación o una comodidad, o hay una discrepancia entre lo que dice un criterio y lo que se ve. No rompe el flujo. |

---

## Corregidas (31)

| # | Archivo | Caso | Qué fallaba | Severidad | Fecha | Commit | Estado |
|---|---|---|---|---|---|---|---|
| 1 | `tests/unit/ServiciosAdmin.test.jsx` | avisa cuando la carga de los servicios falla | `cargarServicios` descartaba el `error`: un fallo de red se veía igual que una carta vacía. Ahora avisa con botón «Reintentar». | **Alta** | 2026-11-11 | pendiente | Corregido |
| 2 | `tests/unit/ServiciosAdmin.test.jsx` | avisa cuando el borrado de un servicio falla | `handleEliminar` descartaba el `error` del `delete`. Ahora avisa «No se pudo eliminar el servicio: …». | Media | 2026-11-11 | pendiente | Corregido |
| 3 | `tests/unit/ProductosAdmin.test.jsx` | avisa cuando la carga de los productos falla | Igual que el #1, en `ProductosAdmin`. | **Alta** | 2026-11-11 | pendiente | Corregido |
| 4 | `tests/unit/ProductosAdmin.test.jsx` | avisa cuando el borrado de un producto falla | Igual que el #2, en `ProductosAdmin`. | Media | 2026-11-11 | pendiente | Corregido |
| 5 | `tests/unit/BarberosAdmin.test.jsx` | avisa cuando la carga del equipo falla | `cargarDatos` descartaba el `error` de las dos consultas. | **Alta** | 2026-11-11 | pendiente | Corregido |
| 6 | `tests/unit/BarberosAdmin.test.jsx` | avisa cuando el borrado de un barbero falla | `handleEliminar` descartaba el `error` del `delete`. | Media | 2026-11-11 | pendiente | Corregido |
| 7 | `tests/unit/CitasAdmin.agenda.test.jsx` | avisa cuando la carga de las citas falla | `cargarDatos` descartaba el `error`: un fallo de red se veía igual que un día sin citas. | **Alta** | 2026-11-11 | pendiente | Corregido |
| 8 | `tests/unit/ServicesPage.test.jsx` | avisa cuando la carga de los servicios falla | La página vaciaba la lista sin avisar: un fallo de red se veía igual que una barbería sin catálogo. | **Alta** | 2026-11-11 | pendiente | Corregido |
| 9 | `tests/unit/ProductosPage.test.jsx` | avisa cuando la carga de los productos falla | Igual que el #8, en `ProductosPage`. | **Alta** | 2026-11-11 | pendiente | Corregido |
| 10 | `tests/unit/BookingPage.test.jsx` | avisa con un mensaje cuando falta un campo obligatorio | Los campos del paso 3 no están en un `<form>`: el `required` no aplicaba y el botón de confirmar quedaba **bloqueado sin decir por qué**. Ahora valida y avisa **por campo**. | Media | 2026-11-11 | pendiente | Corregido |
| 11 | `tests/unit/BookingPage.test.jsx` | no deja confirmar con un teléfono de formato inválido | No había validación de formato: se aceptaba `123` y la cita quedaba con un número inservible para WhatsApp. Ahora usa `validarTelefono`. | Media | 2026-11-11 | pendiente | Corregido |
| 12 | `tests/unit/CitaManualForm.test.jsx` | avisa con un mensaje cuando falta un campo obligatorio | El navegador bloqueaba el envío con su propio mensaje y la aplicación no decía nada. Ahora el formulario lleva `noValidate` y avisa por campo. | Media | 2026-11-11 | pendiente | Corregido |
| 13 | `tests/unit/CitaManualForm.test.jsx` | no deja crear una cita con un teléfono de formato inválido | Igual que el #11, en el modal de cita manual. | Media | 2026-11-11 | pendiente | Corregido |
| 14 | `tests/unit/BarberiaForm.test.jsx` | el texto de ayuda del slug enseña el dominio base real | El texto tenía el dominio antiguo escrito a mano (`tusoftware.com`). Ahora sale de `VITE_DOMINIO_BASE`, el mismo que usa `BarberiasSuper`. | Media | 2026-11-11 | pendiente | Corregido |
| 15 | `tests/unit/BarberosAdmin.test.jsx` | la pestaña de los que no están disponibles se etiqueta bien | La etiqueta se armaba con `No dispo${disponibles}s` y salía **«No dispo1s (1)»**. | Media | 2026-11-11 | pendiente | Corregido |
| 16 | `tests/unit/ServicesPage.test.jsx` | la duración se muestra con su unidad, como en la portada | La página imprimía `duracion` tal cual («30»); ahora usa `formatoDuracion` («30 min»), igual que la portada. | Baja | 2026-11-11 | pendiente | Corregido |
| 17 | `tests/unit/ProductosPage.test.jsx` | se puede filtrar por la categoría de cualquier producto | Las categorías del filtro estaban **escritas a mano**: un producto de otra categoría no se podía filtrar. Ahora salen de los datos reales. | Media | 2026-11-11 | pendiente | Corregido |
| 18 | `tests/unit/ServicioForm.test.jsx` | la edición acota la escritura a la barbería | El `update` solo llevaba `.eq('id')`. Ahora lleva también `.eq('barberia_id', barberiaId)` (defensa en profundidad; la RLS ya lo impedía). | Media | 2026-11-11 | pendiente | Corregido |
| 19 | `tests/unit/ProductoForm.test.jsx` | la edición acota la escritura a la barbería | Igual que el #18, en `ProductoForm`. | Media | 2026-11-11 | pendiente | Corregido |
| 20 | `tests/unit/BarberoForm.test.jsx` | la edición acota la escritura a la barbería | Igual que el #18, en `BarberoForm`. | Media | 2026-11-11 | pendiente | Corregido |
| 24 | `tests/unit/ProductoForm.test.jsx` | el formulario deja cambiar las unidades que hay en stock | `productos.stock` se mostraba en el panel pero **no se podía editar**: solo por SQL. Ahora `ProductoForm` tiene su campo «Unidades en stock», con validación de **entero mayor o igual que 0** (`validarEnteroNoNegativo` en `src/utils/validaciones.js`) y un aviso visible por campo. F-10 dice «el stock se edita desde el panel y se refleja en la disponibilidad»: el criterio **ya se cumple**. | Media | 2026-11-11 | pendiente | Corregido |
| 23 | `tests/unit/BarberosAdmin.test.jsx` | las cifras del panel salen de datos reales, sin capacidades inventadas | `CAPACIDAD_SLOTS_ESTIMADA = 8` era un dato de ejemplo que se mostraba como si fuera la agenda real: la tarjeta «Capacidad operativa» («16 slots ocupados») y la barra de cada barbero («2 de 8 slots») eran ficción. Ahora la tercera tarjeta dice **cuántas citas hay hoy** (dato real, con los barberos que las tienen) y las barras son **relativas** al barbero más ocupado del día: no queda ninguna cifra hardcodeada. | Media | 2026-11-11 | pendiente | Corregido |
| 22 | `tests/unit/ProductosAdmin.test.jsx` | el botón Ver abre el detalle del producto | El botón «Ver» de la tabla **no tenía `onClick`**: no abría nada. Ahora abre el mismo `ProductoForm` en modo detalle (`soloLectura`), como `ServiciosAdmin`. El `it.fails` se sustituyó por un test que comprueba que **ningún botón visible de la fila se queda sin acción**. | Media | 2026-11-11 | pendiente | Corregido |
| 21 | `tests/unit/CitaManualForm.edicion.test.jsx` | la reprogramación acota la escritura a la barbería | Igual que el #18, en el modal de cita manual en modo edición. | Media | 2026-11-11 | pendiente | Corregido |
| 30 | `tests/unit/ResumenPage.test.jsx` | las cuatro tarjetas del resumen salen de los datos reales | `METRICAS_EJEMPLO` pintaba datos inventados: «12 citas» cuando no había ninguna, «+12 %» de variación (no hay serie histórica con la que calcularla), «3 por confirmar» fijos y el equipo como «4 de 6» con un total inventado. Ahora cada cifra sale de la barbería activa (filtrada por `barberia_id`) y, sin datos, son 0. | **Alta** | 2026-11-11 | pendiente | Corregido |
| 31 | `tests/unit/ResumenPage.test.jsx` | el inventario muestra el stock real de cada producto | `STOCK_EJEMPLO` **pisaba** el `stock` real de los productos (`productosParaTabla`): el panel mostraba el stock del ejemplo, no el de la base. Además el badge pintaba el mismo texto en los dos casos. Ahora salen los productos reales, ordenados por stock ascendente, con su stock y su precio reales. | **Alta** | 2026-11-11 | pendiente | Corregido |
| 32 | `tests/unit/ResumenPage.test.jsx` | el encabezado usa el nombre real de la barbería | El eyebrow decía «Sede Central Atelier · Turno Matutino», un sitio y un turno que no existen. Ahora sale de `configuracion.nombre` (con `barberias.nombre` como respaldo si esa barbería no tiene fila). | Media | 2026-11-11 | pendiente | Corregido |
| 33 | `tests/unit/ResumenPage.test.jsx` | los dos botones del encabezado hacen algo | «Ver Calendario Completo» y «+ Nueva Cita Rápida» no tenían `onClick`. Ahora el primero lleva a `/admin/citas` y el segundo abre `CitaManualForm` con el catálogo y el equipo reales. | Media | 2026-11-11 | pendiente | Corregido |
| 34 | `tests/unit/ResumenPage.test.jsx` | avisa cuando la carga del resumen falla | `cargarDatos()` descartaba el `error` de sus cuatro consultas: un fallo de red se veía igual que un salón sin datos (con las tarjetas en 0). Ahora avisa con `role="alert"` y botón «Reintentar», y **no** muestra las cifras mientras la carga falla. | **Alta** | 2026-11-11 | pendiente | Corregido |
| 35 | `tests/unit/BarberosAdmin.test.jsx` | la disponibilidad trata un valor nulo como disponible | `barbers.disponible` es nullable con default `true` y el resto de la app usa `?? true` (lo hace `BarberoForm`), pero el panel contaba con `filter((b) => b.disponible)`: un barbero con `NULL` salía **en pausa** en un sitio y **disponible** en otro. Ahora los dos paneles usan `estaDisponible()` (`src/utils/resumen.js`). | Media | 2026-11-11 | pendiente | Corregido |
| 36 | `tests/unit/BarberosAdmin.test.jsx` | el buscador no promete lo que no busca | El placeholder decía «Buscar por nombre, especialidad o sillón...», pero la búsqueda solo mira `nombre` y `especialidad` (`sillon_numero`/`sillon_nombre` no los usa nadie). Ahora dice «Buscar por nombre o especialidad...». | Baja | 2026-11-11 | pendiente | Corregido |

⚠ Las filas 30-36 **no venían de un `it.fails`**: las detectaron las pruebas
**nuevas** de este grupo (el resumen) y de la revisión de los paneles
vecinos, y se corrigieron en el mismo grupo. Se listan aquí para que quede
constancia del antes y del después.

---

## Retiradas (3)

Casos que se retiran de la suite **porque su F-xx no los promete**: no son
incumplimientos de la matriz, sino mejoras deseables. Se conservan aqui para
que quede constancia de la decision.

| # | Archivo | Caso retirado | Por que se retira | Fecha |
|---|---|---|---|---|
| R1 | `tests/unit/CitasAdmin.filtros.test.jsx` | permite buscar una cita por el nombre del cliente | **No esta prometido en F-08**: el criterio dice «ver las citas del dia con hora en 24 h, cliente, servicio, barbero y estado», no un buscador. Era una mejora deseable, no un incumplimiento. | 2026-11-11 |
| R2 | `tests/unit/ProductosAdmin.test.jsx` | la tabla muestra la ultima venta de cada producto | **No esta prometido en F-10**: el criterio habla de crear productos, de que aparezcan en el catalogo publico y de editar el stock. No menciona ninguna venta. | 2026-11-11 |
| R3 | `tests/unit/BarberiaForm.test.jsx` | el correo invalido lo avisa la aplicacion, no el navegador | **No esta prometido en F-16**: el criterio habla del nombre, el slug y la cuenta del dueno, no del formato del correo. | 2026-11-11 |

## Abiertas (3)

Cada fila dice si el criterio de aceptación de su F-xx **promete** lo que el
test exige. Las que no lo prometen son **candidatas a borrarse**: el test
documenta una mejora deseable, no un incumplimiento de la matriz.

| # | Archivo | Caso | Qué falla hoy | Severidad | Fecha | Commit | ¿Lo promete el criterio de su F-xx? |
|---|---|---|---|---|---|---|---|
| 22 | `tests/unit/CitasAdmin.agenda.test.jsx` | muestra la hora de la cita en formato de 24 horas | La columna `citas.hora` **sí** guarda 24 h (`'09:00:00'`), pero el panel la pinta con `formatearHora` → 12 h con AM/PM («9:00 AM»). | Baja | 2026-11-10 | | **Sí** — F-08 dice «con hora en 24 h». El dato cumple; lo que se ve, no. Hay que decidir si se cambia el criterio o la pantalla. |
| 28 | `tests/unit/Contacto.test.jsx` | cada sede muestra su nombre, dirección, horarios y teléfono | Las dos sedes están como **placeholders vacíos** en el propio componente: la pantalla no dice dónde está el salón. | Media | 2026-11-11 | | **Sí** — F-04 dice «se muestran las sedes con nombre, dirección, horario, teléfono». Falta el dato (no el código). |
| 29 | `tests/unit/Contacto.test.jsx` | el mapa no pide una búsqueda con la cadena vacía | Los `<iframe>` piden `?q=&output=embed`: el mapa no muestra la ubicación real. | Media | 2026-11-11 | | **Sí** — F-04 dice «y su ubicación en el mapa». |

### Candidatas a borrar: ya decididas

Las 5 candidatas que quedaban se han resuelto: **3 se retiran** (R1, R2 y R3 de la
tabla de arriba) porque no estaban prometidas en el criterio de su F-xx, y las
otras 2 se corrigen en codigo:

| Caso | Decision |
|---|---|
| `ProductosAdmin` · el boton «Ver» | **Corregido**: ahora abre el detalle (fila 22 de «Corregidas») |
| `BarberosAdmin` · la capacidad con 8 slots inventados | **Corregido**: la cifra sale de datos reales (fila 23 de «Corregidas») |

tocar» (Contacto, hora 12/24 h, buscador de citas y «última venta») y las de
`CAPACIDAD_SLOTS_ESTIMADA` y el campo de stock siguen como están.

### Lo que queda prometido y sin cumplir

Estas **si** incumplen el criterio de aceptacion de su F-xx, asi que no son
candidatas a borrar: son deuda real de la matriz.

| # | Caso | F-xx | Que falta |
|---|---|---|---|
| 22 | La hora se muestra en 12 h | F-08 | «con hora en 24 h». **En espera de decision**: el criterio dice 24 h y la pantalla dice 12 h; hay que decidir si se cambia el criterio o la pantalla. |
| 27 | Las sedes no muestran sus datos | F-04 | «nombre, direccion, horario, telefono». Falta el dato: **`configuracion` no tiene esas columnas** (solo `nombre`, `estado`, `municipio`, `logo`, `descripcion`). Ver el informe de la decision 5. |
| 29 | El mapa pide una cadena vacia | F-04 | «su ubicacion en el mapa». Depende del mismo dato: con `mapQuery` vacio, el `<iframe>` busca `?q=`. |
| 30 | La cuarta tarjeta del resumen no puede ser la «ocupacion» | F-08 | F-08 dice «las cuatro tarjetas de resumen muestran citas, barberos, **ocupacion** y recordatorios». Las cuatro tarjetas ya salen de datos reales (§9.2 de AGENTS.md), pero la **ocupacion no es calculable**: el salon **no tiene modelo de horarios/slots** (§18.6), asi que cualquier porcentaje seria tan inventado como la capacidad fija de 8 que se quito de `BarberosAdmin` (§18.34). Los **recordatorios** si son calculables (son marcas por cita), pero son de otra pantalla: `CitasAdmin`. |
