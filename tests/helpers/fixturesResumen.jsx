// tests/helpers/fixturesResumen.jsx
// Datos y montaje del resumen del panel (`ResumenPage`).
//
// El reloj va fijo en un miercoles (2026-03-11) para que las cifras del
// resumen no dependan del dia en el que se ejecuten las pruebas.

import { renderWithProviders, CONFIGURACION_POR_DEFECTO } from './renderWithProviders'
import { supabaseMock } from '../mocks/supabaseClient'
import ResumenPage from '../../src/pages/admin/ResumenPage'

/** Miercoles 2026-03-11. */
export const HOY = '2026-03-11'

export const BARBERIA = { id: 'b1', nombre: 'Salon Demo', slug: 'kromatik' }

/**
 * Configuracion de la barberia. Su nombre es DISTINTO del de `barberias` a
 * proposito: asi se comprueba que el encabezado usa el de la configuracion.
 */
export const CONFIGURACION = {
  ...CONFIGURACION_POR_DEFECTO.configuracion,
  nombre: 'Kromatik Barberia',
}

/** Catalogo de servicios: 3 servicios y 3 categorias. */
export const SERVICIOS = [
  { id: 's1', nombre: 'Corte de cabello', categoria: 'Cabello', descripcion: '', costo: 150, duracion: '30', imagen: null },
  { id: 's2', nombre: 'Perfilado de barba', categoria: 'Barba', descripcion: '', costo: 120, duracion: '50 min', imagen: null },
  { id: 's3', nombre: 'Corte + Barba', categoria: 'Combo', descripcion: '', costo: 240, duracion: '60', imagen: null },
]

/**
 * Catalogo de productos: 3 productos, 15 unidades y 2 con stock bajo
 * (el umbral es 5 unidades o menos).
 */
export const PRODUCTOS = [
  { id: 'p1', nombre: 'Aceite para barba', categoria: 'Barba', descripcion: '', precio: 180, stock: 12, imagen: null },
  { id: 'p2', nombre: 'Shampoo revitalizante', categoria: 'Cabello', descripcion: '', precio: 220, stock: 3, imagen: null },
  { id: 'p3', nombre: 'Pomada mate', categoria: 'Estilizado', descripcion: '', precio: 150, stock: 0, imagen: null },
]

/** Equipo: uno disponible y otro en pausa. */
export const BARBEROS = [
  { id: 'bar-1', nombre: 'Barbero Uno', especialidad: 'Corte clasico', disponible: true, imagen: null },
  { id: 'bar-2', nombre: 'Barbero Dos', especialidad: 'Barba', disponible: false, imagen: null },
]

/**
 * Citas: tres de hoy (una confirmada, una pendiente y una sin estado, que en
 * la base cuenta como pendiente) y una dentro de la ventana de 7 dias.
 *
 * Con estos datos el resumen muestra:
 *   Citas de hoy 3 (2 por confirmar) - 4 en los proximos 7 dias
 *   Productos 3 (2 con stock bajo) - 15 unidades en stock
 *   Barberos 1 de 2 (1 en pausa)
 *   Servicios 3 (3 categorias) - 6 items totales
 */
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

/**
 * Monta el resumen del panel.
 *
 * @param {object} opciones
 * @param {Array}  opciones.servicios   Catalogo de servicios
 * @param {Array}  opciones.productos   Catalogo de productos
 * @param {Array}  opciones.barberos    Equipo
 * @param {Array}  opciones.citas       Citas de la ventana de 7 dias
 * @param {object} opciones.error       Error de carga (si viene, TODAS las
 *                                      consultas fallan con el)
 * @param {object} opciones.configuracion Fila de `configuracion` a mostrar
 */
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
