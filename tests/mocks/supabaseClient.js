// tests/mocks/supabaseClient.js
// Mock manual de `src/supabaseClient.js`.
//
// Reproduce la API encadenable de @supabase/supabase-js v2 con builders que
// son "thenable": cada llamada devuelve un objeto con los mismos metodos, y al
// hacer `await` se resuelve con la respuesta configurada por el test.
//
// Uso desde un test:
//
//   import { supabaseMock } from '../mocks/supabaseClient'
//
//   supabaseMock.on('citas', 'select', { data: [{ id: 'c1' }] })
//   const { data } = await supabaseMock.from('citas').select('*').eq('id', 'c1')
//
//   supabaseMock.onRpc('cancelar_cita', { data: null, error: null })
//   const { error } = await supabaseMock.rpc('cancelar_cita', { p_id: 'c1' })
//
// Una respuesta puede ser un objeto o una funcion que recibe el contexto de la
// consulta (tabla, operacion, filtros, carga) y devuelve la respuesta.
//
// El mock se registra globalmente en tests/setup.js, de modo que el objeto
// `supabase` que importa la aplicacion es ESTE mismo: no hace falta
// `vi.mock` en cada test.

const RESPUESTA_VACIA = { data: [], error: null, count: null }
const RESPUESTA_NULA = { data: null, error: null, count: null }

class Consulta {
  constructor(cliente, tabla, operacion) {
    this.cliente = cliente
    this.tabla = tabla
    this.operacion = operacion
    this.filtros = []
    this.columnas = null
    this.carga = null
    this.orden = []
    this.rango = null
    this.maximo = null
    this.unico = null
  }

  // --- seleccion ---
  select(columnas) { this.columnas = columnas; return this }

  // --- escritura ---
  insert(filas) { this.operacion = 'insert'; this.carga = filas; return this }
  update(valores) { this.operacion = 'update'; this.carga = valores; return this }
  upsert(valores, opciones) {
    this.operacion = 'upsert'
    this.carga = valores
    this.opciones = opciones
    return this
  }
  delete() { this.operacion = 'delete'; return this }

  // --- filtros ---
  eq(columna, valor) { return this._filtro('eq', columna, valor) }
  neq(columna, valor) { return this._filtro('neq', columna, valor) }
  gt(columna, valor) { return this._filtro('gt', columna, valor) }
  gte(columna, valor) { return this._filtro('gte', columna, valor) }
  lt(columna, valor) { return this._filtro('lt', columna, valor) }
  lte(columna, valor) { return this._filtro('lte', columna, valor) }
  like(columna, valor) { return this._filtro('like', columna, valor) }
  ilike(columna, valor) { return this._filtro('ilike', columna, valor) }
  in(columna, valores) { return this._filtro('in', columna, valores) }
  is(columna, valor) { return this._filtro('is', columna, valor) }
  _filtro(op, columna, valor) {
    this.filtros.push({ op, columna, valor })
    return this
  }

  // --- orden y paginacion ---
  order(columna, opciones) { this.orden.push({ columna, opciones }); return this }
  limit(n) { this.maximo = n; return this }
  range(desde, hasta) { this.rango = [desde, hasta]; return this }

  // --- resultado unico ---
  single() { this.unico = 'single'; return this }
  maybeSingle() { this.unico = 'maybeSingle'; return this }

  // --- thenable: al hacer await se resuelve la respuesta configurada ---
  then(resolver, rechazar) {
    return Promise.resolve()
      .then(() => this.cliente.resolver(this))
      .then(resolver, rechazar)
  }
  catch(rechazar) { return this.then(undefined, rechazar) }
  finally(fn) { return this.then().finally(fn) }
}

export class ClienteSupabaseMock {
  constructor() { this.reset() }

