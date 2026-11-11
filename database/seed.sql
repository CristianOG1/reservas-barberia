-- ============================================================================
--  BarberWeb v1.0 — Datos ficticios de ejemplo
-- ============================================================================
--  Ejecutar DESPUES de database/schema.sql:
--     psql "$DATABASE_URL" -f database/seed.sql
--
--  ⚠ TODOS LOS DATOS SON FICTICIOS.
--    - Los correos usan el dominio reservado @ejemplo.com
--    - Los nombres y telefonos son inventados
--    - Los UUID son fijos y de ejemplo
--    - Ningun nombre, correo, telefono o cita procede de la barberia piloto
--
--  El seed reproduce ademas los casos limite que se detectaron en la
--  operacion real de la barberia piloto, para que se puedan reproducir
--  en las pruebas:
--    - citas sin cliente_id (reserva publica anonima)
--    - citas con telefono de longitud invalida
--    - citas a las que nunca se les envio recordatorio
--
--  ⚠ ORDEN DE INSERCION IMPORTANTE:
--    Los usuarios de prueba van ANTES que las citas, porque `citas.cliente_id`
--    tiene clave foranea contra `auth.users(id)`. Si se invirtiera, el
--    INSERT de citas fallaria por violacion de FK.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. BARBERIAS (2)
-- ---------------------------------------------------------------------------
-- El slug 'kromatik' se conserva porque el codigo lo espera:
-- `src/App.jsx` lo usa como ejemplo de subdominio y `.env.example` lo
-- declara como VITE_BARBERIA_SLUG. El nombre COMERCIAL que ve el usuario
-- es ficticio ('Salon Demo').
insert into public.barberias (id, nombre, slug, activa, created_at, zona_horaria) values
  ('11111111-1111-1111-1111-111111111111', 'Salon Demo',              'kromatik',        true,  now() - interval '40 days', 'America/Mexico_City'),
  ('22222222-2222-2222-2222-222222222222', 'Barberia Norte Ficticia','barberia-norte',  true,  now() - interval '12 days', 'America/Mexico_City')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. CONFIGURACION (1 fila por barberia)
-- ---------------------------------------------------------------------------
-- No se indica `id`: lo asigna la secuencia (configuracion_id_seq). Asi el
-- seed es idempotente y la secuencia no se queda por detras.
insert into public.configuracion (nombre, estado, municipio, descripcion, updated_at, recordatorios_activos, whatsapp_activo, barberia_id) values
  ('Salon Demo',              'Jalisco', 'Tonalá',    'Barbería de ejemplo con catálogo de servicios y productos.', now(), true,  false, '11111111-1111-1111-1111-111111111111'),
  ('Barberia Norte Ficticia','Jalisco', 'Tlaquepaque','Segunda barbería de ejemplo, para probar el aislamiento multi-barbería.', now(), false, false, '22222222-2222-2222-2222-222222222222')
