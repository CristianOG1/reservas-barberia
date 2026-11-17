// tests/unit/ResumenPage.test.jsx
// El resumen del panel: las cuatro tarjetas de cifras, la agenda de hoy, el
// inventario y la popularidad.
//
// Matriz v3: F-08 «Gestionar la agenda de citas y el resumen del salón». Su
// criterio dice que «las cuatro cifras provienen de los datos reales»: estas
// pruebas comprueban, cifra por cifra, que no hay ni un solo numero de
// ejemplo.

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabaseMock } from '../mocks/supabaseClient'
import { llamadaDe, usarRelojFijo } from '../helpers/fixturesCatalogo'
import {
  BARBEROS,
  CITAS,
  PRODUCTOS,
  SERVICIOS,
  montarResumen,
} from '../helpers/fixturesResumen'

usarRelojFijo()

/** La tarjeta de una metrica: la que lleva ese texto como pie de foto. */
function tarjetaDe(titulo) {
  return screen.getByText(titulo).closest('div.rounded-xl')
}

/** La cifra grande de una tarjeta. */
function valorDe(titulo) {
  return tarjetaDe(titulo).querySelectorAll('p')[0].textContent
}

/** El texto de apoyo de una tarjeta (el detalle y el apoyo, con el punto). */
function detalleDe(titulo) {
  return tarjetaDe(titulo).querySelectorAll('p')[2].textContent
}

/** La fila de un producto del inventario. */
function filaDeInventario(nombre) {
  return screen.getByText(nombre).closest('div.flex.items-center')
}

