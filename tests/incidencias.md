# Incidencias detectadas por las pruebas

Este archivo recoge **todos** los casos marcados con `it.fails` en la suite:
tests que describen un comportamiento que la aplicación **no** cumple hoy.
Ningún `it.fails` es un test decorativo: cada uno falla por una razón
concreta, explicada en el propio test (comentario) y resumida aquí.

- **30 `it.fails`** en 19 archivos de prueba.
- Con `pnpm test` salen como `expected fail`: el test falla, y Vitest lo cuenta
  como el resultado esperado. Si alguno pasara, Vitest marcaría **el error**
  (`FIXED, good job`), que es la forma de saber que una incidencia se cerró.
- **No se ha modificado `src/`** para arreglarlas: los bloques de pruebas solo
  añaden tests.

## Columnas

| Columna | Qué significa |
|---|---|
| **Fecha** | Día en que la prueba detectó la incidencia. |
| **Commit de corrección** | Commit que la arregla. **Vacía** mientras no se corrija: hasta entonces, el caso sigue en rojo. |

## Cómo se mide la severidad

| Severidad | Qué significa |
|---|---|
| **Alta** | La aplicación muestra un estado **falso** como si fuera verdad (un catálogo, una agenda o una lista vacíos cuando lo que pasó es un fallo de red). Alguien puede tomar decisiones sobre datos que no existen. |
| **Media** | La aplicación falla **en silencio** (no avisa de un error de escritura), o enseña un dato inventado, o un texto roto, o una consulta que no lleva el mismo acotado que sus hermanas. |
| **Baja** | Falta una validación o una comodidad, o hay una discrepancia entre lo que dice un criterio y lo que se ve. No rompe el flujo. |

## Tabla completa

