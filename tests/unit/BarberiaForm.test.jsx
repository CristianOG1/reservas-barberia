// Alta y edición de barberías (F-16: CP-16-01/02). La numeración sigue la matriz v3;
// `Casos_de_Prueba.md` aún trae la anterior (CP-14-01/02).

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabaseMock } from '../mocks/supabaseClient'
import { renderWithProviders } from '../helpers/renderWithProviders'
import BarberiaForm from '../../src/pages/superadmin/BarberiaForm'

function montar({ barberia = null, onGuardado } = {}) {
  return renderWithProviders(
    <BarberiaForm
      barberia={barberia}
      onClose={() => {}}
      onGuardado={onGuardado || (() => {})}
    />,
    { ruta: '/superadmin' }
  )
}

function llamadaFuncion() {
  return supabaseMock.llamadas.find((c) => c.tipo === 'functions.invoke')
}

describe('BarberiaForm · alta (F-16)', () => {
  it('F-16 · CP-16-01 · el slug se sugiere a partir del nombre del negocio', async () => {
    const user = userEvent.setup()
    montar()

    await user.type(screen.getByLabelText('Nombre del negocio *'), 'Barbería El Buen Corte')

    // Sin acentos, en minúsculas y con guiones simples.
    expect(screen.getByLabelText('Slug *')).toHaveValue('barberia-el-buen-corte')
  })

  it('F-16 · CP-16-01 · al guardar se llama a la Edge Function con los cuatro datos', async () => {
    const user = userEvent.setup()
    const guardado = vi.fn()
    supabaseMock.onFunction('crear-barberia', { data: { ok: true }, error: null })
    montar({ onGuardado: guardado })

    await user.type(screen.getByLabelText('Nombre del negocio *'), 'Barbería El Buen Corte')
    await user.clear(screen.getByLabelText('Slug *'))
    await user.type(screen.getByLabelText('Slug *'), 'el-buen-corte')
    await user.type(screen.getByLabelText('Correo del dueño *'), 'dueno@ejemplo.com')
    await user.type(screen.getByLabelText('Contraseña temporal *'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Crear barbería' }))

    await waitFor(() => {
      expect(guardado).toHaveBeenCalled()
    })

    const llamada = llamadaFuncion()
    expect(llamada.nombre).toBe('crear-barberia')
    expect(llamada.argumentos).toEqual({
      nombre: 'Barbería El Buen Corte',
      slug: 'el-buen-corte',
      correo: 'dueno@ejemplo.com',
      password: 'Demo1234!',
    })
  })

  it('F-16 · la contraseña se muestra en claro, para poder copiarla y pasársela al dueño', () => {
    montar()

    // A propósito: el dueño recibe la contraseña temporal a mano.
    expect(screen.getByLabelText('Contraseña temporal *')).toHaveAttribute('type', 'text')
  })
})

describe('BarberiaForm · slug inválido (F-16)', () => {
  it('F-16 · CP-16-02 · un slug reservado se rechaza con el motivo', async () => {
    const user = userEvent.setup()
    montar()

    await user.type(screen.getByLabelText('Nombre del negocio *'), 'Panel')
    await user.clear(screen.getByLabelText('Slug *'))
    await user.type(screen.getByLabelText('Slug *'), 'admin')
    await user.type(screen.getByLabelText('Correo del dueño *'), 'dueno@ejemplo.com')
    await user.type(screen.getByLabelText('Contraseña temporal *'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Crear barbería' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        '"admin" es una palabra reservada. Elige otro slug.'
      )
    })
    // No se llama a la Edge Function: el alta no se intenta.
    expect(llamadaFuncion()).toBeUndefined()
  })

  it('F-16 · CP-16-02 · un slug de menos de tres caracteres se rechaza con el motivo', async () => {
    const user = userEvent.setup()
    montar()

    await user.type(screen.getByLabelText('Nombre del negocio *'), 'Ab')
    await user.clear(screen.getByLabelText('Slug *'))
    await user.type(screen.getByLabelText('Slug *'), 'ab')
    await user.type(screen.getByLabelText('Correo del dueño *'), 'dueno@ejemplo.com')
    await user.type(screen.getByLabelText('Contraseña temporal *'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Crear barbería' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'El slug debe tener entre 3 y 40 caracteres.'
      )
    })
    expect(llamadaFuncion()).toBeUndefined()
  })

  it('F-16 · CP-16-02 · un slug mal formado se rechaza con el motivo', async () => {
    const user = userEvent.setup()
    montar()

    await user.type(screen.getByLabelText('Nombre del negocio *'), 'Mal formado')
    await user.clear(screen.getByLabelText('Slug *'))
    await user.type(screen.getByLabelText('Slug *'), 'mal--formado')
    await user.type(screen.getByLabelText('Correo del dueño *'), 'dueno@ejemplo.com')
    await user.type(screen.getByLabelText('Contraseña temporal *'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Crear barbería' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'El slug solo admite minúsculas, números y guiones simples'
      )
    })
    expect(llamadaFuncion()).toBeUndefined()
  })

  it('F-16 · un nombre de solo espacios se rechaza con el motivo', async () => {
    const user = userEvent.setup()
    montar()

    // El navegador acepta solo espacios; el aviso es de la app. El slug se escribe a mano para que no salga vacío.
    await user.type(screen.getByLabelText('Nombre del negocio *'), '   ')
    await user.clear(screen.getByLabelText('Slug *'))
    await user.type(screen.getByLabelText('Slug *'), 'barberia')
    await user.type(screen.getByLabelText('Correo del dueño *'), 'dueno@ejemplo.com')
    await user.type(screen.getByLabelText('Contraseña temporal *'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Crear barbería' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'El nombre del negocio es obligatorio.'
      )
    })
  })
})