describe('ResumenPage · cifras del panel', () => {
  it('F-08 · cada tarjeta muestra las cifras de los datos reales', async () => {
    montarResumen()

    await screen.findByText('Panel General de Operaciones')

    // Citas de hoy: hay tres, y dos sin confirmar (una va con estado null,
    // que en la base cuenta como pendiente).
    expect(valorDe('Citas para Hoy')).toBe('3')
    expect(detalleDe('Citas para Hoy')).toContain('2 por confirmar')
    expect(detalleDe('Citas para Hoy')).toContain('4 en los próximos 7 días')

    // Productos: tres en catalogo, dos con stock bajo y 15 unidades.
    expect(valorDe('Productos en catálogo')).toBe('3')
    expect(detalleDe('Productos en catálogo')).toContain('2 con stock bajo')
    expect(detalleDe('Productos en catálogo')).toContain('15 unidades en stock')

    // Barberos: uno disponible de dos, el otro en pausa.
    expect(valorDe('Barberos Activos')).toBe('1 de 2')
    expect(detalleDe('Barberos Activos')).toContain('1 en pausa')

    // Servicios: tres, en tres categorias, y seis items en total.
    expect(valorDe('Servicios en catálogo')).toBe('3')
    expect(detalleDe('Servicios en catálogo')).toContain('3 categorías')
    expect(detalleDe('Servicios en catálogo')).toContain('6 ítems totales')
  })

  it('F-08 · sin datos no aparece ninguna cifra inventada', async () => {
    montarResumen({ servicios: [], productos: [], barberos: [], citas: [] })

    await screen.findByText('Panel General de Operaciones')

    expect(valorDe('Citas para Hoy')).toBe('0')
    expect(valorDe('Productos en catálogo')).toBe('0')
    expect(valorDe('Barberos Activos')).toBe('0 de 0')
    expect(valorDe('Servicios en catálogo')).toBe('0')

    // Ni las cifras de ejemplo que el panel se inventaba antes…
    expect(tarjetaDe('Citas para Hoy')).not.toHaveTextContent('12')
    expect(screen.queryByText(/\+12%/)).not.toBeInTheDocument()
    // …ni el turno inventado del encabezado.
    expect(screen.queryByText(/Sede Central Atelier/)).not.toBeInTheDocument()

    // Y las pantallas vacias lo dicen.
    expect(screen.getByText('No hay citas agendadas para hoy.')).toBeInTheDocument()
    expect(screen.getByText('Aún no hay productos en el catálogo.')).toBeInTheDocument()
  })

  it('F-08 · el encabezado usa el nombre real de la barbería', async () => {
    montarResumen()

    await screen.findByText('Panel General de Operaciones')

    // El nombre sale de la fila de `configuracion`, no del de `barberias`.
    expect(screen.getByText('Kromatik Barberia')).toBeInTheDocument()
    expect(screen.queryByText('Salon Demo')).not.toBeInTheDocument()
  })

  it('F-08 · sin fila de configuración se usa el nombre de la barbería', async () => {
    montarResumen({ configuracion: { nombre: '' } })

    await screen.findByText('Panel General de Operaciones')

    expect(screen.getByText('Salon Demo')).toBeInTheDocument()
  })

  it('F-08 · carga solo los datos de la barbería activa', async () => {
    montarResumen()

    await screen.findByText('Panel General de Operaciones')

    expect(llamadaDe('servicios', 'select').filtros).toEqual([
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
    expect(llamadaDe('productos', 'select').filtros).toEqual([
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
    expect(llamadaDe('barberos', 'select').filtros).toEqual([
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
    ])
    // Las citas se piden acotadas a la ventana de los proximos 7 dias.
    expect(llamadaDe('citas', 'select').filtros).toEqual([
      { op: 'eq', columna: 'barberia_id', valor: 'b1' },
      { op: 'gte', columna: 'fecha', valor: expect.any(String) },
      { op: 'lte', columna: 'fecha', valor: expect.any(String) },
    ])
  })
})

describe('ResumenPage · inventario y agenda', () => {
  it('F-08 · el inventario muestra el stock real de cada producto', async () => {
    montarResumen()

    await screen.findByText('Panel General de Operaciones')

    expect(filaDeInventario('Pomada mate')).toHaveTextContent('0 en stock')
    expect(filaDeInventario('Shampoo revitalizante')).toHaveTextContent('3 en stock')
    expect(filaDeInventario('Aceite para barba')).toHaveTextContent('12 en stock')
    // Y el precio sale del dato, no de un ejemplo.
    expect(filaDeInventario('Pomada mate')).toHaveTextContent('$150 MXN')
  })

  it('F-08 · el inventario ordena por el stock más bajo', async () => {
    montarResumen()

    await screen.findByText('Panel General de Operaciones')

    const nombres = screen
      .getAllByText(/Pomada mate|Shampoo revitalizante|Aceite para barba/)
      .map((n) => n.textContent)
    expect(nombres).toEqual(['Pomada mate', 'Shampoo revitalizante', 'Aceite para barba'])
  })

  it('F-08 · la agenda de hoy muestra las citas con su estado', async () => {
    montarResumen()

    await screen.findByText('Panel General de Operaciones')

    const fila = screen.getByText('Ana').closest('tr')
    expect(fila).toHaveTextContent('09:00')
    expect(fila).toHaveTextContent('5512345678')
    expect(fila).toHaveTextContent('Corte de cabello')
    expect(fila).toHaveTextContent('Barbero Uno')
    expect(fila).toHaveTextContent('Confirmada')

    // Una cita sin barbero sale como "Sin asignar".
    expect(screen.getByText('Luis').closest('tr')).toHaveTextContent('Sin asignar')
    // Y la cita sin estado cuenta como pendiente.
    expect(screen.getByText('Pau').closest('tr')).toHaveTextContent('Pendiente')
  })

  it('F-08 · la popularidad sale de las citas de la semana', async () => {
    montarResumen()

    await screen.findByText('Panel General de Operaciones')

    // 'Corte de cabello' aparece en dos de las cuatro citas: la mitad.
    const bloque = screen
      .getByText('Popularidad Semanal · Servicios Más Solicitados')
      .closest('div.rounded-xl')
    expect(within(bloque).getByText('Corte de cabello')).toBeInTheDocument()
    expect(within(bloque).getByText('50%')).toBeInTheDocument()
    expect(within(bloque).getByText('2 sesiones del ciclo')).toBeInTheDocument()
  })
})

describe('ResumenPage · avisos y acciones', () => {
  it('F-08 · avisa cuando la carga falla y ofrece reintentar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarResumen({ error: { message: 'sin conexion' } })

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar el resumen')
    // Con la carga fallida no se muestran cifras: seria un estado falso.
    expect(screen.queryByText('Citas para Hoy')).not.toBeInTheDocument()

    // Ahora la base responde y el reintento trae los datos.
    supabaseMock.on('servicios', 'select', { data: SERVICIOS })
    supabaseMock.on('productos', 'select', { data: PRODUCTOS })
    supabaseMock.on('barberos', 'select', { data: BARBEROS })
    supabaseMock.on('citas', 'select', { data: CITAS })

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => {
      expect(screen.getByText('Panel General de Operaciones')).toBeInTheDocument()
    })
    expect(valorDe('Servicios en catálogo')).toBe('3')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('F-08 · «Ver Calendario Completo» lleva a la agenda de citas', async () => {
    montarResumen()

    await screen.findByText('Panel General de Operaciones')

    const enlace = screen.getByRole('link', { name: 'Ver Calendario Completo' })
    expect(enlace).toHaveAttribute('href', '/admin/citas')
  })

  it('F-08 · «+ Nueva Cita Rápida» abre el alta manual con el catálogo real', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    montarResumen()

    await screen.findByText('Panel General de Operaciones')
    await user.click(screen.getByRole('button', { name: '+ Nueva Cita Rápida' }))

    expect(screen.getByText('Nueva cita manual')).toBeInTheDocument()
    // El formulario recibe el catalogo y el equipo reales de la barberia.
    expect(screen.getByLabelText('Servicio contratado *')).toHaveTextContent('Corte de cabello')
    expect(screen.getByLabelText('Barbero asignado')).toHaveTextContent('Barbero Uno')
  })
})
