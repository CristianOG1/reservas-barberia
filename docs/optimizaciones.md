# Optimizaciones de rendimiento

Fecha: 2026-11-11
Proyecto: BarberWeb (barbería) — pruebas contra el proyecto de **PRUEBAS** de Supabase (`xdmfsyreebqjxscmehrs`), nunca producción.

## 1. Qué se midió

Tamaño del bundle de producción (`pnpm build`) antes y después de aplicar carga diferida de rutas con `React.lazy` + `Suspense`.

**Comando:** `pnpm build` (Vite 8.3.0 + Rolldown)

## 2. Valores antes y después

| Chunk | Antes (kB) | gzip antes | Después (kB) | gzip después |
|---|---|---|---|---|
| `index.js` (principal) | 718.68 | 183.97 | 641.80 | 168.95 |
| `BookingPage.js` | — (dentro del principal) | — | 26.65 | 5.98 |
| `CitasAdmin.js` | — (dentro del principal) | — | 35.65 | 8.46 |
| `SuperadminDashboard.js` | — (dentro del principal) | — | 7.12 | 1.82 |

**Resultado:** el chunk principal pasó de 718.68 kB a 641.80 kB (**‑76.88 kB, ~10.7 % menos**). Las tres rutas más pesadas (`/agendar`, `/admin/citas`, `/superadmin`) ahora se descargan bajo demanda cuando el usuario navega a ellas.

**Archivos modificados:**
- `src/App.jsx`: importaciones estáticas de `BookingPage`, `CitasAdmin` y `SuperadminDashboard` reemplazadas por `React.lazy(() => import(...))`; el `<Routes>` envuelto en `<Suspense fallback={<p>Cargando...</p>}>`.

## 3. Próximos candidatos (pendiente de tu aprobación)

Tras revisar el resultado de `EXPLAIN (ANALYZE, BUFFERS)` que entregarás tras ejecutar el SQL del punto 4, se decidirá entre:

| Candidato | Qué se mediría | Estado |
|---|---|---|
| Índice compuesto `citas(barberia_id, fecha, hora)` | Si el plan de la consulta de CitasAdmin muestra seq scan o sort en memoria | Pendiente de tu EXPLAIN |
| Índice compuesto `citas(barberia_id, fecha)` | Si `horas_ocupadas` recorre secuencialmente `citas` | Pendiente de tu EXPLAIN |
| Reducir columnas de `CitasAdmin.cargarDatos` | Bytes transferidos: `select('*')` trae todas las columnas; podría limitarse a las que se usan | Pendiente de tu EXPLAIN |

Regla acordada: **si el plan ya usa un índice adecuado, no se crea otro.**

## 4. SQL EXPLAIN para ejecutar (proyecto de pruebas)

Obtén primero el id de una barbería de prueba:

```sql
SELECT id, nombre FROM public.barberias WHERE nombre LIKE 'int_%' LIMIT 1;
```

Luego ejecuta (reemplaza `<BARBERIA_ID>`):

```sql
-- Índices existentes sobre citas
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'citas'
  AND schemaname = 'public';

-- Consulta de CitasAdmin
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.citas
WHERE barberia_id = '<BARBERIA_ID>'
ORDER BY fecha ASC, hora ASC;

-- RPC horas_ocupadas
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.horas_ocupadas('2099-06-15', '<BARBERIA_ID>', NULL);
```

Pega el resultado en el chat y decidiré qué índice crear (si hace falta).

## 5. Decisión final sobre el índice de `citas` (2026-11-11)

**No se crea el índice compuesto `citas(barberia_id, fecha, hora)`.**

**Evidencia del plan de ejecución** (proyecto de pruebas, barbería `9b4cbd7a-…` con 1.667 citas):

```
Sort  (cost=209.65..213.82 rows=1667 width=226) (actual time=1.244..1.348 rows=1667 loops=1)
  Sort Key: fecha, hora
  Sort Method: quicksort  Memory: 370kB
  ->  Index Scan using citas_barberia_id_idx on citas
        Index Cond: (barberia_id = '9b4cbd7a-2660-4968-95ca-d30f69dadaa4'::uuid)
Execution Time: 1.498 ms
```

**Razonamiento:**
- La consulta de `CitasAdmin` ya usa `Index Scan` sobre `citas_barberia_id_idx` con `Index Cond` por `barberia_id`.
- Tiempo total: **1.498 ms** para 1.667 filas — muy por debajo de cualquier umbral razonable.
- El `quicksort` en memoria consume **370 kB**, muy por debajo del `work_mem` típico (4 MB), así que no hay spill a disco.
- Regla acordada en este documento: *"si el plan ya usa un índice adecuado, no se crear otro"*. El índice existente es adecuado.

**Conclusión:** no hay justificación estricta para añadir `citas(barberia_id, fecha, hora)`. Se descarta. Si en el futuro el volumen crece y el sort empieza a hacer spill a disco, se revisará de nuevo.

## 6. Cambios de esquema (si se aprueba un índice en el futuro)

Cualquier índice nuevo se añadirá a `database/schema.sql` y se entregará como **migración aparte en este mismo archivo** (`docs/optimizaciones.md`). **No se aplica en producción.**

## 7. Pruebas de rendimiento (ejecutadas)

Ejecutadas contra el proyecto de pruebas (`xdmfsyreebqjxscmehrs`) con ~5 000 citas cargadas por `generar_datos.js`.

**Resultado:** `tests/rendimiento_resultados.md` (consolidado), con desglose en `tests/rendimiento_resultados_consultas.md` y `tests/rendimiento_resultados_carga.md`.

| Prueba | n | mediana | min | max | p95 | Umbral | Estado |
|---|---|---|---|---|---|---|---|
| Listado de citas de una barbería | 12 | 323 ms | 170 ms | 824 ms | 824 ms | < 2000 ms | OK |
| RPC `horas_ocupadas` | 12 | 104 ms | 98 ms | 164 ms | 164 ms | < 2000 ms | OK |
| RPC `superadmin_resumen_barberias` | 12 | 105 ms | 104 ms | 114 ms | 114 ms | < 2000 ms | OK |
| Carga concurrente (30 lecturas) | 30 | 1317 ms | 717 ms | 1553 ms | 1542 ms | < 2000 ms | OK |

## 8. Bundle antes / después de `React.lazy`

| Chunk | Antes (kB) | gzip antes | Después (kB) | gzip después |
|---|---|---|---|---|
| `index.js` (principal) | 718.68 | 183.97 | 641.80 | 168.95 |
| `BookingPage.js` | — | — | 26.65 | 5.98 |
| `CitasAdmin.js` | — | — | 35.65 | 8.46 |
| `SuperadminDashboard.js` | — | — | 7.12 | 1.82 |

El chunk principal bajó de 718.68 kB a 641.80 kB (**‑76.88 kB, ~10.7 % menos**).

## 9. Cobertura de pruebas (`pnpm test:coverage`)

| Métrica | Valor | ¿≥ 70%? |
|---|---|---|
| Statements | 87.85% (1873/2132) | ✅ |
| Branches | 78.46% (1465/1867) | ✅ |
| Functions | 84.01% (510/607) | ✅ |
| Lines | 90.13% (1681/1865) | ✅ |

Se cumple el 70% requerido para el Expediente Técnico en todas las métricas.

## 10. Estado de commits

Nada se ha commiteado ni pusheado. El commit lo decide el usuario.

