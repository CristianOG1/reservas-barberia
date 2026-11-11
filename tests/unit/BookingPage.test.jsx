// tests/unit/BookingPage.test.jsx
// Asistente de reserva en 3 pasos: servicios -> fecha y hora -> datos.
//
// Matriz v3: F-05 «Reservar una cita: elegir servicio, productos, barbero,
// fecha y hora, y confirmar con los datos del cliente». Su criterio incluye
// el rechazo del 23505, el guardado del borrador sin sesion y la asignacion
// automatica de barbero.
//
// El reloj va fijo (2026-03-11, miercoles) para que los tests no dependan
// de la fecha en la que se ejecuten. El sessionStorage es el real de jsdom.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import BookingPage from '../../src/pages/BookingPage'
import { renderWithProviders, sesionSimulada } from '../helpers/renderWithProviders'
import { supabaseMock } from '../mocks/supabaseClient'

vi.mock('../../src/context/AuthContext', async (importOriginal) => {
  const real = await importOriginal()
  const { authSimulado } = await import('../helpers/renderWithProviders')
  return { ...real, useAuth: () => authSimulado.valor }
})

// Miercoles 2026-03-11 a las 10:00. La semana va del lunes 9 al domingo 15.
const AHORA = new Date('2026-03-11T10:00:00')
const BARBERIA = { id: 'b1', nombre: 'Salon Demo', slug: 'kromatik' }

const SERVICIOS = [
  { id: 's1', nombre: 'Corte de cabello', categoria: 'Cabello', descripcion: 'Corte clasico con lavado.', costo: 150, duracion: '30' },
  { id: 's2', nombre: 'Corte y barba', categoria: 'Combo', descripcion: 'Perfilado de barba.', costo: 240, duracion: '60' },
]
const PRODUCTOS = [
  { id: 'p1', nombre: 'Aceite para barba', descripcion: 'Aceite nutritivo.', categoria: 'Barba', precio: 180 },
]
const BARBEROS = [
  { id: 'bar-1', nombre: 'Barbero Uno', especialidad: 'Corte clasico' },
]

/** Muestra la ruta actual: sirve para observar la redireccion a /login. */
function Ubicacion() {
  const { pathname } = useLocation()
  return <p data-testid="ruta">{pathname}</p>
}

function configurarBase({ horasOcupadas = [], sinBarberos = false } = {}) {
  supabaseMock.on('servicios', 'select', { data: SERVICIOS })
  supabaseMock.on('productos', 'select', { data: PRODUCTOS })
  supabaseMock.on('barberos', 'select', { data: sinBarberos ? [] : BARBEROS })
  supabaseMock.onRpc('horas_ocupadas', { data: horasOcupadas.map((h) => `${h}:00`) })
}

function montar({ conSesion = false, ...opciones } = {}) {
  return renderWithProviders(
    <>
      <Ubicacion />
      <BookingPage />
    </>,
    {
      ruta: '/agendar',
      auth: conSesion
        ? { session: sesionSimulada(), cargando: false, rol: 'cliente', cargandoRol: false }
        : { session: null, cargando: false, rol: null, cargandoRol: false },
      barberia: { barberia: BARBERIA, cargando: false, slug: 'kromatik', sinSlug: false },
      ...opciones,
    }
  )
}

/**
 * Los campos del paso 3 NO tienen `htmlFor` ni `id`, asi que el `<label>` no
 * esta asociado al `<input>` y no hay nombre accesible: hay que localizarlos
 * por su atributo `name`.
 */
function campo(container, nombre) {
  return container.querySelector(`[name="${nombre}"]`)
}

function escribir(container, nombre, valor) {
  fireEvent.change(campo(container, nombre), { target: { value: valor } })
}

/**
 * Pulsa la tarjeta de un servicio o un producto. El texto aparece dos veces
 * en pantalla (la tarjeta y el resumen lateral), asi que se toma la primera
 * aparicion, que es la de la tarjeta.
 */
async function pulsarTarjeta(user, texto) {
  const coincidencias = await screen.findAllByText(texto)
  await user.click(coincidencias[0].closest('button'))
}

/** Elige un servicio (paso 1). */
async function elegirServicio(user, nombre = 'Corte de cabello') {
  await pulsarTarjeta(user, nombre)
}

/** Avanza del paso 1 al paso 2 (calendario). */
async function avanzarAlCalendario(user) {
  await user.click(screen.getByRole('button', { name: 'Siguiente →' }))
}

/** Elige un dia por su etiqueta (LUN..DOM). */
async function elegirDia(user, etiqueta) {
  await user.click(screen.getByRole('button', { name: new RegExp(etiqueta) }))
}

