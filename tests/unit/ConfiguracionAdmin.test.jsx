// tests/unit/ConfiguracionAdmin.test.jsx
// Datos de la barbería: nombre, ubicación, logo y descripción.
//
// Matriz v3: F-12 «Configurar los datos del salón y los interruptores de
// recordatorio». Sus dos casos: CP-12-01 (guardar los datos y que aparezcan
// en el sitio de esa barbería) y CP-12-02 (el interruptor de recordatorios).

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabaseMock } from '../mocks/supabaseClient'
import { renderWithProviders } from '../helpers/renderWithProviders'
import ConfiguracionAdmin from '../../src/pages/admin/ConfiguracionAdmin'
import { stubObjectUrl } from '../helpers/fixturesCatalogo'

const BARBERIA = { id: 'b1', nombre: 'Salon Demo', slug: 'kromatik' }

const CONFIGURACION = {
  id: 'cfg-1',
  barberia_id: 'b1',
  nombre: 'Salon Demo',
  estado: 'Estado de México',
  municipio: 'Nicolás Romero',
  descripcion: 'Una barbería de barrio.',
  logo: 'https://ejemplo.com/logo.png',
  updated_at: '2026-03-01T10:00:00Z',
}

/** Monta el formulario con la configuración de la barbería. */
function montar({ configuracion = CONFIGURACION, refrescar } = {}) {
  return renderWithProviders(<ConfiguracionAdmin />, {
    ruta: '/admin/configuracion',
    barberia: { barberia: BARBERIA, cargando: false, slug: 'kromatik', sinSlug: false },
    configuracion: {
      configuracion,
      cargando: false,
      refrescar: refrescar || (async () => {}),
    },
  })
}

/** Devuelve la llamada de escritura a `configuracion`. */
function llamadaConfiguracion() {
  return supabaseMock.llamadas.find(
    (c) => c.tipo === 'query' && c.tabla === 'configuracion' && c.operacion === 'upsert'
  )
}

describe('ConfiguracionAdmin · los datos (F-12)', () => {
  it('F-12 · el formulario llega con los datos de la barbería', () => {
    montar()

    expect(screen.getByLabelText('Nombre de la barbería *')).toHaveValue('Salon Demo')
    expect(screen.getByLabelText('Estado')).toHaveValue('Estado de México')
    expect(screen.getByLabelText('Municipio')).toHaveValue('Nicolás Romero')
    expect(screen.getByLabelText('Descripción')).toHaveValue('Una barbería de barrio.')
  })

  it('F-12 · CP-12-01 · al guardar se hace un upsert acotado a la barbería', async () => {
    const user = userEvent.setup()
    const refrescar = vi.fn(async () => {})
    montar({ refrescar })

    await user.clear(screen.getByLabelText('Nombre de la barbería *'))
    await user.type(screen.getByLabelText('Nombre de la barbería *'), 'Salon Demo Premium')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(llamadaConfiguracion()).toBeDefined()
    })

    const llamada = llamadaConfiguracion()
    expect(llamada.carga).toMatchObject({
      barberia_id: 'b1',
      nombre: 'Salon Demo Premium',
      estado: 'Estado de México',
      municipio: 'Nicolás Romero',
      descripcion: 'Una barbería de barrio.',
      // Sin logo nuevo se conserva el que ya había.
      logo: 'https://ejemplo.com/logo.png',
    })
    // El conflicto se resuelve por `barberia_id`, no por un `id = 1` fijo.
    expect(llamada.opciones).toEqual({ onConflict: 'barberia_id' })
    expect(refrescar).toHaveBeenCalled()
  })

  it('F-12 · los campos que se dejan vacíos se guardan como null', async () => {
    const user = userEvent.setup()
    montar()

    await user.clear(screen.getByLabelText('Estado'))
    await user.clear(screen.getByLabelText('Municipio'))
    await user.clear(screen.getByLabelText('Descripción'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(llamadaConfiguracion()).toBeDefined()
    })
    expect(llamadaConfiguracion().carga).toMatchObject({
      estado: null,
      municipio: null,
      descripcion: null,
    })
  })

  it('F-12 · al guardar bien se avisa de que quedó guardado', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Configuración guardada.')
    })
  })

  it('F-12 · si la escritura falla, se avisa y no se dice que quedó guardado', async () => {
    const user = userEvent.setup()
    supabaseMock.on('configuracion', 'upsert', { data: null, error: { message: 'sin permiso' } })
    montar()

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudo guardar la configuración, intenta de nuevo.'
      )
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('ConfiguracionAdmin · el logo (F-12)', () => {
  it('F-12 · un logo nuevo se sube a la carpeta de la barbería y se guarda su URL', async () => {
    const user = userEvent.setup()
    const url = stubObjectUrl()
    montar()

    await user.upload(
      screen.getByLabelText('Logo'),
      new File(['contenido'], 'logo.png', { type: 'image/png' })
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(llamadaConfiguracion()).toBeDefined()
    })

    const subida = supabaseMock.llamadas.find((c) => c.tipo === 'storage.upload')
    expect(subida).toBeDefined()
    expect(subida.argumentos.ruta).toContain('b1/configuracion/')
    expect(subida.argumentos.ruta).toContain('-logo.png')
    expect(llamadaConfiguracion().carga.logo).toContain('/imagenes/b1/configuracion/')

    url.restaurar()
  })

  it('F-12 · sin logo nuevo no se sube nada y se conserva el que había', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(llamadaConfiguracion()).toBeDefined()
    })
    expect(supabaseMock.llamadas.filter((c) => c.tipo === 'storage.upload')).toHaveLength(0)
    expect(llamadaConfiguracion().carga.logo).toBe('https://ejemplo.com/logo.png')
  })

  it('F-12 · CP-12-02 · una imagen de más de 2 MB se rechaza con su motivo', async () => {
    const user = userEvent.setup()
    montar()

    const grande = new File([new Uint8Array(2 * 1024 * 1024 + 10)], 'grande.png', {
      type: 'image/png',
    })
    await user.upload(screen.getByLabelText('Logo'), grande)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'La imagen pesa más de 2 MB. Elige una más liviana.'
      )
    })
    // No se guarda nada: el logo inválido nunca llega al upsert.
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => {
      expect(llamadaConfiguracion()).toBeDefined()
    })
    expect(llamadaConfiguracion().carga.logo).toBe('https://ejemplo.com/logo.png')
  })

  it('F-12 · CP-12-02 · un archivo que no es imagen se rechaza con su motivo', async () => {
    // `applyAccept: false` desactiva el filtro del atributo `accept`: el
    // explorador de archivos ya no deja elegir un .txt, pero la aplicación
    // valida el MIME por su cuenta (arrastrar y soltar, o un archivo renombrado).
    const user = userEvent.setup({ applyAccept: false })
    montar()

    await user.upload(
      screen.getByLabelText('Logo'),
      new File(['texto'], 'notas.txt', { type: 'text/plain' })
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'El archivo debe ser una imagen (JPG, PNG o WebP).'
      )
    })
  })
})
