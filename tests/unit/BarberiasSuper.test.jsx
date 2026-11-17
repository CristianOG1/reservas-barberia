// tests/unit/BarberiasSuper.test.jsx
// Panel del proveedor del software: la lista de barberías con sus conteos,
// los filtros, la paginación y la activación/desactivación.
//
// Matriz v3: F-15 «Administrar las barberías registradas». Sus dos casos:
// CP-15-01 (el listado con nombre, slug, estado y conteos) y CP-15-02 (el
// contador de citas de una barbería).
//
// ⚠ La numeración de los casos sigue a la **matriz v3**: F-15 → CP-15-01/02.
// El archivo `Casos_de_Prueba.md` de la bóveda todavía trae la numeración
// anterior, donde estos mismos casos son CP-13-01/CP-13-02.

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabaseMock } from '../mocks/supabaseClient'
import { renderWithProviders } from '../helpers/renderWithProviders'
import BarberiasSuper from '../../src/pages/superadmin/BarberiasSuper'

/**
 * Lo que devuelve la RPC `superadmin_resumen_barberias`: una fila por
 * barbería con los conteos ya agregados (el panel no hace N+1).
 */
const BARBERIAS = [
  {
    id: 'b1', nombre: 'Kromatik', slug: 'kromatik', activa: true,
    created_at: '2026-01-15T12:00:00Z', citas_mes: 12, citas_total: 34,
    servicios: 3, barberos: 2, productos: 13,
  },
  {
    id: 'b2', nombre: 'Barber Shop', slug: 'barber-shop', activa: true,
    created_at: '2026-02-20T12:00:00Z', citas_mes: 5, citas_total: 7,
    servicios: 1, barberos: 1, productos: 2,
  },
  {
    id: 'b3', nombre: 'Barbería Norte', slug: 'barberia-norte', activa: false,
    created_at: '2026-03-01T12:00:00Z', citas_mes: 0, citas_total: 2,
    servicios: 2, barberos: 0, productos: 0,
  },
]

/** Monta el panel con las barberías de la RPC. */
function montar({ datos = BARBERIAS, error = null } = {}) {
  supabaseMock.onRpc(
    'superadmin_resumen_barberias',
    error ? { data: null, error } : { data: datos }
  )
  return renderWithProviders(<BarberiasSuper />, { ruta: '/superadmin' })
}

/** Devuelve la fila de la tabla de una barbería. */
function filaDe(nombre) {
  return screen.getByText(nombre).closest('tr')
}

/** Devuelve la llamada a la RPC del resumen. */
function rpcResumen() {
  return supabaseMock.llamadas.find(
    (c) => c.tipo === 'rpc' && c.nombre === 'superadmin_resumen_barberias'
  )
}

/**
 * Devuelve la tarjeta de una métrica.
 *
 * El pie de foto de la métrica es un `<p>`; el mismo texto puede estar en otro
 * sitio (el título de la página es un `<h1>`), así que se busca el `<p>`.
 */
function tarjetaDe(titulo) {
  const etiqueta = screen.getAllByText(titulo).find((el) => el.tagName === 'P')
  return etiqueta.closest('div.rounded-xl')
}

describe('BarberiasSuper · listado (F-15)', () => {
  it('F-15 · CP-15-01 · el listado sale de la RPC del resumen', async () => {
    montar()

    await screen.findByText('Kromatik')

    expect(rpcResumen()).toBeDefined()
    expect(rpcResumen().argumentos).toBeUndefined()
    // Una sola llamada: los conteos vienen agregados en la misma fila.
    expect(
      supabaseMock.llamadas.filter(
        (c) => c.tipo === 'rpc' && c.nombre === 'superadmin_resumen_barberias'
      )
    ).toHaveLength(1)
  })

  it('F-15 · CP-15-01 · cada fila muestra nombre, slug, estado y conteos', async () => {
    montar()

    await screen.findByText('Kromatik')
    const fila = filaDe('Kromatik')

    expect(fila).toHaveTextContent('kromatik')
    expect(fila).toHaveTextContent('Activa')
    // 12 citas del mes, 3 servicios y 2 barberos.
    expect(fila).toHaveTextContent('12')
    expect(fila).toHaveTextContent('3 / 2')
    // La línea secundaria: citas totales y productos.
    expect(fila).toHaveTextContent('34 citas en total')
    expect(fila).toHaveTextContent('13 productos')
  })

  it('F-15 · CP-15-01 · una barbería inactiva se marca como Inactiva', async () => {
    montar()

    await screen.findByText('Barbería Norte')
    expect(filaDe('Barbería Norte')).toHaveTextContent('Inactiva')
  })

  it('F-15 · CP-15-02 · el contador de citas del mes es el que trae la RPC', async () => {
    montar()

    await screen.findByText('Kromatik')
    // 12 + 5 + 0: el panel suma lo que la RPC ya traía agregado por barbería.
    expect(filaDe('Kromatik')).toHaveTextContent('12')
    expect(filaDe('Barber Shop')).toHaveTextContent('5')
    expect(filaDe('Barbería Norte')).toHaveTextContent('0')
  })

  it('F-15 · las métricas del panel salen de los datos reales', async () => {
    montar()

    await screen.findByText('Kromatik')

    expect(tarjetaDe('Barberías')).toHaveTextContent('3')
    expect(tarjetaDe('Activas')).toHaveTextContent('2')
    expect(tarjetaDe('Inactivas')).toHaveTextContent('1')
    expect(tarjetaDe('Citas del mes')).toHaveTextContent('17')
  })
})

