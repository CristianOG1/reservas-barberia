# Verificar que `schema.sql` reconstruye la base

Esta guía explica cómo comprobar, en un entorno **que no sea producción**, que
`database/schema.sql` + `database/seed.sql` reconstruyen una base equivalente a
la de producción.

> ⚠ **Nunca** ejecutes estos scripts contra el proyecto real: `schema.sql` hace
> `DROP POLICY IF EXISTS`, `DROP CONSTRAINT IF EXISTS` y `CREATE OR REPLACE`.
> Sobre una base con datos puede alterar el comportamiento. Usa siempre un
> proyecto vacío o una base local.

---

## Ruta A · Proyecto de pruebas en Supabase (recomendada)

Es la ruta con **fidelidad exacta**: mismo motor, mismo `auth`, mismo `storage`,
mismas extensiones (`pg_cron`, `pg_net`, `supabase_vault`).

### 1. Crear el proyecto

Dashboard de Supabase → **New project** → nombre `barberweb-prueba` → una región
cercana → una contraseña fuerte (solo la del panel). Anota el **Project URL** y
la **service_role key** del panel *API Keys*.

### 2. Aplicar los scripts

**Opción A — SQL Editor (sin instalar nada):**
1. Abre el **SQL Editor** del proyecto nuevo.
2. Copia **todo** `database/schema.sql` y pulsa **Run**. Debe salir verde.
3. Copia **todo** `database/seed.sql` y pulsa **Run**. Debe salir verde.
4. Si `schema.sql` falla, el script va **en una sola transacción**: no queda
   nada a medias. Corrige y vuelve a ejecutar desde el principio.

**Opción B — `psql` desde tu máquina:**

```bash
# Conexión directa (Supabase → Project Settings → Database → Connection string)
psql "postgresql://postgres:<PASSWORD>@db.<REF>.supabase.co:5432/postgres" \
     -v ON_ERROR_STOP=1 -f database/schema.sql

psql "postgresql://postgres:<PASSWORD>@db.<REF>.supabase.co:5432/postgres" \
     -v ON_ERROR_STOP=1 -f database/seed.sql
```

`-v ON_ERROR_STOP=1` hace que `psql` se detenga en el primer error en vez de
seguir. Sin eso, `psql` **continúa** y el error pasa desapercibido.

> La contraseña de la conexión directa es la del **panel**, no la de la base de
> datos; en el dashboard la encuentras en *Settings → Database*.

### 3. Configurar el entorno

```bash
cp .env.example .env
```

Y en `.env`:

```
VITE_SUPABASE_URL=https://<REF-DEL-PROYECTO-NUEVO>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<clave publicable del proyecto nuevo>
VITE_BARBERIA_SLUG=kromatik
VITE_DOMINIO_BASE=gools.com.mx
```

```bash
pnpm install
pnpm dev
```

### 4. Comprobar los secretos de Vault (opcional)

Si quieres probar el envío automático, crea en Supabase Vault → **Secrets**:

| Nombre | Valor |
|---|---|
| `project_url` | `https://<REF>.supabase.co` |
| `cron_secret` | una cadena aleatoria larga |
| `recordatorios_secreto` | la misma cadena que uses en la Edge Function |
| `resend_api_key` | tu clave de Resend |

`schema.sql` programa los dos cron **solo si** `project_url` y `cron_secret`
existen; si no, avisa con un `NOTICE` y sigue.

---

## Ruta B · Stack local con Supabase CLI

Requiere **Docker Desktop corriendo**. En esta máquina el daemon no estaba
levantado cuando se escribió esta guía.

```bash
npx supabase start
# espera a que levante el stack y muestra la URL local
```

Luego, en otra terminal:

```bash
# La base local corre en el puerto 54322 de Docker
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
     -v ON_ERROR_STOP=1 -f database/schema.sql

psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
     -v ON_ERROR_STOP=1 -f database/seed.sql
```

Ventaja: `npx supabase db reset` recrea la base local desde cero en segundos, así
que puedes iterar sobre los scripts sin tocar ningún proyecto en la nube.

---

## Ruta C · Programar las tareas automáticas (opcional)

Las dos tareas programadas disparan las Edge Functions cada hora:

| Tarea | Horario | Edge Function |
|---|---|---|
| `enviar-recordatorios-cada-hora` | `0 * * * *` | `enviar-recordatorios` (correo, H-24 y H-2) |
| `enviar-whatsapp-cada-hora` | `10 * * * *` | `enviar-whatsapp` (WhatsApp) |

**Por qué no van en `schema.sql`:** dependen de dos secretos que solo existen en
un proyecto ya configurado (Supabase Vault) y de que las Edge Functions estén
desplegadas. Si estiverem dentro del script, un proyecto recién creado fallaría
al ejecutarlo. Se ejecutan **a mano, una vez, después** de crear los secretos.

