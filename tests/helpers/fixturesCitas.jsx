// tests/helpers/fixturesCitas.js
// Datos y montaje compartidos por las pruebas de CitasAdmin y CitaManualForm.
//
// El reloj va fijo en un miercoles para que las metricas y los filtros del
// panel sean deterministas: ningun test depende del dia en el que se ejecuta.

import { afterEach, beforeEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import { supabaseMock } from '../mocks/supabaseClient'
import CitasAdmin from '../../src/pages/admin/CitasAdmin'
import CitaManualForm from '../../src/pages/admin/CitaManualForm'

/** Miercoles 2026-03-11 a las 10:00. La semana va del lunes 9 al domingo 15. */
export const HOY = '2026-03-11'
export const AHORA = new Date('2026-03-11T10:00:00')

export const BARBERIA = { id: 'b1', nombre: 'Salon Demo', slug: 'kromatik' }

export const BARBEROS = [
  { id: 'bar-1', nombre: 'Barbero Uno', especialidad: 'Corte clasico', disponible: true },
  { id: 'bar-2', nombre: 'Barbero Dos', especialidad: 'Barba', disponible: true },
]

export const SERVICIOS = [
  { id: 's1', nombre: 'Corte de cabello', categoria: 'Cabello', duracion: '30', costo: 150 },
  { id: 's2', nombre: 'Barba', categoria: 'Barba', duracion: '30', costo: 120 },
]

/**
 * Seis citas: cuatro de hoy, una de ayer (dentro de la ventana de 7 dias) y
 * una de manana. Con estos datos las metricas del panel son:
 *   Total historico 6 · Citas hoy 4 · Semana actual 5
 *   Cumplimiento 80 % (1 cancelada de 5) · promedio diario 0.7
 *   En curso o completadas hoy: 1 (la completada)
 *   Citas por recordar: 2 (la pendiente de hoy a las 11:00 y la de manana)
 */
export const CITAS = [
  { id: 'c1', nombre: 'Ana',   telefono: '5512345678', correo: 'ana@ejemplo.com',   servicio: 'Corte de cabello', fecha: HOY,           hora: '09:00:00', estado: 'confirmada', barbero_id: 'bar-1', total: 150, productos: [] },
  { id: 'c2', nombre: 'Luis',  telefono: '5522222222', correo: 'luis@ejemplo.com',  servicio: 'Barba',           fecha: HOY,           hora: '11:00:00', estado: 'pendiente',  barbero_id: 'bar-2', total: 120, productos: [] },
  { id: 'c3', nombre: 'Marta', telefono: '5533333333', correo: 'marta@ejemplo.com', servicio: 'Corte de cabello', fecha: HOY,           hora: '14:30:00', estado: 'cancelada',  barbero_id: null,       total: 150, productos: [] },
  { id: 'c4', nombre: 'Nico',  telefono: '5544444444', correo: 'nico@ejemplo.com',  servicio: 'Barba',           fecha: HOY,           hora: '16:00:00', estado: 'completada', barbero_id: 'bar-1', total: 120, productos: [] },
  { id: 'c5', nombre: 'Olga',  telefono: '5555555555', correo: 'olga@ejemplo.com',  servicio: 'Corte de cabello', fecha: '2026-03-10',  hora: '10:00:00', estado: 'pendiente',  barbero_id: 'bar-2', total: 150, productos: [] },
  { id: 'c6', nombre: 'Pau',   telefono: '5566666666', correo: 'pau@ejemplo.com',  servicio: 'Barba',           fecha: '2026-03-12',  hora: '09:00:00', estado: 'pendiente',  barbero_id: 'bar-1', total: 120, productos: [] },
]

export const CONFIGURACION = {
  id: 'cfg-1',
  barberia_id: 'b1',
  nombre: 'Salon Demo',
  recordatorios_activos: true,
  whatsapp_activo: false,
}

/** Registra el reloj fijo. Se llama una vez por archivo de prueba. */
export function usarRelojFijo() {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: AHORA })
  })
  afterEach(() => {
    vi.useRealTimers()
  })
}

/** Prepara el mock con los datos por defecto (o los que se le pasen). */
export function configurarCitas({
  citas = CITAS,
  barberos = BARBEROS,
  servicios = SERVICIOS,
  errorCitas = null,
} = {}) {
  supabaseMock.on(
    'citas',
    'select',
    errorCitas ? { data: null, error: errorCitas } : { data: citas }
  )
  supabaseMock.on('barberos', 'select', { data: barberos })
  supabaseMock.on('servicios', 'select', { data: servicios })
}

/** Monta el panel de citas con la configuracion de la barberia. */
export function montarCitasAdmin(opciones = {}) {
  configurarCitas(opciones.datos)
  return renderWithProviders(<CitasAdmin />, {
    ruta: '/admin/citas',
    barberia: { barberia: BARBERIA, cargando: false, slug: 'kromatik', sinSlug: false },
    configuracion: {
      configuracion: { ...CONFIGURACION, ...(opciones.configuracion || {}) },
      cargando: false,
      refrescar: async () => {},
    },
  })
}

/** Monta el modal de cita manual. */
export function montarCitaManual(opciones = {}) {
  return renderWithProviders(
    <CitaManualForm
      cita={opciones.cita}
      servicios={opciones.servicios || SERVICIOS}
      barberos={opciones.barberos || BARBEROS}
      onClose={() => {}}
      onGuardado={opciones.onGuardado || (() => {})}
    />,
    {
      ruta: '/admin/citas',
      barberia: { barberia: BARBERIA, cargando: false, slug: 'kromatik', sinSlug: false },
    }
  )
}

/** Devuelve la llamada al mock de una tabla y operacion concretas. */
export function llamadaDe(tabla, operacion) {
  return supabaseMock.llamadas.find(
    (c) => c.tipo === 'query' && c.tabla === tabla && c.operacion === operacion
  )
}

/**
 * Devuelve la fila de la tabla que contiene el nombre de un cliente, o null si
 * todavia no aparece. El nombre tambien sale en la tarjeta de recordatorios,
 * asi que se busca dentro de la tabla (`tr`) y no en el documento entero.
 */
export function filaDe(cliente) {
  const candidatos = screen.queryAllByText(cliente)
  if (candidatos.length === 0) return null
  const dentroDeLaTabla = candidatos.find((el) => el.closest('tr'))
  return (dentroDeLaTabla || candidatos[0]).closest('tr')
}

/** Espera a que aparezca la fila de un cliente en la tabla. */
export async function esperarFila(cliente) {
  return await waitFor(() => {
    const fila = filaDe(cliente)
    if (!fila) throw new Error(`la fila de "${cliente}" todavia no aparece`)
    return fila
  })
}

/**
 * Acota las consultas de una fila a la tabla de la agenda. Sin esto, el
 * nombre del cliente tambien sale en la tarjeta de recordatorios y las
 * busquedas devuelven varios elementos.
 */
export function dentroDeLaFila(cliente) {
  const fila = filaDe(cliente)
  if (!fila) throw new Error(`no hay fila de "${cliente}" en la tabla`)
  return within(fila)
}