describe('BarberiasSuper · filtros (F-15)', () => {
  it('F-15 · el buscador filtra por nombre', async () => {
    const user = userEvent.setup()
    montar()

    await screen.findByText('Kromatik')
    await user.type(screen.getByLabelText('Filtrar por nombre o slug'), 'norte')

    await waitFor(() => {
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('1–1')
    })
    expect(screen.getByText('Barbería Norte')).toBeInTheDocument()
    expect(screen.queryByText('Kromatik')).not.toBeInTheDocument()
  })

  it('F-15 · el buscador filtra por slug', async () => {
    const user = userEvent.setup()
    montar()

    await screen.findByText('Kromatik')
    await user.type(screen.getByLabelText('Filtrar por nombre o slug'), 'barber-shop')

    await waitFor(() => {
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('1–1')
    })
    expect(screen.getByText('Barber Shop')).toBeInTheDocument()
    expect(screen.queryByText('Kromatik')).not.toBeInTheDocument()
  })

  it('F-15 · el filtro de estado deja solo las inactivas', async () => {
    const user = userEvent.setup()
    montar()

    await screen.findByText('Kromatik')
    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'inactivas')

    await waitFor(() => {
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('1–1')
    })
    expect(screen.getByText('Barbería Norte')).toBeInTheDocument()
    expect(screen.queryByText('Kromatik')).not.toBeInTheDocument()
  })

  it('F-15 · avisa cuando nada coincide y ofrece limpiar los filtros', async () => {
    const user = userEvent.setup()
    montar()

    await screen.findByText('Kromatik')
    await user.type(screen.getByLabelText('Filtrar por nombre o slug'), 'zzz')

    await waitFor(() => {
      expect(
        screen.getByText('Ninguna barbería coincide con los filtros.')
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    await waitFor(() => {
      expect(screen.getByText('Kromatik')).toBeInTheDocument()
    })
  })

  it('F-15 · la tabla pagina de ocho en ocho', async () => {
    const user = userEvent.setup()
    const muchas = Array.from({ length: 9 }, (_, i) => ({
      ...BARBERIAS[0],
      id: `b${i}`,
      nombre: `Barbería ${i}`,
      slug: `barberia-${i}`,
    }))
    montar({ datos: muchas })

    await screen.findByText('Barbería 0')
    expect(screen.getByText(/Mostrando/)).toHaveTextContent('1–8')
    expect(screen.getByText(/Mostrando/)).toHaveTextContent('de 9')

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    await waitFor(() => {
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('9–9')
    })
    expect(screen.getByText('Barbería 8')).toBeInTheDocument()
  })
})

describe('BarberiasSuper · activar y desactivar (F-15)', () => {
  it('F-15 · desactivar pide confirmación y escribe el estado', async () => {
    const user = userEvent.setup()
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
    supabaseMock.on('barberias', 'update', { data: null, error: null, count: 1 })
    montar()

    await screen.findByText('Kromatik')
    await user.click(screen.getByRole('button', { name: 'Desactivar Kromatik' }))

    await waitFor(() => {
      expect(
        supabaseMock.llamadas.find((c) => c.tipo === 'query' && c.tabla === 'barberias' && c.operacion === 'update')
      ).toBeDefined()
    })
    const llamada = supabaseMock.llamadas.find(
      (c) => c.tipo === 'query' && c.tabla === 'barberias' && c.operacion === 'update'
    )
    expect(llamada.carga).toEqual({ activa: false })
    expect(llamada.filtros).toEqual([{ op: 'eq', columna: 'id', valor: 'b1' }])
    expect(confirmar).toHaveBeenCalledWith(
      '¿Desactivar "Kromatik"? Su sitio dejará de estar disponible para el público.'
    )

    confirmar.mockRestore()
  })

  it('F-15 · si se cancela la confirmación, no se escribe nada', async () => {
    const user = userEvent.setup()
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    montar()

    await screen.findByText('Kromatik')
    await user.click(screen.getByRole('button', { name: 'Desactivar Kromatik' }))

    expect(
      supabaseMock.llamadas.find(
        (c) => c.tipo === 'query' && c.tabla === 'barberias' && c.operacion === 'update'
      )
    ).toBeUndefined()

    confirmar.mockRestore()
  })

  it('F-15 · si la escritura no afecta a ninguna fila, avisa y no finge el cambio', async () => {
    const user = userEvent.setup()
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
    // Un UPDATE que la RLS no deja pasar afecta 0 filas SIN lanzar error.
    supabaseMock.on('barberias', 'update', { data: null, error: null, count: 0 })
    montar()

    await screen.findByText('Kromatik')
    await user.click(screen.getByRole('button', { name: 'Desactivar Kromatik' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se cambió nada. Revisa que tu cuenta siga siendo la del superadmin.'
      )
    })
    // La barbería sigue activa en la lista.
    expect(filaDe('Kromatik')).toHaveTextContent('Activa')

    confirmar.mockRestore()
  })

  it('F-15 · editar abre el modal con el nombre de la barbería', async () => {
    const user = userEvent.setup()
    montar()

    await screen.findByText('Kromatik')
    await user.click(screen.getByRole('button', { name: 'Editar Kromatik' }))

    expect(screen.getByText('Editar barbería')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del negocio *')).toHaveValue('Kromatik')
  })

  it('F-15 · el botón de alta abre el modal de nueva barbería', async () => {
    const user = userEvent.setup()
    montar()

    await screen.findByText('Kromatik')
    await user.click(screen.getAllByRole('button', { name: '+ Nueva barbería' })[0])

    expect(screen.getByText('Nueva barbería')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del negocio *')).toHaveValue('')
    expect(screen.getByLabelText('Slug *')).toHaveValue('')
  })

  it('F-15 · si la activación falla, avisa con el motivo', async () => {
    const user = userEvent.setup()
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
    supabaseMock.on('barberias', 'update', { data: null, error: { message: 'sin permiso' } })
    montar()

    await screen.findByText('Kromatik')
    await user.click(screen.getByRole('button', { name: 'Desactivar Kromatik' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudo desactivar la barbería: sin permiso'
      )
    })
    // La barbería sigue activa: no se finge el cambio.
    expect(filaDe('Kromatik')).toHaveTextContent('Activa')

    confirmar.mockRestore()
  })
})

describe('BarberiasSuper · cargar y recargar (F-15)', () => {
  it('F-15 · avisa cuando la carga falla y ofrece reintentar', async () => {
    montar({ error: { message: 'solo_superadmin' } })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No pudimos cargar las barberías. Intenta de nuevo.'
      )
    })
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    // El listado queda vacío: no se enseña la tabla.
    expect(screen.queryByText('Kromatik')).not.toBeInTheDocument()
  })

  it('F-15 · el botón Reintentar vuelve a pedir el resumen', async () => {
    const user = userEvent.setup()
    montar({ error: { message: 'solo_superadmin' } })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => {
      expect(
        supabaseMock.llamadas.filter(
          (c) => c.tipo === 'rpc' && c.nombre === 'superadmin_resumen_barberias'
        )
      ).toHaveLength(2)
    })
  })

  it('F-15 · un panel sin barberías ofrece dar de alta la primera', async () => {
    montar({ datos: [] })

    await waitFor(() => {
      expect(
        screen.getByText('Aún no hay barberías registradas.')
      ).toBeInTheDocument()
    })
    expect(screen.getAllByRole('button', { name: '+ Nueva barbería' })).toHaveLength(2)
  })
})

