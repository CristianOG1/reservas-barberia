// tests/helpers/fixturesPublico.jsx
// Datos y montaje compartidos por las pruebas del sitio público: la portada
// (`Servicios` y `Productos`), las páginas de catálogo, `/contacto`, la
// `Navbar` y el `Hero`.
//
// Los datos del catálogo son los mismos en todas las vistas: así se puede
// comprobar que la portada y la página de catálogo cuentan lo mismo.

import { screen } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import { supabaseMock } from '../mocks/supabaseClient'

export const BARBERIA = { id: 'b1', nombre: 'Salon Demo', slug: 'kromatik' }

/**
 * Catálogo de servicios de la barbería de prueba.
 *
 * `duracion` es TEXT en la base: '30' o '50 min'. El segundo servicio no
 * tiene descripción, para poder comprobar el texto «Sin descripción».
 */
export const SERVICIOS = [
  {
    id: 's1', nombre: 'Corte de cabello', categoria: 'Cabello',
    descripcion: 'Corte clasico con lavado.', costo: 150, duracion: '30',
    imagen: null, created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 's2', nombre: 'Perfilado de barba', categoria: 'Barba',
    descripcion: '', costo: 120, duracion: '50 min',
    imagen: null, created_at: '2026-03-02T00:00:00Z',
  },
]

/** Catálogo de productos de la barbería de prueba. */
export const PRODUCTOS = [
  {
    id: 'p1', nombre: 'Aceite para barba', categoria: 'Barba',
    descripcion: 'Aceite nutritivo.', precio: 180, stock: 12,
    imagen: null, created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'p2', nombre: 'Shampoo revitalizante', categoria: 'Cabello',
    descripcion: '', precio: 220, stock: 0,
    imagen: null, created_at: '2026-03-02T00:00:00Z',
  },
]

/**
 * Monta un componente del sitio público con la barbería resuelta y el
 * catálogo configurado en el mock.
 *
 * @param {React.ReactElement} ui        Lo que se quiere renderizar
 * @param {object} opciones
 * @param {string} opciones.ruta          Ruta inicial del router
 * @param {string} opciones.tabla        'servicios' o 'productos'
 * @param {Array}  opciones.datos        Filas que devuelve la consulta
 * @param {object} opciones.error        Error de la consulta (si lo hay)
 */
export function montarPublico(ui, { ruta = '/', tabla = 'servicios', datos = [], error = null } = {}) {
  supabaseMock.on(
    tabla,
    'select',
    error ? { data: null, error } : { data: datos }
  )
  return renderWithProviders(ui, {
    ruta,
    barberia: { barberia: BARBERIA, cargando: false, slug: 'kromatik', sinSlug: false },
  })
}

/** Devuelve la llamada al mock de una tabla y operacion concretas. */
export function llamadaDe(tabla, operacion) {
  return supabaseMock.llamadas.find(
    (c) => c.tipo === 'query' && c.tabla === tabla && c.operacion === operacion
  )
}

/** Devuelve la tarjeta de un servicio o producto (la `<button>` o el `<div>`). */
export function tarjetaDe(nombre) {
  const candidatos = screen.queryAllByText(nombre)
  const elegido = candidatos.find((el) => el.closest('button')) || candidatos[0]
  return elegido?.closest('button') || elegido?.closest('div.rounded-xl') || elegido
}
