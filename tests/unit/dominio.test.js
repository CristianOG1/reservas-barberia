// tests/unit/dominio.test.js
// Fija el comportamiento ACTUAL de la resolucion del subdominio.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dominioBase, dominioBaseDeBarberias, resolverSlug } from '../../src/utils/dominio'

describe('dominio', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DOMINIO_BASE', 'gools.com.mx')
    vi.stubEnv('VITE_BARBERIA_SLUG', 'kromatik')
  })

  it('lee el dominio base de la variable de compilacion', () => {
    expect(dominioBase()).toBe('gools.com.mx')
    expect(dominioBaseDeBarberias()).toBe('gools.com.mx')
  })

  it('devuelve null en el dominio de las barberias si no hay variable', () => {
    vi.stubEnv('VITE_DOMINIO_BASE', '')
    expect(dominioBaseDeBarberias()).toBe(null)
  })
})

describe('resolverSlug', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DOMINIO_BASE', 'gools.com.mx')
    vi.stubEnv('VITE_BARBERIA_SLUG', 'kromatik')
  })

  it('resuelve el slug de una barberia en su subdominio', () => {
    expect(resolverSlug('kromatik.gools.com.mx')).toEqual({
      slug: 'kromatik',
      sitioPrincipal: false,
    })
  })

  it('trata el dominio pelado como entrada del software', () => {
    expect(resolverSlug('gools.com.mx')).toEqual({ slug: null, sitioPrincipal: true })
  })

  it('trata los subdominios reservados como entrada del software', () => {
    for (const host of ['www.gools.com.mx', 'admin.gools.com.mx', 'api.gools.com.mx']) {
      expect(resolverSlug(host)).toEqual({ slug: null, sitioPrincipal: true })
    }
  })

  it('rechaza los subdominios con demasiados niveles', () => {
    expect(resolverSlug('a.b.gools.com.mx')).toEqual({ slug: null, sitioPrincipal: true })
  })

  it('en un host que no es el dominio real manda la variable de entorno', () => {
    expect(resolverSlug('localhost')).toEqual({ slug: 'kromatik', sitioPrincipal: false })
    expect(resolverSlug('app.preview.workers.dev')).toEqual({
      slug: 'kromatik',
      sitioPrincipal: false,
    })
  })

  it('no cae al slug de entorno en el dominio del software', () => {
    // El dominio pelado es la entrada del superadmin, no el kiosko de una
    // barbería: no debe resolverse al slug de la variable de entorno.
    expect(resolverSlug('gools.com.mx').slug).toBe(null)
  })
})
