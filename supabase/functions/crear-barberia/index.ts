/**
 * crear-barberia
 * ---------------------------------------------------------------------------
 * Da de alta una barbería completa desde el panel del superadmin:
 *
 *   1. el negocio en 'barberias',
 *   2. la cuenta de su dueño en 'auth.users' (con el correo ya confirmado),
 *   3. su perfil como 'admin' de ESA barbería en 'perfiles',
 *   4. su fila en 'configuracion'.
 *
 * REGLAS QUE NO DEBEN ROMPERSE
 * 1. Solo la puede llamar el superadmin. El JWT lo valida el gateway
 *    ('verify_jwt: true') y aquí además se comprueba 'perfiles.rol', porque un
 *    'verify_jwt' válido solo dice "hay sesión", no "es el dueño del software".
 * 2. 'service_role' se usa SOLO dentro de la función y nunca sale de aquí. Es la
 *    única vía para crear un usuario de auth y para escribir en 'perfiles', que
 *    no tiene política de INSERT ni de UPDATE (§10.5): desde el navegador es
 *    imposible, ni siquiera con sesión de admin.
 * 3. Es todo o nada. Supabase no ofrece una transacción que cruce 'auth.users'
 *    con la base, así que cada paso que falla deshace los anteriores a mano.
 *    El orden importa: primero el usuario de auth y al final 'configuracion'.
 * 4. El rol y la barbería NO los puede escribir el cliente, y aquí se escriben
 *    con la clave de servicio: es exactamente el camino que §17 reserva para
 *    esto (una promoción se hace fuera de la app).
 *
 * SECRETOS: ninguno vive en este archivo.
 *   · SUPABASE_URL              → inyectada por Supabase. Ojo: es SUPABASE_URL,
 *     NO SUPABASE_API_URL: ese nombre no existe en el runtime y 'createClient'
 *     falla con "supabaseUrl is required" (ver §10.7).
 *   · SUPABASE_SERVICE_ROLE_KEY → inyectada por Supabase, solo dentro de la
 *     plataforma.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

// La web llama a esta función desde el navegador, así que necesita CORS: el
// preflight (OPTIONS) no lo resuelve el gateway.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

// Las mismas reglas que el 'check barberias_slug_valido' de la base y que el
// formulario del panel: si alguna cambia, cambia en los tres sitios.
const REGEX_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SLUG_MIN = 3
const SLUG_MAX = 40
const RESERVADOS = ['www', 'app', 'admin', 'api', 'superadmin', 'mail', 'soporte']
const PASSWORD_MIN = 8
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    console.error('Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
    return json({ error: 'Falta configuración del servidor.' }, 500)
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  /* ---- 1. Quién llama ------------------------------------------------ */
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!jwt) return json({ error: 'Falta la sesión.' }, 401)

  const { data: quien, error: errorQuien } = await admin.auth.getUser(jwt)
  if (errorQuien || !quien?.user) return json({ error: 'Sesión no válida.' }, 401)

  const { data: perfil, error: errorPerfil } = await admin
    .from('perfiles')
    .select('rol')
    .eq('id', quien.user.id)
    .maybeSingle()
  if (errorPerfil) {
    console.error(errorPerfil)
    return json({ error: 'No se pudo verificar tu cuenta.' }, 500)
  }
  if (perfil?.rol !== 'superadmin') {
    return json({ error: 'Solo el superadmin puede crear barberías.' }, 403)
  }

  /* ---- 2. Datos ------------------------------------------------------- */
  let cuerpo: Record<string, unknown>
  try {
    cuerpo = await req.json()
  } catch {
    return json({ error: 'Cuerpo de la petición inválido.' }, 400)
  }

  const nombre = String(cuerpo?.nombre ?? '').trim()
  const slug = String(cuerpo?.slug ?? '').trim().toLowerCase()
  const correo = String(cuerpo?.correo ?? '').trim().toLowerCase()
  const password = String(cuerpo?.password ?? '')

  if (!nombre) return json({ error: 'El nombre del negocio es obligatorio.' }, 400)
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX || !REGEX_SLUG.test(slug)) {
    return json({
      error: 'El slug debe tener de ' + SLUG_MIN + ' a ' + SLUG_MAX +
        ' caracteres y solo minúsculas, números y guiones simples.',
    }, 400)
  }
  if (RESERVADOS.includes(slug)) {
    return json({ error: '"' + slug + '" es una palabra reservada. Elige otro slug.' }, 400)
  }
  if (!REGEX_CORREO.test(correo)) {
    return json({ error: 'El correo del dueño no es válido.' }, 400)
  }
  if (password.length < PASSWORD_MIN) {
    return json({
      error: 'La contraseña temporal debe tener al menos ' + PASSWORD_MIN + ' caracteres.',
    }, 400)
  }

  /* ---- 3. El slug tiene que estar libre ANTES de crear nada ----------- */
  const { data: existente, error: errorSlug } = await admin
    .from('barberias')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (errorSlug) {
    console.error(errorSlug)
    return json({ error: 'No se pudo comprobar el slug.' }, 500)
  }
  if (existente) return json({ error: 'El slug "' + slug + '" ya está en uso. Elige otro.' }, 409)

  /* ---- 4. Alta, paso a paso ------------------------------------------- */
  let barberiaId: string | null = null
  let userId: string | null = null

  // Deshace lo ya creado. El perfil cae solo: 'perfiles.id' es FK a
  // 'auth.users' con ON DELETE CASCADE (§10.2).
  const deshacer = async () => {
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) console.error('No se pudo borrar el usuario al deshacer:', error.message)
    }
    if (barberiaId) {
      await admin.from('configuracion').delete().eq('barberia_id', barberiaId)
      const { error } = await admin.from('barberias').delete().eq('id', barberiaId)
      if (error) console.error('No se pudo borrar la barbería al deshacer:', error.message)
    }
  }

  const { data: creada, error: errorBarberia } = await admin
    .from('barberias')
    .insert([{ nombre, slug }])
    .select('id, nombre, slug')
    .single()
  if (errorBarberia || !creada) {
    console.error(errorBarberia)
    // Dos altas del mismo slug a la vez pasan las dos por el chequeo de arriba
    // (ninguna ve la fila de la otra) y chocan aquí, contra el índice único
    // 'barberias_slug_unico'. El rechazo es correcto; el mensaje tiene que ser
    // el mismo que el del chequeo previo, no un 500 genérico.
    if (errorBarberia?.code === '23505') {
      return json({ error: 'El slug "' + slug + '" ya está en uso. Elige otro.' }, 409)
    }
    return json({ error: 'No se pudo crear la barbería. Intenta de nuevo.' }, 500)
  }
  barberiaId = creada.id

  const { data: usuario, error: errorUsuario } = await admin.auth.admin.createUser({
    email: correo,
    password,
    email_confirm: true,
  })
  if (errorUsuario || !usuario?.user) {
    await deshacer()
    const mensaje = errorUsuario?.message || ''
    if (/already|exist|registrad/i.test(mensaje)) {
      return json({ error: 'Ya existe una cuenta con ese correo. Usa otro correo.' }, 409)
    }
    if (/password|weak|characters/i.test(mensaje)) {
      return json({
        error: 'La contraseña temporal no es válida: usa al menos ' + PASSWORD_MIN + ' caracteres.',
      }, 400)
    }
    console.error(errorUsuario)
    return json({ error: 'No se pudo crear la cuenta del dueño.' }, 500)
  }
  userId = usuario.user.id

  // El trigger 'trg_crear_perfil' ya creó el perfil como 'cliente' al insertar en
  // 'auth.users'; aquí se promueve a admin de esta barbería.
  const { error: errorRol, count } = await admin
    .from('perfiles')
    .update({ rol: 'admin', barberia_id: barberiaId }, { count: 'exact' })
    .eq('id', userId)
  if (errorRol || !count) {
    console.error(errorRol)
    await deshacer()
    return json({ error: 'No se pudo asignar el administrador a la barbería.' }, 500)
  }

  const { error: errorConfig } = await admin
    .from('configuracion')
    .insert([{ nombre, barberia_id: barberiaId }])
  if (errorConfig) {
    console.error(errorConfig)
    await deshacer()
    return json({ error: 'No se pudo inicializar la configuración de la barbería.' }, 500)
  }

  return json({
    ok: true,
    barberia: { id: barberiaId, nombre, slug },
    usuario: { id: userId, correo },
  })
})
