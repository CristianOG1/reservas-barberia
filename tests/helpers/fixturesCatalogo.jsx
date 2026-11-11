// tests/helpers/fixturesCatalogo.jsx
// Datos y montaje compartidos por las pruebas de los CRUD del panel:
// ServiciosAdmin/ServicioForm, ProductosAdmin/ProductoForm y
// BarberosAdmin/BarberoForm.
//
// El reloj va fijo en un miercoles para que las metricas y los filtros no
// dependan del dia en el que se ejecuten las pruebas.

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

/**
 * Catalogo de servicios de prueba.
 *
 * Las duraciones mezclan los dos formatos que conviven en la base: `duracion`
 * es TEXT y puede traer '30' o '50 min' (AGENTS.md §18.32).
 *
 * Con estos datos las metricas del panel son:
 *   Catalogo 3 (3 categorias) · Tarifa promedio $170 (rango $120-$240)
 *   Duracion promedio 47 min (servicios de 30 a 60 min)
 */
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

/**
 * Catalogo de productos de prueba.
 *
 * Con estos datos las metricas del panel son:
 *   Catalogo 3 (3 activos) · Valor del inventario $2,820 (15 unidades)
 *   Alerta de reabastecimiento 2 (los que tienen 5 o menos unidades)
 */
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

/**
 * Equipo de prueba: uno disponible y otro en pausa.
 *
 * `rating` es numerico y `total_resenas` un entero, tal como los guarda la BD.
 */
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

/** Registra el reloj fijo. Se llama una vez por archivo de prueba. */
export function usarRelojFijo() {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: AHORA })
  })
  afterEach(() => {
    vi.useRealTimers()
  })
}

/**
 * El "hoy" que usa el panel.
 *
 * `BarberosAdmin` lo calcula con `new Date().toISOString().split('T')[0]`, que
 * es fecha **UTC**, no local. Las citas de prueba usan esta misma expresion
 * para que el conteo no dependa de la zona horaria de la maquina.
 */
export function hoyDeLaApp() {
  return new Date().toISOString().split('T')[0]
}

/** Citas de hoy para el panel de barberos: dos del Uno y una del Dos. */
export function citasDeHoy() {
  const hoy = hoyDeLaApp()
  return [
    { id: 'c1', nombre: 'Ana', telefono: '5512345678', correo: 'ana@ejemplo.com', servicio: 'Corte de cabello', fecha: hoy, hora: '09:00:00', estado: 'confirmada', barbero_id: 'bar-1', total: 150, productos: [] },
    { id: 'c2', nombre: 'Luis', telefono: '5522222222', correo: 'luis@ejemplo.com', servicio: 'Barba', fecha: hoy, hora: '11:00:00', estado: 'pendiente', barbero_id: 'bar-1', total: 120, productos: [] },
    { id: 'c3', nombre: 'Pau', telefono: '5566666666', correo: 'pau@ejemplo.com', servicio: 'Barba', fecha: hoy, hora: '16:00:00', estado: 'pendiente', barbero_id: 'bar-2', total: 120, productos: [] },
  ]
}

/* ===== Montajes ===== */

const CONTEXTO_BARBERIA = {
  barberia: BARBERIA,
  cargando: false,
  slug: 'kromatik',
  sinSlug: false,
}

/** Monta el catalogo de servicios. */
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

/** Monta el formulario de un servicio (alta, edicion o detalle). */
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

/** Monta el catalogo de productos. */
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

/** Monta el formulario de un producto (alta o edicion). */
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

/** Monta el equipo de barberos. */
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

/** Monta el formulario de un barbero (alta o edicion). */
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

/* ===== Utilidades ===== */

/** Devuelve la llamada al mock de una tabla y operacion concretas. */
export function llamadaDe(tabla, operacion) {
  return supabaseMock.llamadas.find(
    (c) => c.tipo === 'query' && c.tabla === tabla && c.operacion === operacion
  )
}

/** Devuelve todas las llamadas de escritura a una tabla. */
export function escriturasDe(tabla) {
  return supabaseMock.llamadas.filter(
    (c) => c.tipo === 'query' && c.tabla === tabla && c.operacion !== 'select'
  )
}

/** Devuelve la tarjeta de metricas cuyo pie de foto es ese texto. */
export function tarjetaDe(titulo) {
  return screen.getByText(titulo).closest('div.rounded-xl')
}

/**
 * Lee el texto de un `Blob`.
 *
 * El `Blob` de jsdom no implementa `text()` ni `arrayBuffer()`: solo tiene
 * `slice`, `size` y `type`. Se usa el `FileReader`, que si lo implementa.
 */
export function leerTexto(blob) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(lector.result)
    lector.onerror = () => rechazar(lector.error)
    lector.readAsText(blob)
  })
}

/**
 * jsdom no implementa `URL.createObjectURL` (lo usan la vista previa de las
 * imagenes y la exportacion de la carta). Este helper lo sustituye por un
 * `vi.fn` y devuelve como restaurarlo.
 */
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