describe('BarberiaForm · correo y contraseña (F-16)', () => {
  it('F-16 · un correo sin dominio completo se rechaza con el motivo', async () => {
    const user = userEvent.setup()
    montar()

    await user.type(screen.getByLabelText('Nombre del negocio *'), 'Barbería El Buen Corte')
    // El navegador acepta el correo sin punto en el dominio; la validación de la app lo rechaza.
    await user.type(screen.getByLabelText('Correo del dueño *'), 'dueno@ejemplo')
    await user.type(screen.getByLabelText('Contraseña temporal *'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Crear barbería' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Escribe un correo válido para el dueño.'
      )
    })
    expect(llamadaFuncion()).toBeUndefined()
  })

  it('F-16 · una contraseña de menos de ocho caracteres se rechaza con el motivo', async () => {
    const user = userEvent.setup()
    montar()

    await user.type(screen.getByLabelText('Nombre del negocio *'), 'Barbería El Buen Corte')
    await user.type(screen.getByLabelText('Correo del dueño *'), 'dueno@ejemplo.com')
    await user.type(screen.getByLabelText('Contraseña temporal *'), 'corta')
    await user.click(screen.getByRole('button', { name: 'Crear barbería' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'La contraseña temporal debe tener al menos 8 caracteres.'
      )
    })
    expect(llamadaFuncion()).toBeUndefined()
  })
})

describe('BarberiaForm · error de la Edge Function (F-16)', () => {
  it('F-16 · muestra el motivo que devuelve la función, no un error genérico', async () => {
    const user = userEvent.setup()
    supabaseMock.onFunction('crear-barberia', {
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        // supabase-js deja la `Response` original en `error.context`.
        context: {
          json: async () => ({ error: 'El slug "kromatik" ya está en uso.' }),
        },
      },
    })
    montar()

    await user.type(screen.getByLabelText('Nombre del negocio *'), 'Kromatik')
    await user.type(screen.getByLabelText('Correo del dueño *'), 'dueno@ejemplo.com')
    await user.type(screen.getByLabelText('Contraseña temporal *'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Crear barbería' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'El slug "kromatik" ya está en uso.'
      )
    })
  })

  it('F-16 · si la función responde con error dentro del cuerpo, también se muestra', async () => {
    const user = userEvent.setup()
    supabaseMock.onFunction('crear-barberia', {
      data: { error: 'Ya existe una cuenta con ese correo.' },
      error: null,
    })
    montar()

    await user.type(screen.getByLabelText('Nombre del negocio *'), 'Kromatik')
    await user.type(screen.getByLabelText('Correo del dueño *'), 'dueno@ejemplo.com')
    await user.type(screen.getByLabelText('Contraseña temporal *'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Crear barbería' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Ya existe una cuenta con ese correo.'
      )
    })
  })

  it('F-16 · si la función falla sin motivo legible, sale el texto genérico', async () => {
    const user = userEvent.setup()
    supabaseMock.onFunction('crear-barberia', {
      data: null,
      error: { message: 'boom' },
    })
    montar()

    await user.type(screen.getByLabelText('Nombre del negocio *'), 'Kromatik')
    await user.type(screen.getByLabelText('Correo del dueño *'), 'dueno@ejemplo.com')
    await user.type(screen.getByLabelText('Contraseña temporal *'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Crear barbería' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudo crear la barbería. Intenta de nuevo.'
      )
    })
  })
})