| # | Archivo | Caso | Qué falla hoy | Severidad | Fecha | Commit de corrección |
|---|---|---|---|---|---|---|
| 1 | `tests/unit/BookingPage.test.jsx` | avisa con un mensaje cuando falta un campo obligatorio | El formulario público de reserva no tiene ningún mensaje propio: solo marca `required` en los inputs y el único texto de error es el genérico de fallo. | Media | 2026-11-10 | |
| 2 | `tests/unit/BookingPage.test.jsx` | no deja confirmar con un teléfono de formato inválido | No hay validación de formato del teléfono. Se puede reservar con `123` y la cita queda con un número inservible para los recordatorios por WhatsApp. | Media | 2026-11-10 | |
| 3 | `tests/unit/CitaManualForm.test.jsx` | avisa con un mensaje cuando falta un campo obligatorio | Igual que el #1, pero en el modal de cita manual del panel. | Media | 2026-11-10 | |
| 4 | `tests/unit/CitaManualForm.test.jsx` | no deja crear una cita con un teléfono de formato inválido | Igual que el #2, pero en el modal del panel. La validación de formato **sí** existe al enviar por WhatsApp (`telefonoParaWhatsApp`), solo que no al capturar. | Media | 2026-11-10 | |
| 5 | `tests/unit/CitasAdmin.agenda.test.jsx` | muestra la hora de la cita en formato de 24 horas | **Discrepancia con la matriz v3.** F-08 dice «con hora en 24 h». La columna `citas.hora` **sí** guarda 24 h (`'09:00:00'`), pero el panel la pinta con `formatearHora` → 12 h con AM/PM («9:00 AM»). El dato cumple el criterio; lo que se ve, no. Hay que decidir si se cambia el criterio o la pantalla. | Baja | 2026-11-10 | |
| 6 | `tests/unit/CitasAdmin.agenda.test.jsx` | avisa cuando la carga de las citas falla | `cargarDatos` no revisa el `error`: hace `setCitas(citasRes.data \|\| [])`. Un fallo de red se ve **exactamente igual** que un día sin citas. | **Alta** | 2026-11-10 | |
| 7 | `tests/unit/CitasAdmin.filtros.test.jsx` | permite buscar una cita por el nombre del cliente | `CitasAdmin` **no tiene buscador**: solo filtro por estado y por barbero (los catálogos de servicios y productos sí lo tienen). | Baja | 2026-11-10 | |
| 8 | `tests/unit/ServiciosAdmin.test.jsx` | avisa cuando la carga de los servicios falla | `cargarServicios` no revisa el `error`: un fallo de red se ve igual que una carta vacía («Aún no hay servicios en el catálogo»). | **Alta** | 2026-11-10 | |
| 9 | `tests/unit/ServiciosAdmin.test.jsx` | avisa cuando el borrado de un servicio falla | `handleEliminar` descarta el `error` del `delete`: nunca se dice que el borrado falló. | Media | 2026-11-10 | |
| 10 | `tests/unit/ServicioForm.test.jsx` | la edición acota la escritura a la barbería | El alta mete `barberia_id` en el `insert` y el listado borra con `.eq('id').eq('barberia_id')`, pero la **edición solo filtra por `.eq('id')`**. La RLS lo impide de todos modos (`Admin escribe`), así que **no es una fuga de datos**: es que la consulta no lleva el mismo acotado que el resto de escrituras. | Media | 2026-11-10 | |
| 11 | `tests/unit/ProductosAdmin.test.jsx` | el botón Ver abre el detalle del producto | El botón «Ver» de la tabla **no tiene `onClick`**: no abre nada. En `ServiciosAdmin` ese mismo botón abre el formulario en modo detalle; aquí es un control muerto. | Media | 2026-11-10 | |
| 12 | `tests/unit/ProductosAdmin.test.jsx` | la tabla muestra la última venta de cada producto | La columna «Última venta» está implementada con un guion fijo («—»): no hay ningún dato de ventas en el modelo, así que la columna no dice nada y se presenta como si fuera información. | Baja | 2026-11-10 | |
| 13 | `tests/unit/ProductosAdmin.test.jsx` | avisa cuando la carga de los productos falla | Igual que el #8, pero en `ProductosAdmin`. | **Alta** | 2026-11-10 | |
| 14 | `tests/unit/ProductosAdmin.test.jsx` | avisa cuando el borrado de un producto falla | Igual que el #9, pero en `ProductosAdmin`. | Media | 2026-11-10 | |
| 15 | `tests/unit/ProductoForm.test.jsx` | la edición acota la escritura a la barbería | Igual que el #10, pero en `ProductoForm`. | Media | 2026-11-10 | |
| 16 | `tests/unit/ProductoForm.test.jsx` | el formulario deja cambiar las unidades que hay en stock | `productos.stock` existe en la base y el panel lo muestra (hasta avisa de que hay que reponer), pero el **formulario no tiene campo para cambiarlo**: el stock solo se puede tocar por SQL. | Media | 2026-11-10 | |
| 17 | `tests/unit/BarberosAdmin.test.jsx` | la pestaña de los que no están disponibles se etiqueta bien | La etiqueta se arma con `No dispo${disponibles}s`: mete el número de **disponibles** en mitad de la palabra. Con 1 disponible en pantalla sale **«No dispo1s (1)»**. | Media | 2026-11-10 | |
| 18 | `tests/unit/BarberosAdmin.test.jsx` | la capacidad operativa no sale de un número de slots inventado | `CAPACIDAD_SLOTS_ESTIMADA = 8` es un dato de ejemplo (lo dice el propio código). La tarjeta «Capacidad operativa» y la barra «Citas para hoy» lo muestran como si fuera la agenda real: el porcentaje que ve el barbero es ficción. | Media | 2026-11-10 | |
| 19 | `tests/unit/BarberosAdmin.test.jsx` | avisa cuando la carga del equipo falla | Igual que el #8, pero en `BarberosAdmin`. | **Alta** | 2026-11-10 | |
| 20 | `tests/unit/BarberosAdmin.test.jsx` | avisa cuando el borrado de un barbero falla | Igual que el #9, pero en `BarberosAdmin`. | Media | 2026-11-10 | |
| 21 | `tests/unit/BarberoForm.test.jsx` | la edición acota la escritura a la barbería | Igual que el #10, pero en `BarberoForm`. | Media | 2026-11-10 | |
| 22 | `tests/unit/CitaManualForm.edicion.test.jsx` | la reprogramación acota la escritura a la barbería | Igual que el #10, pero en el modal de cita manual en modo edición («Reprogramar»). | Media | 2026-11-10 | |
| 23 | `tests/unit/BarberiaForm.test.jsx` | el texto de ayuda del slug enseña el dominio base real | El texto de ayuda tiene el dominio **antiguo** escrito a mano (`https://<slug>.tusoftware.com`), pero el dominio del software es hoy `VITE_DOMINIO_BASE` (`gools.com.mx`). El superadmin lee una dirección que no existe. | Media | 2026-11-11 | |
| 24 | `tests/unit/BarberiaForm.test.jsx` | el correo inválido lo avisa la aplicación, no el navegador | El campo de correo es `type="email"` con `required`: cuando el correo no tiene forma de correo, el navegador **vacía el campo** y bloquea el envío por sí mismo, así que el aviso en español de la aplicación («Escribe un correo válido para el dueño») nunca llega a verse. | Baja | 2026-11-11 | |
| 25 | `tests/unit/ServicesPage.test.jsx` | avisa cuando la carga de los servicios falla | `cargarServicios` revisa el `error` pero solo vacía la lista: un fallo de red se ve **exactamente igual** que una barbería sin catálogo, y no hay ni mensaje ni botón de reintento (a diferencia de la portada, que sí los tiene). | **Alta** | 2026-11-11 | |
| 26 | `tests/unit/ServicesPage.test.jsx` | la duración se muestra con su unidad, como en la portada | La página imprime `servicio.duracion` tal cual: un servicio guardado como `'30'` se ve como «30» (sin «min») mientras que en la portada el mismo servicio sale como «30 min». La columna es TEXT y puede traer `'30'` o `'50 min'`: las dos vistas no coinciden. | Baja | 2026-11-11 | |
| 27 | `tests/unit/ProductosPage.test.jsx` | avisa cuando la carga de los productos falla | `obtenerProductos` revisa el `error` pero solo deja la lista vacía: un fallo de red se ve **exactamente igual** que un catálogo sin productos, y no hay ni mensaje ni botón de reintento. | **Alta** | 2026-11-11 | |
| 28 | `tests/unit/ProductosPage.test.jsx` | se puede filtrar por la categoría de cualquier producto | Las categorías del filtro están escritas a mano en el componente ('Todos', 'Cabello', 'Barba', 'Cuidado Personal', 'Accesorios'). Un producto cuya categoría no esté en esa lista (p. ej. 'Estilizado') no se puede filtrar: solo aparece en «Todos». | Media | 2026-11-11 | |
| 29 | `tests/unit/Contacto.test.jsx` | cada sede muestra su nombre, dirección, horarios y teléfono | Los datos de las dos sedes están como **placeholders vacíos** en el propio componente (`nombre: ''`, `direccion: ''`, `horarios: ['']`, `telefono: ''`). La pantalla se ve montada pero no dice dónde está el salón. Es el caso CP-04-01, «Pendiente» en la matriz. | Media | 2026-11-11 | |
| 30 | `tests/unit/Contacto.test.jsx` | el mapa no pide una búsqueda con la cadena vacía | Los `<iframe>` piden `?q=&output=embed`, es decir una búsqueda con la cadena vacía, así que el mapa no muestra la ubicación real de la sede. Es el caso CP-04-02, que la matriz da por **fallido**. | Media | 2026-11-11 | |

