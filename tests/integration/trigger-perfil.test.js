// tests/integration/trigger-perfil.test.js
// El trigger `trg_crear_perfil` sobre `auth.users` y la FK de `citas.cliente_id`.
//
// Matriz v3:
//   F-01 «Acceder al sistema»: «el registro nunca asigna rol: todo alta nace
//        como cliente».
//   F-07 «Consultar las citas propias y el historial»: «una cita sin cliente_id
//        no aparece porque no es atribuible a ninguna persona».
//
// ⚠ Estas pruebas tocan `auth.users`: necesitan la clave `service_role`, que
// es un SECRETO. Si no esta definida, se saltan (y el motivo queda en el
// nombre del caso). El resto de la suite NO necesita ese secreto.

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import {
  MOTIVO_SIN_SERVICE_ROLE,
  PASSWORD_SEED,
  abrirSesiones,
  citaDePrueba,
  fechaDePrueba,
  franja,
  hayClaveAnon,
  hayServiceRole,
  limpiar,
  nuevaMarca,
} from '../helpers/integracion.js'

const FECHA = fechaDePrueba()

let sesiones = null
// Cada PRUEBA tiene su propia marca: los archivos corren en paralelo y una
// limpieza global se comia las filas del archivo vecino.
let marca = null
const usuariosCreados = []

beforeAll(async () => {
  if (!hayServiceRole()) return
  sesiones = await abrirSesiones()
})

beforeEach(() => {
  marca = nuevaMarca()
})

afterEach(async () => {
  if (sesiones) await limpiar(sesiones, marca)
  // Los usuarios de prueba se borran aqui: son de `auth.users`, no del schema
  // publico, y la limpieza normal no los alcanza.
  if (sesiones?.service) {
    for (const id of usuariosCreados.splice(0)) {
      await sesiones.service.auth.admin.deleteUser(id)
    }
  }
})

/** Crea un usuario de auth con los metadatos que se le pidan. */
async function crearUsuario(metadatos) {
  const correo = `int_prueba-${randomUUID().slice(0, 8)}@ejemplo.com`
  const { data, error } = await sesiones.service.auth.admin.createUser({
    email: correo,
    password: PASSWORD_SEED,
    email_confirm: true,
    user_metadata: metadatos,
  })
  if (error) throw new Error(`[integracion] No se pudo crear el usuario: ${error.message}`)
  usuariosCreados.push(data.user.id)
  return data.user
}

describe.skipIf(!hayClaveAnon())('Trigger · el perfil siempre nace como cliente', () => {
  it.skipIf(!hayServiceRole())(
    `INT-35 · F-01 · el trigger crea el perfil como cliente aunque user_metadata pida admin (${MOTIVO_SIN_SERVICE_ROLE})`,
    async () => {
      const usuario = await crearUsuario({ role: 'admin', full_name: 'Int Prueba' })

      const { data: perfil, error } = await sesiones.service
        .from('perfiles')
        .select('rol, nombre, barberia_id')
        .eq('id', usuario.id)
        .single()

      expect(error).toBeNull()
      expect(perfil).not.toBeNull()
      // El trigger ignora `user_metadata`: el rol es siempre 'cliente'.
      expect(perfil.rol).toBe('cliente')
      // Y el alta no asigna barberia: eso lo hace un admin con SQL.
      expect(perfil.barberia_id).toBeNull()
    }
  )

  it.skipIf(!hayServiceRole())(
    `INT-36 · F-07 · borrar un usuario deja sus citas con cliente_id null (${MOTIVO_SIN_SERVICE_ROLE})`,
    async () => {
      const usuario = await crearUsuario({ full_name: 'Int Prueba' })

      const { data: cita, error: errorCita } = await sesiones.service
        .from('citas')
        .insert([citaDePrueba({ marca, ...franja(FECHA, 1), cliente_id: usuario.id })])
        .select('id, cliente_id')
        .single()
      expect(errorCita).toBeNull()
      expect(cita.cliente_id).toBe(usuario.id)

      // Se borra el usuario de auth.
      const { error: errorBorrado } = await sesiones.service.auth.admin.deleteUser(usuario.id)
      expect(errorBorrado).toBeNull()
      usuariosCreados.splice(usuariosCreados.indexOf(usuario.id), 1)

      // La cita NO se borra: se queda sin dueno (`ON DELETE SET NULL`).
      const { data: despues, error: errorLectura } = await sesiones.service
        .from('citas')
        .select('id, cliente_id')
        .eq('id', cita.id)
        .single()

      expect(errorLectura).toBeNull()
      expect(despues).not.toBeNull()
      expect(despues.cliente_id).toBeNull()
    }
  )
})