/** Elige una hora por su texto visible en 12 h. */
async function elegirHora(user, texto) {
  await user.click(screen.getByRole('button', { name: texto }))
}

/** Llega al paso 3 con el formulario ya relleno. */
async function irAlPasoDeDatos(user, container, { dia = 'JUE', hora = '11:00 AM' } = {}) {
  await elegirServicio(user)
  await avanzarAlCalendario(user)
  await elegirDia(user, dia)
  await elegirHora(user, hora)
  await user.click(screen.getByRole('button', { name: 'Siguiente →' }))
  escribir(container, 'nombre', 'Ana Prueba')
  escribir(container, 'telefono', '5512345678')
  escribir(container, 'correo', 'ana@ejemplo.com')
}

describe('BookingPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: AHORA })
    sessionStorage.clear()
    configurarBase()
  })

  afterEach(() => {
    vi.useRealTimers()
    sessionStorage.clear()
  })

  // ---------------------------------------------------------------- flujo
  it('F-05 · el flujo de tres pasos inserta la cita con la barberia del sitio', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = montar({ conSesion: true })

    await elegirServicio(user)
    await pulsarTarjeta(user, 'Barbero Uno')
    await avanzarAlCalendario(user)
    await elegirDia(user, 'JUE')
    await elegirHora(user, '11:00 AM')
    await user.click(screen.getByRole('button', { name: 'Siguiente →' }))

    escribir(container, 'nombre', 'Ana Prueba')
    escribir(container, 'telefono', '5512345678')
    escribir(container, 'correo', 'ana@ejemplo.com')

    await user.click(screen.getByRole('button', { name: 'CONFIRMAR RESERVACIÓN →' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar reservación' }))

    await waitFor(() => {
      expect(screen.getByText('¡Reservación confirmada!')).toBeInTheDocument()
    })

    const insercion = supabaseMock.llamadas.find(
      (c) => c.tipo === 'query' && c.tabla === 'citas' && c.operacion === 'insert'
    )
    expect(insercion).toBeDefined()
    expect(insercion.carga[0]).toMatchObject({
      nombre: 'Ana Prueba',
      telefono: '5512345678',
      correo: 'ana@ejemplo.com',
      servicio: 'Corte de cabello',
      fecha: '2026-03-12',
      hora: '11:00',
      total: 150,
      barberia_id: 'b1',
      barbero_id: 'bar-1',
      cliente_id: 'usuario-1',
    })
  })

  // ------------------------------------------------------------ validacion
  it('el boton de confirmar sigue bloqueado mientras falte un campo obligatorio', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = montar({ conSesion: true })

    await elegirServicio(user)
    await avanzarAlCalendario(user)
    await elegirDia(user, 'JUE')
    await elegirHora(user, '11:00 AM')
    await user.click(screen.getByRole('button', { name: 'Siguiente →' }))

    escribir(container, 'nombre', 'Ana Prueba')
    escribir(container, 'correo', 'ana@ejemplo.com')
    // Falta el telefono.
    expect(screen.getByRole('button', { name: 'CONFIRMAR RESERVACIÓN →' })).toBeDisabled()

    escribir(container, 'telefono', '5512345678')
    expect(screen.getByRole('button', { name: 'CONFIRMAR RESERVACIÓN →' })).toBeEnabled()
  })

  it.fails('avisa con un mensaje cuando falta un campo obligatorio', async () => {
    // HUECO: el formulario solo marca `required` en los inputs y deshabilita el
    // boton. No hay ningun mensaje de error en pantalla: el navegador nativo
    // muestra su aviso, pero la aplicacion no dice nada.
    // Cuando se implemente el mensaje, este test dejara de estar en `it.fails`.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = montar({ conSesion: true })

    await elegirServicio(user)
    await avanzarAlCalendario(user)
    await elegirDia(user, 'JUE')
    await elegirHora(user, '11:00 AM')
    await user.click(screen.getByRole('button', { name: 'Siguiente →' }))
    escribir(container, 'nombre', 'Ana Prueba')

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/obligatorio|requerido|falta/i)).toBeInTheDocument()
  })

  it.fails('no deja confirmar con un telefono de formato invalido', async () => {
    // HUECO: el campo `telefono` solo tiene `required`. No hay ninguna
    // validacion de formato, asi que un numero de 3 digitos se acepta y la
    // cita se guardaria con un telefono inservible para WhatsApp.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = montar({ conSesion: true })

    await elegirServicio(user)
    await avanzarAlCalendario(user)
    await elegirDia(user, 'JUE')
    await elegirHora(user, '11:00 AM')
    await user.click(screen.getByRole('button', { name: 'Siguiente →' }))
    escribir(container, 'nombre', 'Ana Prueba')
    escribir(container, 'telefono', '123')
    escribir(container, 'correo', 'ana@ejemplo.com')

    expect(screen.getByRole('button', { name: 'CONFIRMAR RESERVACIÓN →' })).toBeDisabled()
  })

  // --------------------------------------------------------- reglas de hora
  it('el domingo no se puede elegir como dia de reserva', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montar({ conSesion: true })

    await elegirServicio(user)
    await avanzarAlCalendario(user)

    expect(screen.getByRole('button', { name: /DOM/ })).toBeDisabled()
    // Un dia entre semana si se puede.
    expect(screen.getByRole('button', { name: /JUE/ })).toBeEnabled()
  })

  it('una hora ya pasada no se puede elegir el dia de hoy', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montar({ conSesion: true })

    await elegirServicio(user)
    await avanzarAlCalendario(user)
    await elegirDia(user, 'MIÉ')

    // El reloj esta a las 10:00, asi que las 10:00 ya pasaron.
    expect(screen.getByRole('button', { name: '10:00 AM' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '11:00 AM' })).toBeEnabled()
  })

  it('una franja ya ocupada no se puede elegir', async () => {
    supabaseMock.onRpc('horas_ocupadas', { data: ['11:00:00'] })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montar({ conSesion: true })

    await elegirServicio(user)
    await avanzarAlCalendario(user)
    await elegirDia(user, 'JUE')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '11:00 AM' })).toBeDisabled()
    })
    expect(screen.getByRole('button', { name: '12:40 PM' })).toBeEnabled()
  })

  // ---------------------------------------------------------- franja tomada
  it('F-05 · si el horario se toma al confirmar, vuelve al paso de hora con aviso', async () => {
    supabaseMock.on('citas', 'insert', {
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = montar({ conSesion: true })

    await irAlPasoDeDatos(user, container)
    await user.click(screen.getByRole('button', { name: 'CONFIRMAR RESERVACIÓN →' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar reservación' }))

    await waitFor(() => {
      expect(
        screen.getByText('Ese horario acaba de ser tomado, elige otro.')
      ).toBeInTheDocument()
    })
    // Vuelve al paso 2: se ve el calendario de dias.
    expect(screen.getByText('03. SELECCIÓN DE FECHA & TURNO')).toBeInTheDocument()
    // El modal de confirmacion se cierra.
    expect(screen.queryByText('Confirma tu reservación')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------- barbero
  it('con «cualquier barbero» llama a asignar_barbero con la barberia del sitio', async () => {
    supabaseMock.onRpc('asignar_barbero', { data: 'bar-1', error: null })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = montar({ conSesion: true })

    await irAlPasoDeDatos(user, container)
    await user.click(screen.getByRole('button', { name: 'CONFIRMAR RESERVACIÓN →' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar reservación' }))

    await waitFor(() => {
      const llamada = supabaseMock.llamadas.find(
        (c) => c.tipo === 'rpc' && c.nombre === 'asignar_barbero'
      )
      expect(llamada).toBeDefined()
      // La barberia del sitio, no la del barbero elegido (que es null).
      expect(llamada.argumentos).toEqual({
        fecha_consulta: '2026-03-12',
        hora_consulta: '11:00',
        barberia_id: 'b1',
      })
    })

    const insercion = supabaseMock.llamadas.find(
      (c) => c.tipo === 'query' && c.tabla === 'citas' && c.operacion === 'insert'
    )
    expect(insercion.carga[0].barbero_id).toBe('bar-1')
  })

  it('si no hay barbero disponible la reserva se guarda igual, sin asignar', async () => {
    supabaseMock.onRpc('asignar_barbero', { data: null, error: null })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = montar({ conSesion: true })

    await irAlPasoDeDatos(user, container)
    await user.click(screen.getByRole('button', { name: 'CONFIRMAR RESERVACIÓN →' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar reservación' }))

    await waitFor(() => {
      expect(screen.getByText('¡Reservación confirmada!')).toBeInTheDocument()
    })

    const insercion = supabaseMock.llamadas.find(
      (c) => c.tipo === 'query' && c.tabla === 'citas' && c.operacion === 'insert'
    )
    expect(insercion.carga[0].barbero_id).toBe(null)
    expect(insercion.carga[0].barberia_id).toBe('b1')
  })

  // ------------------------------------------------------- total y duracion
  it('el total suma servicios y productos, y la duracion solo los servicios', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montar({ conSesion: true })

    await elegirServicio(user, 'Corte de cabello')
    await elegirServicio(user, 'Corte y barba')
    await pulsarTarjeta(user, 'Aceite para barba')

    // El total se renderiza como `$` + `570` + `MXN` en nodos separados (React
    // mete comentarios entre textos), asi que el matcher ve solo '$570'.
    expect(screen.getByText('$570')).toBeInTheDocument()
    expect(screen.getByText('$570').parentElement).toHaveTextContent('$570 MXN')
    // 30 + 60 = 90 minutos. Los productos no ocupan silla.
    expect(screen.getByText('90 min')).toBeInTheDocument()
  })

  // --------------------------------------------------------------- borrador
  it('F-05 · sin sesion, confirmar guarda el borrador y manda a /login', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = montar({ conSesion: false })

    await irAlPasoDeDatos(user, container)
    await user.click(screen.getByRole('button', { name: 'INICIAR SESIÓN PARA RESERVAR →' }))

    await waitFor(() => {
      expect(screen.getByTestId('ruta')).toHaveTextContent('/login')
    })

    const borrador = JSON.parse(sessionStorage.getItem('borradorReserva'))
    expect(borrador.serviciosElegidos.map((s) => s.nombre)).toEqual(['Corte de cabello'])
    expect(borrador.fechaElegida).toBe('2026-03-12')
    expect(borrador.horaElegida).toBe('11:00')
    expect(borrador.form.nombre).toBe('Ana Prueba')
  })

  it('F-05 · el borrador se restaura al volver a la pagina', async () => {
    sessionStorage.setItem(
      'borradorReserva',
      JSON.stringify({
        guardadoEn: Date.now(),
        serviciosElegidos: [{ ...SERVICIOS[1] }],
        productosElegidos: [],
        barberoElegido: null,
        fechaElegida: '2026-03-12',
        horaElegida: '11:00',
        pasoActual: 2,
        form: { nombre: 'Borrador', telefono: '5512345678', correo: 'borrador@ejemplo.com', notas: '' },
        semanaBase: new Date('2026-03-09').toISOString(),
      })
    )

    montar({ conSesion: true })

    // Vuelve al paso 2 con la fecha y la hora ya elegidas.
    expect(screen.getByText('03. SELECCIÓN DE FECHA & TURNO')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '11:00 AM' })).toHaveClass('bg-sky-500')
  })

  it('F-05 · el borrador caduca a las dos horas y se descarta', async () => {
    sessionStorage.setItem(
      'borradorReserva',
      JSON.stringify({
        guardadoEn: Date.now() - 2 * 60 * 60 * 1000 - 1000,
        serviciosElegidos: [{ ...SERVICIOS[1] }],
        productosElegidos: [],
        barberoElegido: null,
        fechaElegida: '2026-03-12',
        horaElegida: '11:00',
        pasoActual: 2,
        form: { nombre: 'Borrador', telefono: '', correo: '', notas: '' },
        semanaBase: new Date('2026-03-09').toISOString(),
      })
    )

    montar({ conSesion: true })

    // Caducado: se vuelve al paso 1 sin nada elegido.
    expect(screen.getByText('01. ELECCIÓN DE SERVICIO')).toBeInTheDocument()
    expect(screen.getByText('Aún no has elegido nada.')).toBeInTheDocument()
  })

  // ------------------------------------------------------- sesion o invitado
  it('F-05 · con sesion el boton ofrece confirmar y la cita guarda el cliente', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = montar({ conSesion: true })

    expect(screen.getByRole('button', { name: 'CONFIRMAR RESERVACIÓN →' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'INICIAR SESIÓN PARA RESERVAR →' })
    ).not.toBeInTheDocument()

    await irAlPasoDeDatos(user, container)
    await user.click(screen.getByRole('button', { name: 'CONFIRMAR RESERVACIÓN →' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar reservación' }))

    await waitFor(() => {
      const insercion = supabaseMock.llamadas.find(
        (c) => c.tipo === 'query' && c.tabla === 'citas' && c.operacion === 'insert'
      )
      expect(insercion.carga[0].cliente_id).toBe('usuario-1')
    })
  })

  it('F-05 · sin sesion el boton pide iniciar sesion y avisa de que se guarda lo elegido', () => {
    montar({ conSesion: false })

    expect(
      screen.getByRole('button', { name: 'INICIAR SESIÓN PARA RESERVAR →' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Guardamos lo que elegiste: al iniciar sesión regresas aquí para confirmar.')
    ).toBeInTheDocument()
  })
})