## Patrones que se repiten

**Seis pantallas que no revisan el error de la carga** (#6, #8, #13, #19, #25, #27):
`ServiciosAdmin`, `ProductosAdmin`, `BarberosAdmin`, `CitasAdmin`, `ServicesPage` y
`ProductosPage` hacen `setX(res.data || [])` sin mirar `res.error`. Es el patrón
«A. Lecturas — el error se descarta» de `AGENTS.md` §13. Los catálogos
**públicos de la portada** (`Servicios.jsx`, `Productos.jsx`) y el portal del
cliente (`CitasCliente.jsx`) **sí** lo hacen: muestran un estado de error con
botón «Reintentar». Y `BarberiasSuper` también lo hace bien.

**Cuatro pantallas que no revisan el error del borrado** (#9, #14, #20 y el
`delete` de los tres listados): el patrón «D. Deletes» de `AGENTS.md` §13: se
usa `confirm()` nativo y el `error` del `delete` se tira.

**El teléfono no se valida al capturar** (#2 y #4): el formulario público de
reserva y el modal de cita manual aceptan cualquier cosa. La validación de
formato **sí** existe, pero solo en el momento de enviar el recordatorio por
WhatsApp (`telefonoParaWhatsApp` rechaza lo inválido y deshabilita el botón).
Es decir: la cita se guarda con un teléfono que luego no se puede usar.

**Cinco ediciones sin acotar por `barberia_id`** (#10, #15, #21, #22 y la del
`update` de `CitaManualForm`): el `insert` de los formularios y el `delete` de
los listados llevan `.eq('barberia_id', barberiaId)`; el `update` de los
formularios solo lleva `.eq('id')`. La RLS lo cubre
(`barberia_id = barberia_del_usuario()`), así que **no hay fuga de datos**: es
una inconsistencia entre las escrituras del mismo panel, que es exactamente lo
que la petición del bloque pedía comprobar.

## Qué hacer con cada una

| Severidad | Siguiente paso |
|---|---|
| **Alta** (#6, #8, #13, #19, #25, #27) | Es el mismo arreglo en seis pantallas: revisar el `error` de la carga y mostrar un estado de error con botón «Reintentar», como ya hacen la portada y el portal del cliente. |
| **Media** (#9, #10, #11, #14, #15, #16, #17, #18, #20, #21, #22, #23, #28, #29, #30 y las de teléfono) | Cada una es un arreglo pequeño y localizado. Las de «acota la escritura a la barbería» son de una línea por formulario (añadir el `.eq('barberia_id')`). |
| **Baja** (#5, #7, #12, #24, #26) | Decisión de producto: o se ajusta el criterio de la matriz, o se añade la funcionalidad, o se quita la columna que no dice nada. |
