// src/utils/slug.js
// Generacion y validacion del slug de una barberia. Sin dependencias de React.

export const REGEX_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const SLUG_MIN = 3
export const SLUG_MAX = 40

// Palabras que no pueden ser slug: chocan con direcciones del software.
const RESERVADOS = ['www', 'app', 'admin', 'api', 'superadmin', 'mail', 'soporte']

/**
 * Sugiere un slug a partir del nombre: minúsculas, sin acentos, con guiones
 * simples. Se recalcula mientras el nombre cambia hasta que el usuario escribe
 * el slug a mano.
 */
export function slugDeNombre(nombre) {
  return String(nombre)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '')
}

/**
 * Devuelve el motivo por el que un slug no sirve, o null si es válido. Son las
 * mismas reglas que aplica el `check barberias_slug_valido` y la Edge Function.
 */
export function motivoSlugInvalido(slug) {
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) {
    return `El slug debe tener entre ${SLUG_MIN} y ${SLUG_MAX} caracteres.`
  }
  if (!REGEX_SLUG.test(slug)) {
    return 'El slug solo admite minúsculas, números y guiones simples (sin empezar ni terminar con guion).'
  }
  if (RESERVADOS.includes(slug)) {
    return `"${slug}" es una palabra reservada. Elige otro slug.`
  }
  return null
}