describe('BarberiaForm · edición (F-16)', () => {
  const BARBERIA = { id: 'b1', nombre: 'Kromatik', slug: 'kromatik', activa: true }

  it('F-16 · en edición solo se puede cambiar el nombre', () => {
    montar({ barberia: BARBERIA })

    expect(screen.getByText('Editar barbería')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del negocio *')).toHaveValue('Kromatik')
    // El slug es parte de la dirección: no se edita.
    expect(screen.getByLabelText('Slug *')).toBeDisabled()
    // Y no se piden correo ni contraseña: la cuenta ya existe.
    expect(screen.queryByLabelText('Correo del dueño *')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Contraseña temporal *')).not.toBeInTheDocument()
  })

  it('F-16 · al guardar en edición solo se escribe el nombre', async () => {
    const user = userEvent.setup()
    const guardado = vi.fn()
    supabaseMock.on('barberias', 'update', { data: null, error: null, count: 1 })
    montar({ barberia: BARBERIA, onGuardado: guardado })

    await user.clear(screen.getByLabelText('Nombre del negocio *'))
    await user.type(screen.getByLabelText('Nombre del negocio *'), 'Kromatik Premium')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(guardado).toHaveBeenCalled()
    })

    const llamada = supabaseMock.llamadas.find(
      (c) => c.tipo === 'query' && c.tabla === 'barberias' && c.operacion === 'update'
    )
    expect(llamada.carga).toEqual({ nombre: 'Kromatik Premium' })
    expect(llamada.filtros).toEqual([{ op: 'eq', columna: 'id', valor: 'b1' }])
    // En edición no se llama a la Edge Function: no hay que crear nada.
    expect(llamadaFuncion()).toBeUndefined()
  })

  it('F-16 · si la edición no afecta a ninguna fila, avisa', async () => {
    const user = userEvent.setup()
    supabaseMock.on('barberias', 'update', { data: null, error: null, count: 0 })
    montar({ barberia: BARBERIA })

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'La barbería no se actualizó. Revisa que sigas como superadmin.'
      )
    })
  })

  it('F-16 · en edición, un nombre en blanco se rechaza con el motivo', async () => {
    const user = userEvent.setup()
    montar({ barberia: BARBERIA })

    // Solo espacios: aviso de la app, no del navegador.
    await user.clear(screen.getByLabelText('Nombre del negocio *'))
    await user.type(screen.getByLabelText('Nombre del negocio *'), '   ')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'El nombre del negocio es obligatorio.'
      )
    })
    expect(
      supabaseMock.llamadas.find(
        (c) => c.tipo === 'query' && c.tabla === 'barberias' && c.operacion === 'update'
      )
    ).toBeUndefined()
  })
})

describe('BarberiaForm · huecos (F-16)', () => {

  it('F-16 · el texto de ayuda del slug enseña el dominio base real', async () => {
    // El dominio viene de `VITE_DOMINIO_BASE` (antes `tusoftware.com` hardcodeado), igual que en `BarberiasSuper`.
    vi.stubEnv('VITE_DOMINIO_BASE', 'gools.com.mx')
    montar()

    expect(screen.getByText(/Será la dirección del sitio/)).toHaveTextContent(
      'https://<slug>.gools.com.mx'
    )
    expect(screen.getByText(/Será la dirección del sitio/)).not.toHaveTextContent(
      'tusoftware.com'
    )
  })

  it('F-16 · sin dominio configurado, el texto de ayuda no inventa uno', () => {
    vi.stubEnv('VITE_DOMINIO_BASE', '')
    montar()

    expect(screen.getByText(/Será la dirección del sitio/)).toHaveTextContent(
      'https://<slug>.<dominio del software>'
    )
  })
})
