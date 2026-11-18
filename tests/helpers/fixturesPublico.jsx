// Datos y montaje del sitio público (portada, catálogos, /contacto, Navbar y Hero).
// El catálogo es el mismo en todas las vistas para comparar recuentos.

import { screen } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import { supabaseMock } from '../mocks/supabaseClient'

export const BARBERIA = { id: 'b1', nombre: 'Salon Demo', slug: 'kromatik' }

// `duracion` es TEXT: '30' o '50 min'. El segundo servicio sin descripción prueba «Sin descripción».
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

// Configura el mock de `tabla` ('servicios' o 'productos') y monta con la barbería resuelta.
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

export function llamadaDe(tabla, operacion) {
  return supabaseMock.llamadas.find(
    (c) => c.tipo === 'query' && c.tabla === tabla && c.operacion === operacion
  )
}

export function tarjetaDe(nombre) {
  const candidatos = screen.queryAllByText(nombre)
  const elegido = candidatos.find((el) => el.closest('button')) || candidatos[0]
  return elegido?.closest('button') || elegido?.closest('div.rounded-xl') || elegido
}