### 1. Crear los secretos en Supabase Vault

Dashboard → **Project Settings → Vault → Secrets → New secret**:

| Nombre | Valor |
|---|---|
| `project_url` | `https://<REF>.supabase.co` |
| `cron_secret` | una cadena aleatoria larga (mismo valor en las dos funciones) |

> Si además quieres probar el envío real, añade `resend_api_key` (la clave de
> Resend) y `recordatorios_secreto` (el mismo valor que `cron_secret`).

### 2. Ejecutar este SQL

```sql
do $cron$
begin
  if exists (select 1 from vault.decrypted_secrets where name = 'project_url')
     and exists (select 1 from vault.decrypted_secrets where name = 'cron_secret')
  then
    perform cron.unschedule('enviar-recordatorios-cada-hora');
    perform cron.schedule('enviar-recordatorios-cada-hora', '0 * * * *', $cmd$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
               || '/functions/v1/enviar-recordatorios',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      );
    $cmd$);

    perform cron.unschedule('enviar-whatsapp-cada-hora');
    perform cron.schedule('enviar-whatsapp-cada-hora', '10 * * * *', $cmd$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
               || '/functions/v1/enviar-whatsapp',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      );
    $cmd$);
  else
    raise notice 'Vault sin project_url/cron_secret: no se programaron las tareas automaticas.';
  end if;
end $cron$;
```

> ⚠ **Los delimitadores dollar NO pueden ser los dos `$$`.** PostgreSQL no
> anida dollar-quotes: el primer `$$` que aparece cierra el bloque. Por eso el
> bloque `DO` exterior usa `$cron$` y el cuerpo de cada `cron.schedule` usa
> `$cmd$`. Si se sustituye uno por `$$`, el `DO` se cierra antes de tiempo y el
> resto del SQL queda fuera de contexto.

### 3. Comprobar que quedaron programadas

```sql
select jobname, schedule, active from cron.job order by jobid;
```

Deben aparecer las dos tareas con `active = true`. Para probarlas de inmediato:

```sql
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
         || '/functions/v1/enviar-recordatorios',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 60000
);
```

La respuesta no es inmediata: `pg_net` encola y se lee unos segundos después en
`select status_code, content from net._http_response order by id desc limit 1;`.

### 4. Desprogramarlas (si hace falta)

```sql
select cron.unschedule('enviar-recordatorios-cada-hora');
select cron.unschedule('enviar-whatsapp-cada-hora');
```

---

## Cómo comprobar que el resultado es equivalente a producción

Ejecuta estas consultas **en el proyecto nuevo** y compara el resultado con las
mismas consultas en producción.

### A. Tablas, columnas y nulabilidad

```sql
select table_name, ordinal_position, column_name, data_type, udt_name,
       is_nullable, coalesce(column_default,'') as default
  from information_schema.columns
 where table_schema='public'
   and table_name in ('barberias','barberos','citas','configuracion',
                      'membresias','perfiles','productos','servicios')
 order by table_name, ordinal_position;
```

### B. Claves foráneas y restricciones

```sql
select rel.relname as tabla, con.conname, con.contype,
       pg_get_constraintdef(con.oid) as definicion
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace n on n.oid = rel.relnamespace
 where n.nspname='public' and rel.relkind='r'
 order by rel.relname, con.contype, con.conname;
```

### C. Índices

```sql
select tablename, indexname, indexdef
  from pg_indexes where schemaname='public'
 order by tablename, indexname;
```

### D. Políticas RLS

```sql
select tablename, policyname, cmd, array_to_string(roles,',') as roles,
       coalesce(qual,'') as using, coalesce(with_check,'') as check
  from pg_policies where schemaname='public'
 order by tablename, policyname;
```

### E. Funciones y sus permisos (lo más importante)

```sql
select p.proname,
       pg_get_function_identity_arguments(p.oid) as argumentos,
       pg_get_function_result(p.oid) as devuelve,
       p.prosecdef as security_definer,
       coalesce(array_to_string(p.proacl,','),'(default)') as permisos
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname='public'
 order by p.proname, p.pronargs;
```

**Lo que hay que comprobar aquí** es que ninguna RPC de recordatorios tenga
`anon` ni `authenticated` en `permisos`. Si aparece `anon=X/postgres` en
`recordatorios_citas_pendientes` o en `reclamar_recordatorios`, el `revoke` de la
sección 10 no se aplicó y la función queda llamable desde el navegador con la
clave publicable.

### F. RLS activado en las 8 tablas

```sql
select relname, relrowsecurity as rls_activo
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname='public' and relkind='r' order by relname;
```

Las 8 deben salir con `rls_activo = true`.

