// Fixtures de los CRUD del panel (Servicios/Productos/Barberos).
// Reloj fijo en miércoles para que métricas y filtros sean deterministas.

import { afterEach, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import { supabaseMock } from '../mocks/supabaseClient'
import ServiciosAdmin from '../../src/pages/admin/ServiciosAdmin'
import ServicioForm from '../../src/pages/admin/ServicioForm'
import ProductosAdmin from '../../src/pages/admin/ProductosAdmin'
import ProductoForm from '../../src/pages/admin/ProductoForm'
import BarberosAdmin from '../../src/pages/admin/BarberosAdmin'
import BarberoForm from '../../src/pages/admin/BarberoForm'

/** Miercoles 2026-03-11 a las 10:00 (hora local de la maquina). */
export const HOY = '2026-03-11'
export const AHORA = new Date('2026-03-11T10:00:00')

export const BARBERIA = { id: 'b1', nombre: 'Salon Demo', slug: 'kromatik' }

// Duraciones '30' y '50 min': los dos formatos que conviven en la columna TEXT (§18.32).
// Metricas resultantes: 3 servicios/3 categorias, tarifa promedio $170, duracion promedio 47 min.
export const SERVICIOS = [
  {
    id: 's1', nombre: 'Corte de cabello', categoria: 'Cabello',
    descripcion: 'Corte clasico con lavado.', costo: 150, duracion: '30',
    imagen: null, created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 's2', nombre: 'Perfilado de barba', categoria: 'Barba',
    descripcion: 'Perfilado y aceite.', costo: 120, duracion: '50 min',
    imagen: null, created_at: '2026-03-02T00:00:00Z',
  },
  {
    id: 's3', nombre: 'Corte + Barba', categoria: 'Combo',
    descripcion: '', costo: 240, duracion: '60',
    imagen: null, created_at: '2026-03-03T00:00:00Z',
  },
]

// Metricas resultantes: 3 productos/3 activos, inventario $2,820 (15 unidades), 2 con stock bajo.
export const PRODUCTOS = [
  {
    id: 'p1', nombre: 'Aceite para barba', categoria: 'Barba',
    descripcion: 'Aceite nutritivo.', precio: 180, stock: 12,
    imagen: null, created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'p2', nombre: 'Shampoo revitalizante', categoria: 'Cabello',
    descripcion: '', precio: 220, stock: 3,
    imagen: null, created_at: '2026-03-02T00:00:00Z',
  },
  {
    id: 'p3', nombre: 'Pomada mate', categoria: 'Estilizado',
    descripcion: '', precio: 150, stock: 0,
    imagen: null, created_at: '2026-03-03T00:00:00Z',
  },
]

// Uno disponible y otro en pausa; `rating` numerico y `total_resenas` entero, como en la BD.
export const BARBEROS = [
  {
    id: 'bar-1', nombre: 'Barbero Uno', especialidad: 'Corte clasico',
    disponible: true, rating: 4, total_resenas: 12, servicios: ['Corte'],
    imagen: null, created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'bar-2', nombre: 'Barbero Dos', especialidad: 'Barba',
    disponible: false, rating: 3, total_resenas: 4, servicios: ['Barba'],
    imagen: null, created_at: '2026-03-02T00:00:00Z',
  },
]

export function usarRelojFijo() {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: AHORA })
  })
  afterEach(() => {
    vi.useRealTimers()
  })
}

// `BarberosAdmin` usa toISOString() (UTC, no local); las citas usan lo mismo para que el conteo
// no dependa de la zona horaria de la maquina.
export function hoyDeLaApp() {
  return new Date().toISOString().split('T')[0]
}

export function citasDeHoy() {
  const hoy = hoyDeLaApp()
  return [
    { id: 'c1', nombre: 'Ana', telefono: '5512345678', correo: 'ana@ejemplo.com', servicio: 'Corte de cabello', fecha: hoy, hora: '09:00:00', estado: 'confirmada', barbero_id: 'bar-1', total: 150, productos: [] },
    { id: 'c2', nombre: 'Luis', telefono: '5522222222', correo: 'luis@ejemplo.com', servicio: 'Barba', fecha: hoy, hora: '11:00:00', estado: 'pendiente', barbero_id: 'bar-1', total: 120, productos: [] },
    { id: 'c3', nombre: 'Pau', telefono: '5566666666', correo: 'pau@ejemplo.com', servicio: 'Barba', fecha: hoy, hora: '16:00:00', estado: 'pendiente', barbero_id: 'bar-2', total: 120, productos: [] },
  ]
}

