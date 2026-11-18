// Datos y montaje del resumen del panel (`ResumenPage`).
// Reloj fijo en miercoles 2026-03-11: las cifras no dependen del dia de ejecucion.

import { renderWithProviders, CONFIGURACION_POR_DEFECTO } from './renderWithProviders'
import { supabaseMock } from '../mocks/supabaseClient'
import ResumenPage from '../../src/pages/admin/ResumenPage'

export const HOY = '2026-03-11'

export const BARBERIA = { id: 'b1', nombre: 'Salon Demo', slug: 'kromatik' }

// Nombre distinto a propósito del de `barberias`: comprueba que el encabezado usa este.
export const CONFIGURACION = {
  ...CONFIGURACION_POR_DEFECTO.configuracion,
  nombre: 'Kromatik Barberia',
}

export const SERVICIOS = [
  { id: 's1', nombre: 'Corte de cabello', categoria: 'Cabello', descripcion: '', costo: 150, duracion: '30', imagen: null },
  { id: 's2', nombre: 'Perfilado de barba', categoria: 'Barba', descripcion: '', costo: 120, duracion: '50 min', imagen: null },
  { id: 's3', nombre: 'Corte + Barba', categoria: 'Combo', descripcion: '', costo: 240, duracion: '60', imagen: null },
]

// 3 productos, 15 unidades y 2 con stock bajo (umbral: 5 unidades o menos).
export const PRODUCTOS = [
  { id: 'p1', nombre: 'Aceite para barba', categoria: 'Barba', descripcion: '', precio: 180, stock: 12, imagen: null },
  { id: 'p2', nombre: 'Shampoo revitalizante', categoria: 'Cabello', descripcion: '', precio: 220, stock: 3, imagen: null },
  { id: 'p3', nombre: 'Pomada mate', categoria: 'Estilizado', descripcion: '', precio: 150, stock: 0, imagen: null },
]

export const BARBEROS = [
  { id: 'bar-1', nombre: 'Barbero Uno', especialidad: 'Corte clasico', disponible: true, imagen: null },
  { id: 'bar-2', nombre: 'Barbero Dos', especialidad: 'Barba', disponible: false, imagen: null },
]

// Tres citas hoy (confirmada, pendiente y una sin estado que cuenta como pendiente) y una en 7 dias.
// Resumen: hoy 3 (2 por confirmar) / semana 4 · productos 3 (2 bajos, 15 uds) · barberos 1/2 · servicios 3.
export const CITAS = [
  { id: 'c1', nombre: 'Ana', telefono: '5512345678', correo: 'ana@ejemplo.com', servicio: 'Corte de cabello', fecha: HOY, hora: '09:00:00', estado: 'confirmada', barbero_id: 'bar-1', total: 150, productos: [] },
  { id: 'c2', nombre: 'Luis', telefono: '5522222222', correo: 'luis@ejemplo.com', servicio: 'Barba', fecha: HOY, hora: '11:00:00', estado: 'pendiente', barbero_id: null, total: 120, productos: [] },
  { id: 'c3', nombre: 'Pau', telefono: '5566666666', correo: 'pau@ejemplo.com', servicio: 'Corte + Barba', fecha: HOY, hora: '16:00:00', estado: null, barbero_id: 'bar-2', total: 240, productos: [] },
  { id: 'c4', nombre: 'Sara', telefono: '5577777777', correo: 'sara@ejemplo.com', servicio: 'Corte de cabello', fecha: '2026-03-13', hora: '10:00:00', estado: 'confirmada', barbero_id: 'bar-1', total: 150, productos: [] },
]

const CONTEXTO_BARBERIA = {
  barberia: BARBERIA,
  cargando: false,
  slug: 'kromatik',
  sinSlug: false,
}

const CONTEXTO_CONFIGURACION = {
  configuracion: CONFIGURACION,
  cargando: false,
  refrescar: async () => {},
}

// Con `error` fallan las cuatro consultas a la vez, como en una red caída.
export function montarResumen({
  servicios = SERVICIOS,
  productos = PRODUCTOS,
  barberos = BARBEROS,
  citas = CITAS,
  error = null,
  configuracion = CONFIGURACION,
} = {}) {
  if (error) {
    const falla = { data: null, error }
    supabaseMock.on('servicios', 'select', falla)
    supabaseMock.on('productos', 'select', falla)
    supabaseMock.on('barberos', 'select', falla)
    supabaseMock.on('citas', 'select', falla)
  } else {
    supabaseMock.on('servicios', 'select', { data: servicios })
    supabaseMock.on('productos', 'select', { data: productos })
    supabaseMock.on('barberos', 'select', { data: barberos })
    supabaseMock.on('citas', 'select', { data: citas })
  }

  return renderWithProviders(<ResumenPage />, {
    ruta: '/admin',
    barberia: CONTEXTO_BARBERIA,
    configuracion: {
      ...CONTEXTO_CONFIGURACION,
      configuracion: { ...CONFIGURACION, ...configuracion },
    },
  })
}