---

## Comprobación funcional (smoke test)

Arranca `pnpm dev` con el `.env` apuntando al proyecto nuevo y comprueba:

| # | Qué | Resultado esperado |
|---|---|---|
| 1 | `http://localhost:5173/` | Carga el hero; los grids de servicios y productos traen datos del seed |
| 2 | `/servicios` | Lista 3 servicios de `Salon Demo` y 3 de `Barberia Norte Ficticia` (el catálogo es público y RLS no filtra por subdominio — deuda #60) |
| 3 | `/agendar` sin sesión | El wizard de 3 pasos avanza; al confirmar pide iniciar sesión |
| 4 | Login `dueno@ejemplo.com` / `Demo1234!` | Entra en `/admin`; la agenda muestra las 10 citas de la primera barbería |
| 5 | Login `proveedor@ejemplo.com` / `Demo1234!` | Entra en `/superadmin`; la lista muestra las 2 barberías con sus conteos |
| 6 | Login `cliente@ejemplo.com` / `Demo1234!` | Entra en `/cliente`; ve **3 citas propias**, no las 13 |
| 7 | En `/cliente`, "Reagendar" una cita a una franja libre | La fecha y la hora cambian; la franja anterior se libera |
| 8 | En `/cliente`, "Cancelar" una cita | Pasa a `cancelada`; la franja queda libre |
| 9 | En `/admin`, "Cancelar" una cita y volver a reservar esa franja desde `/agendar` | **La reserva se permite**: el índice `citas_slot_unico` es parcial y excluye las citas canceladas |
| 10 | Doble reserva simultánea en la misma franja | La segunda falla con `23505` y la interfaz avisa «Ese horario acaba de ser tomado» |
| 11 | El admin de `Salon Demo` intenta leer datos de `Barberia Norte` | 0 filas (aislamiento por `barberia_id`) |
| 12 | `pnpm lint` y `pnpm build` | Sin errores nuevos |

### Casos límite que el seed incluye a propósito

| Caso | Dónde | Qué demuestra |
|---|---|---|
| Cita sin `cliente_id` | `d3333333…`, `d8888888…`, `d9999999…` | La reserva pública anónima existe y no aparece en `/cliente` |
| Teléfono de longitud inválida | `d4444444…` (`'12345'`) | El botón «Recordar» sale deshabilitado |
| Citas sin recordatorio enviado | `d2222222…`, `d7777777…` | El automático tiene material que enviar |
| Cita cancelada | `d6666666…` | La franja queda libre para reutilizar |
| Barbero no disponible | `Barbero Tres` | El agendamiento ofrece solo barberos disponibles |

---

## Resumen de lo que se comparó

| Objeto | Produccion | `schema.sql` corregido |
|---|---|---|
| Tablas | 8 con RLS activo | 8 con RLS activo |
| Columnas | 87 en total | reproduced con la misma nulabilidad y los mismos defaults |
| FKs | 8 | 8 (incluye `citas.cliente_id → auth.users(id) ON DELETE SET NULL`) |
| Índices | 17 | 17 (incluye `citas_slot_unico` **parcial** y `citas_recordatorios_pendientes_idx`) |
| Políticas RLS | 21 | 21, con los mismos nombres y las mismas condiciones |
| Funciones | 19 | 19, con los mismos cuerpos y los mismos permisos |
| Triggers | 1 (`trg_crear_perfil` sobre `auth.users`) | 1 |
| Storage | bucket `imagenes` (5 MB, 5 MIME) + 1 política | idéntico |
| Cron | 2 tareas | **Fuera de `schema.sql`**: se programan a mano con el SQL de la «Ruta C» de esta guía, porque dependen de secretos de Vault |

### Diferencias deliberadas (marcadas `[ENDURECIMIENTO]`)

| # | Diferencia | Por qué | ¿Cambia el comportamiento? |
|---|---|---|---|
| 1 | `barberia_del_usuario()` filtra por `rol = 'admin'` | Cierra la deuda #59: en producción, cualquier perfil con `barberia_id` ganaba escritura | **No.** Solo los `admin` tienen `barberia_id`; los clientes lo tienen en `NULL` y el superadmin también |
| 2 | Se añade el `CHECK` `citas_estado_valido` | Cierra la deuda #37: un `estado = 'Pendiente'` con mayúscula dejaba la cita sin botones y la RPC de cancelar la rechazaba | **No.** Solo rechaza estados mal escritos que hoy nadie genera desde la app |
| 3 | Se añade el `CHECK` `citas_hora_valida` | Guarda mínima, `hora` ya es `NOT NULL` | **No** |

Las tres se pueden revertir commenting el bloque marcado en `schema.sql` si se
necesita **paridad exacta** con producción.