on conflict (barberia_id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. SERVICIOS (3 por barberia)
-- ---------------------------------------------------------------------------
insert into public.servicios (id, nombre, categoria, descripcion, costo, duracion, barberia_id) values
  ('a1111111-1111-1111-1111-111111111111', 'Corte de cabello',   'Cabello',   'Corte clásico con lavado.',            150.00, '30', '11111111-1111-1111-1111-111111111111'),
  ('a2222222-2222-2222-2222-222222222222', 'Corte y barba',      'Combo',     'Corte de cabello con perfilado de barba.', 240.00, '60', '11111111-1111-1111-1111-111111111111'),
  ('a3333333-3333-3333-3333-333333333333', 'Barba',              'Barba',     'Perfilado de barba con toalla caliente.',      120.00, '30', '11111111-1111-1111-1111-111111111111'),
  ('a4444444-4444-4444-4444-444444444444', 'Corte de cabello',   'Cabello',   'Corte clásico con lavado.',            150.00, '30', '22222222-2222-2222-2222-222222222222'),
  ('a5555555-5555-5555-5555-555555555555', 'Barba',              'Barba',     'Perfilado de barba.',                  120.00, '30', '22222222-2222-2222-2222-222222222222'),
  ('a6666666-6666-6666-6666-666666666666', 'Diseño de barba',    'Barba',     'Diseño de barba a medida.',             150.00, '30', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. PRODUCTOS (5 + 3)
-- ---------------------------------------------------------------------------
insert into public.productos (id, nombre, descripcion, categoria, precio, stock, barberia_id) values
  ('b1111111-1111-1111-1111-111111111111', 'Cera mate',        'Cera de acabado mate.',        'Estilizado', 180.00, 12, '11111111-1111-1111-1111-111111111111'),
  ('b2222222-2222-2222-2222-222222222222', 'Aceite para barba','Aceite nutritivo para barba.',  'Barba',      150.00,  8, '11111111-1111-1111-1111-111111111111'),
  ('b3333333-3333-3333-3333-333333333333', 'Shampoo profesional', 'Shampoo de uso diario.',     'Cabello',    120.00, 20, '11111111-1111-1111-1111-111111111111'),
  ('b4444444-4444-4444-4444-444444444444', 'Navaja de afeitar','Navaja de repuesto.',          'Accesorios', 90.00,  6, '11111111-1111-1111-1111-111111111111'),
  ('b5555555-5555-5555-5555-555555555555', 'Tónico capilar',   'Tónico activador.',            'Cabello',    160.00, 10, '11111111-1111-1111-1111-111111111111'),
  ('b6666666-6666-6666-6666-666666666666', 'Cera mate',        'Cera de acabado mate.',        'Estilizado', 180.00,  5, '22222222-2222-2222-2222-222222222222'),
  ('b7777777-7777-7777-7777-777777777777', 'Aceite para barba','Aceite nutritivo para barba.',  'Barba',      150.00,  4, '22222222-2222-2222-2222-222222222222'),
  ('b8888888-8888-8888-8888-888888888888', 'Peine de carbono', 'Peine antiestatico.',          'Accesorios', 70.00, 15, '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. BARBEROS (2 + 1)
-- ---------------------------------------------------------------------------
insert into public.barberos (id, nombre, especialidad, disponible, rating, total_resenas, sillon_numero, sillon_nombre, barberia_id) values
  ('c1111111-1111-1111-1111-111111111111', 'Barbero Uno',    'Corte clásico',  true,  4.5, 12, 1, 'Sillón 1', '11111111-1111-1111-1111-111111111111'),
  ('c2222222-2222-2222-2222-222222222222', 'Barbero Dos',    'Barba y diseño', true,  4.2,  7, 2, 'Sillón 2', '11111111-1111-1111-1111-111111111111'),
  ('c3333333-3333-3333-3333-333333333333', 'Barbero Tres',   'Corte clásico',  false, 4.0,  3, 1, 'Sillón 1', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 6. USUARIOS DE PRUEBA (uno por rol)
-- ---------------------------------------------------------------------------
-- Van ANTES que las citas: `citas.cliente_id` tiene FK contra auth.users(id).
--
-- ⚠ Si tu proyecto de Supabase no acepta estas inserciones, comenta todo
--   este bloque: el resto del seed no depende de el, salvo las filas de
--   `citas.cliente_id` y `membresias`, que referencian estos UUID.
--
--   Contraseñas de ejemplo (todas iguales): Demo1234!
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '99999999-9999-9999-9999-999999999999', 'authenticated', 'authenticated',
   'proveedor@ejemplo.com', crypt('Demo1234!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Proveedor del software"}', now(), now(), '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', '88888888-8888-8888-8888-888888888888', 'authenticated', 'authenticated',
   'dueno@ejemplo.com', crypt('Demo1234!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Dueño del salón de demostración"}', now(), now(), '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', '77777777-7777-7777-7777-777777777777', 'authenticated', 'authenticated',
   'dueno.norte@ejemplo.com', crypt('Demo1234!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Dueño de Barbería Norte"}', now(), now(), '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'cliente@ejemplo.com', crypt('Demo1234!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Cliente Ejemplo"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
from auth.users u
where u.email like '%@ejemplo.com'
on conflict do nothing;

-- 6.1 perfiles: el rol NO se manda en el registro; se nombra despues.
--     El trigger de alta inserta 'cliente' y esta sentencia lo corrige
--     para los tres usuarios de prueba.
insert into public.perfiles (id, rol, nombre, barberia_id) values
  ('99999999-9999-9999-9999-999999999999', 'superadmin', 'Proveedor del software',            NULL),
  ('88888888-8888-8888-8888-888888888888', 'admin',      'Dueño del salón de demostración',   '11111111-1111-1111-1111-111111111111'),
  ('77777777-7777-7777-7777-777777777777', 'admin',      'Dueño de Barbería Norte',           '22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333', 'cliente',    'Cliente Ejemplo',                   NULL)
on conflict (id) do update
  set rol       = excluded.rol,
      nombre    = excluded.nombre,
      barberia_id = excluded.barberia_id;

-- 6.2 membresias: el cliente pertenece a la primera barberia.
insert into public.membresias (user_id, barberia_id) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111')
on conflict (user_id, barberia_id) do nothing;

-- ---------------------------------------------------------------------------
-- 7. CITAS (10 en la primera barberia + 3 en la segunda)
--    Se incluyen a proposito los casos limite:
--      - 3 citas sin cliente_id  (reserva publica anonima)
--      - 1 cita con telefono de longitud invalida
--      - 2 citas sin recordatorio enviado
--      - 1 cita completada, 1 cancelada, 1 pendiente
-- ---------------------------------------------------------------------------
insert into public.citas (
  id, nombre, telefono, servicio, fecha, hora, estado, correo, notas, total,
  barbero_id, productos, cliente_id, recordatorio_enviado_at,
  recordatorio_24h_enviado_at, recordatorio_2h_enviado_at,
  recordatorio_wa_24h_enviado_at, recordatorio_wa_2h_enviado_at,
  barberia_id
) values
  -- citas del cliente de prueba (cliente@ejemplo.com), con recordatorio enviado
  ('d1111111-1111-1111-1111-111111111111', 'Cliente Ejemplo',   '5512345678', 'Corte de cabello', current_date + 3, '10:00', 'confirmada', 'cliente@ejemplo.com', 'Cita de prueba con recordatorio enviado.', 150.00,
   'c1111111-1111-1111-1111-111111111111', '[]', '33333333-3333-3333-3333-333333333333', now() - interval '1 day', now() - interval '2 hours', now() - interval '30 minutes', now() - interval '2 hours', now() - interval '30 minutes',
   '11111111-1111-1111-1111-111111111111'),

  ('d2222222-2222-2222-2222-222222222222', 'Cliente Ejemplo',   '5512345678', 'Barba',           current_date + 3, '11:00', 'pendiente',  'cliente@ejemplo.com', 'Cita pendiente: nunca se le envio recordatorio.', 120.00,
   'c2222222-2222-2222-2222-222222222222', '[]', '33333333-3333-3333-3333-333333333333', NULL, NULL, NULL, NULL, NULL,
   '11111111-1111-1111-1111-111111111111'),

  -- cita publica: sin cliente_id
  ('d3333333-3333-3333-3333-333333333333', 'Visitante Anonimo', '5598765432', 'Corte de cabello', current_date + 5, '16:00', 'confirmada', NULL, 'Reserva publica sin cuenta.', 150.00,
   'c1111111-1111-1111-1111-111111111111', '[]', NULL, NULL, NULL, NULL, NULL, NULL,
   '11111111-1111-1111-1111-111111111111'),

  -- cita publica con telefono de longitud invalida (boton Recordar deshabilitado)
  ('d4444444-4444-4444-4444-444444444444', 'Telefono Mal Capturado', '12345', 'Barba', current_date + 6, '17:00', 'confirmada', NULL, 'Caso limite: telefono con longitud invalida.', 120.00,
   NULL, '[]', NULL, NULL, NULL, NULL, NULL, NULL,
   '11111111-1111-1111-1111-111111111111'),

  ('d5555555-5555-5555-5555-555555555555', 'Visitante Anonimo', '5511111111', 'Corte y barba', current_date + 1, '09:00', 'completada', NULL, 'Cita ya atendida.', 240.00,
   'c1111111-1111-1111-1111-111111111111', '[]', NULL, now() - interval '2 days', now() - interval '3 days', now() - interval '3 days', NULL, NULL,
   '11111111-1111-1111-1111-111111111111'),

  ('d6666666-6666-6666-6666-666666666666', 'Visitante Anonimo', '5522222222', 'Barba',           current_date + 2, '18:00', 'cancelada',  NULL, 'Cita cancelada por el cliente.', 120.00,
   NULL, '[]', NULL, NULL, NULL, NULL, NULL, NULL,
   '11111111-1111-1111-1111-111111111111'),

  ('d7777777-7777-7777-7777-777777777777', 'Cliente Ejemplo',   '5512345678', 'Corte y barba', current_date + 7, '12:00', 'confirmada', 'cliente@ejemplo.com', NULL, 240.00,
   'c2222222-2222-2222-2222-222222222222', '[]', '33333333-3333-3333-3333-333333333333', NULL, NULL, NULL, NULL, NULL,
   '11111111-1111-1111-1111-111111111111'),

  ('d8888888-8888-8888-8888-888888888888', 'Visitante Anonimo', '5533333333', 'Corte de cabello', current_date + 8, '14:00', 'confirmada', NULL, NULL, 150.00,
   'c1111111-1111-1111-1111-111111111111', '[]', NULL, NULL, NULL, NULL, NULL, NULL,
   '11111111-1111-1111-1111-111111111111'),

  ('d9999999-9999-9999-9999-999999999999', 'Visitante Anonimo', '5544444444', 'Barba',           current_date + 9, '15:00', 'confirmada', NULL, NULL, 120.00,
   'c2222222-2222-2222-2222-222222222222', '[]', NULL, NULL, NULL, NULL, NULL, NULL,
   '11111111-1111-1111-1111-111111111111'),

  ('d1010101-1010-1010-1010-101010101010','Cliente Ejemplo',   '5512345678', 'Corte de cabello', current_date + 4, '19:00', 'confirmada', 'cliente@ejemplo.com', NULL, 150.00,
   'c1111111-1111-1111-1111-111111111111', '[]', '33333333-3333-3333-3333-333333333333', NULL, NULL, NULL, NULL, NULL,
   '11111111-1111-1111-1111-111111111111'),

  -- citas de la segunda barberia: sirven para comprobar el aislamiento
  ('e1111111-1111-1111-1111-111111111111', 'Cliente Norte',      '5555555555', 'Corte de cabello', current_date + 2, '11:00', 'confirmada', 'norte@ejemplo.com', 'Cita de la segunda barbería.', 150.00,
   'c3333333-3333-3333-3333-333333333333', '[]', NULL, NULL, NULL, NULL, NULL, NULL,
   '22222222-2222-2222-2222-222222222222'),

  ('e2222222-2222-2222-2222-222222222222', 'Cliente Norte',      '5566666666', 'Diseño de barba',  current_date + 4, '13:00', 'confirmada', 'norte@ejemplo.com', NULL, 150.00,
   'c3333333-3333-3333-3333-333333333333', '[]', NULL, NULL, NULL, NULL, NULL, NULL,
   '22222222-2222-2222-2222-222222222222'),

  ('e3333333-3333-3333-3333-333333333333', 'Visitante Anonimo', '5577777777', 'Barba',           current_date + 5, '10:00', 'confirmada', NULL, NULL, 120.00,
   NULL, '[]', NULL, NULL, NULL, NULL, NULL, NULL,
   '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

COMMIT;

-- ============================================================================
--  RESUMEN DEL SEED
-- ============================================================================
--   2 barberias            2 configuracion       6 servicios
--   8 productos            3 barberos           13 citas
--   4 usuarios de prueba   4 perfiles           1 membresia
--
--  Casos limite incluidos a proposito:
--   - 3 citas sin cliente_id        (reserva publica anonima)
--   - 1 cita con telefono invalido  (boton "Recordar" deshabilitado)
--   - 2 citas sin recordatorio      (canal automatico sin verificar)
--   - 1 cita completada, 1 cancelada, 1 pendiente
--   - 3 citas en la 2a barberia     (para comprobar el aislamiento)
--
--  Usuarios de prueba (contraseña Demo1234!):
--   proveedor@ejemplo.com   -> superadmin  (panel del proveedor del software)
--   dueno@ejemplo.com       -> admin       (dueño de la primera barberia)
--   dueno.norte@ejemplo.com -> admin       (dueño de Barbería Norte)
--   cliente@ejemplo.com     -> cliente     (portal del cliente)
-- ============================================================================