const CONTEXTO_BARBERIA = {
  barberia: BARBERIA,
  cargando: false,
  slug: 'kromatik',
  sinSlug: false,
}

export function montarServiciosAdmin({ datos = [], error = null } = {}) {
  supabaseMock.on(
    'servicios',
    'select',
    error ? { data: null, error } : { data: datos }
  )
  return renderWithProviders(<ServiciosAdmin />, {
    ruta: '/admin/servicios',
    barberia: CONTEXTO_BARBERIA,
  })
}

export function montarServicioForm({ servicio = null, soloLectura = false, onGuardado } = {}) {
  return renderWithProviders(
    <ServicioForm
      servicio={servicio}
      categorias={[...new Set(SERVICIOS.map((s) => s.categoria))]}
      soloLectura={soloLectura}
      onClose={() => {}}
      onGuardado={onGuardado || (() => {})}
    />,
    { ruta: '/admin/servicios', barberia: CONTEXTO_BARBERIA }
  )
}

export function montarProductosAdmin({ datos = [], error = null } = {}) {
  supabaseMock.on(
    'productos',
    'select',
    error ? { data: null, error } : { data: datos }
  )
  return renderWithProviders(<ProductosAdmin />, {
    ruta: '/admin/productos',
    barberia: CONTEXTO_BARBERIA,
  })
}

export function montarProductoForm({ producto = null, onGuardado } = {}) {
  return renderWithProviders(
    <ProductoForm
      producto={producto}
      categorias={[...new Set(PRODUCTOS.map((p) => p.categoria))]}
      onClose={() => {}}
      onGuardado={onGuardado || (() => {})}
    />,
    { ruta: '/admin/productos', barberia: CONTEXTO_BARBERIA }
  )
}

export function montarBarberosAdmin({ datos = [], error = null } = {}) {
  supabaseMock.on(
    'barberos',
    'select',
    error ? { data: null, error } : { data: datos }
  )
  supabaseMock.on('citas', 'select', { data: citasDeHoy() })
  return renderWithProviders(<BarberosAdmin />, {
    ruta: '/admin/barberos',
    barberia: CONTEXTO_BARBERIA,
  })
}

export function montarBarberoForm({ barbero = null, onGuardado } = {}) {
  return renderWithProviders(
    <BarberoForm
      barbero={barbero}
      onClose={() => {}}
      onGuardado={onGuardado || (() => {})}
    />,
    { ruta: '/admin/barberos', barberia: CONTEXTO_BARBERIA }
  )
}

export function llamadaDe(tabla, operacion) {
  return supabaseMock.llamadas.find(
    (c) => c.tipo === 'query' && c.tabla === tabla && c.operacion === operacion
  )
}

export function escriturasDe(tabla) {
  return supabaseMock.llamadas.filter(
    (c) => c.tipo === 'query' && c.tabla === tabla && c.operacion !== 'select'
  )
}

export function tarjetaDe(titulo) {
  return screen.getByText(titulo).closest('div.rounded-xl')
}

// El Blob de jsdom no tiene text()/arrayBuffer(); se lee con FileReader.
export function leerTexto(blob) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(lector.result)
    lector.onerror = () => rechazar(lector.error)
    lector.readAsText(blob)
  })
}

// jsdom no implementa URL.createObjectURL (vista previa y exportacion de la carta).
export function stubObjectUrl() {
  const antes = { crear: URL.createObjectURL, revocar: URL.revokeObjectURL }
  const crear = vi.fn(() => 'blob:mock')
  const revocar = vi.fn()
  URL.createObjectURL = crear
  URL.revokeObjectURL = revocar
  return {
    crear,
    revocar,
    restaurar() {
      URL.createObjectURL = antes.crear
      URL.revokeObjectURL = antes.revocar
    },
  }
}