  reset() {
    this.respuestas = new Map()
    this.respuestasRpc = new Map()
    this.respuestasAuth = new Map()
    this.respuestasStorage = new Map()
    this.llamadas = []
    this.callbackAuthStateChange = null

    this.auth = {
      signInWithPassword: async (credenciales) => this._auth('signInWithPassword', credenciales),
      signUp: async (opciones) => this._auth('signUp', opciones),
      signOut: async () => this._auth('signOut', {}),
      getSession: async () => this._auth('getSession', {}),
      onAuthStateChange: (callback) => {
        this.llamadas.push({ tipo: 'auth.onAuthStateChange' })
        // Se guarda el callback para que un test pueda simular un cambio de
        // sesion (login, logout, renovacion de token) desde fuera.
        this.callbackAuthStateChange = callback
        // supabase-js v2 devuelve `{ data: { subscription } }` y AuthContext
        // hace `listener.subscription.unsubscribe()` al desmontar.
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
    }

    this.storage = {
      from: (bucket) => ({
        upload: async (ruta) => this._storage('upload', { bucket, ruta }),
        getPublicUrl: (ruta) => ({
          data: { publicUrl: `https://mock.supabase.co/storage/v1/object/public/${bucket}/${ruta}` },
        }),
        remove: async (rutas) => this._storage('remove', { bucket, rutas }),
      }),
    }

    return this
  }

  // --- configuracion por el test ---
  on(tabla, operacion, respuesta) {
    this.respuestas.set(`${tabla}.${operacion}`, respuesta)
    return this
  }
  onRpc(nombre, respuesta) { this.respuestasRpc.set(nombre, respuesta); return this }
  onAuth(operacion, respuesta) { this.respuestasAuth.set(operacion, respuesta); return this }
  onStorage(operacion, respuesta) { this.respuestasStorage.set(operacion, respuesta); return this }

  // --- API que consume la aplicacion ---
  from(tabla) { return new Consulta(this, tabla, 'select') }

  rpc(nombre, argumentos) {
    this.llamadas.push({ tipo: 'rpc', nombre, argumentos })
    const configurada = this.respuestasRpc.get(nombre)
    return Promise.resolve(this._evaluar(configurada, { nombre, argumentos }, RESPUESTA_NULA))
  }

  resolver(consulta) {
    this.llamadas.push({
      tipo: 'query',
      tabla: consulta.tabla,
      operacion: consulta.operacion,
      filtros: consulta.filtros,
      carga: consulta.carga,
      // Se registra lo que se PIDIÓ a la base (columnas y orden), para poder
      // comprobar que la consulta acota por barberia_id y pide el orden
      // correcto. El mock no reordena los datos: los devuelve tal cual.
      columnas: consulta.columnas,
      orden: consulta.orden,
    })
    const configurada = this.respuestas.get(`${consulta.tabla}.${consulta.operacion}`)
    const valor = this._evaluar(configurada, consulta, RESPUESTA_VACIA)
    if ((consulta.unico === 'single' || consulta.unico === 'maybeSingle') && Array.isArray(valor.data)) {
      return { ...valor, data: valor.data[0] ?? null }
    }
    return valor
  }

  _evaluar(configurada, contexto, base) {
    if (configurada === undefined) return base
    if (typeof configurada === 'function') return configurada(contexto) ?? base
    return configurada
  }

  _auth(operacion, argumentos) {
    this.llamadas.push({ tipo: `auth.${operacion}`, argumentos })
    const configurada = this.respuestasAuth.get(operacion)
    return this._evaluar(configurada, argumentos, { data: { user: null, session: null }, error: null })
  }

  _storage(operacion, argumentos) {
    this.llamadas.push({ tipo: `storage.${operacion}`, argumentos })
    const configurada = this.respuestasStorage.get(operacion)
    return this._evaluar(configurada, argumentos, RESPUESTA_NULA)
  }
}

export const supabaseMock = new ClienteSupabaseMock()
export const crearMockSupabase = () => new ClienteSupabaseMock()
export default supabaseMock
