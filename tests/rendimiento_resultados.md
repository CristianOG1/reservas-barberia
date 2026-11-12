# Resultados de rendimiento · BarberWeb

Fecha: 2026-11-11
Proyecto de pruebas: https://xdmfsyreebqjxscmehrs.supabase.co (Supabase, plan gratuito)
Volumen de datos: ~5 000 citas repartidas en 3 barberías de prueba (prefijo `int_`),
generadas con `tests/rendimiento/generar_datos.js`.

---

## 1. Consultas críticas (mediana de 12 corridas cada una)

Umbral: mediana < 2000 ms. Todas las consultas están dentro del umbral.

| Consulta | n | mediana (ms) | min (ms) | max (ms) | p95 (ms) | Estado |
|---|---|---|---|---|---|---|
| Listado de citas de una barbería (`citas_por_barberia`) | 12 | 348 | 342 | 1189 | 1189 | OK |
| RPC `horas_ocupadas` | 12 | 113 | 104 | 139 | 139 | OK |
| RPC `superadmin_resumen_barberias` | 12 | 117 | 110 | 160 | 160 | OK |

Observación: las tres consultas responden bien por debajo del umbral. La más lenta es el listado
de citas de una barbería (348 ms mediana), que es la que `CitasAdmin` ejecuta al montar y que
todavía trae `select('*')` sin límite.

---

## 2. Carga concurrente (30 lecturas paralelas)

| Métrica | Valor (ms) |
|---|---|
| Lecturas concurrentes | 30 |
| Corridas totales | 30 |
| Mediana | 1731 |
| Mínimo | 1204 |
| Máximo | 2117 |
| p95 | 2077 |

Observación: con 30 lecturas concurrentes del listado de citas de una barbería, la mediana se
mantiene en 1731 ms y el p95 en 2077 ms, dentro del umbral de 2000 ms (apenas). El plan gratuito
no se saturó (ninguna corrida falló por timeout o rate limit).

---

## 3. Bundle antes / después de `React.lazy`

| Chunk | Antes (kB) | gzip antes | Después (kB) | gzip después |
|---|---|---|---|---|
| `index.js` (principal) | 718.68 | 183.97 | 641.80 | 168.95 |
| `BookingPage.js` | — | — | 26.65 | 5.98 |
| `CitasAdmin.js` | — | — | 35.65 | 8.46 |
| `SuperadminDashboard.js` | — | — | 7.12 | 1.82 |

El chunk principal bajó de 718.68 kB a 641.80 kB (**‑76.88 kB, ~10.7 % menos**). Las tres rutas
más pesadas se descargan bajo demanda.

---

## 4. Próximo paso

Ejecutar los comandos `EXPLAIN (ANALYZE, BUFFERS)` de `docs/optimizaciones.md` en el SQL Editor
de Supabase (proyecto de pruebas) y compartir los planes de ejecución para decidir si se crea
un índice compuesto en `citas(barberia_id, fecha, hora)` o se reducen columnas de la consulta
de `CitasAdmin`. Regla: si el plan ya usa un índice adecuado, no se crea otro.