describe('BarberiasSuper · abrir el sitio (F-15)', () => {
  /**
   * `DOMINIO_BASE` se calcula al IMPORTAR el módulo, así que hace falta
   * importar el componente después de fijar la variable. Por eso estos dos
   * tests no usan el import de arriba, sino uno nuevo.
   *
   * `vi.resetModules()` no reinstala el módulo de Supabase mockeado: el
   * componente recién importado sigue usando la misma instancia de
   * `supabaseMock` que el resto del archivo, así que se configura esa.
   */
  async function montarConDominio(valor) {
    vi.stubEnv('VITE_DOMINIO_BASE', valor)
    vi.resetModules()
    const { default: Componente } = await import(
      '../../src/pages/superadmin/BarberiasSuper'
    )
    supabaseMock.onRpc('superadmin_resumen_barberias', { data: BARBERIAS })
    renderWithProviders(<Componente />, { ruta: '/superadmin' })
    await screen.findByText('Kromatik')
  }

  it('F-15 · sin VITE_DOMINIO_BASE el botón sale deshabilitado y explica por qué', async () => {
    await montarConDominio('')

    const boton = screen.getByRole('button', { name: 'Abrir el sitio de Kromatik' })

    expect(boton).toBeDisabled()
    expect(boton).toHaveAttribute(
      'title',
      'Define VITE_DOMINIO_BASE para poder abrir el sitio de una barbería.'
    )
  })

  it('F-15 · con VITE_DOMINIO_BASE abre el subdominio de la barbería', async () => {
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null)
    await montarConDominio('gools.com.mx')

    const boton = screen.getByRole('button', { name: 'Abrir el sitio de Kromatik' })
    expect(boton).toBeEnabled()
    expect(boton).toHaveAttribute('title', 'Abrir kromatik.gools.com.mx')

    await userEvent.setup().click(boton)

    expect(abrir).toHaveBeenCalledWith(
      'https://kromatik.gools.com.mx',
      '_blank',
      'noopener,noreferrer'
    )

    abrir.mockRestore()
  })
})
