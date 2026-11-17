/**
 * Ruta de inicio según el rol. Única fuente de verdad: la usan LoginPage,
 * Navbar y Hero, para que no decidan el destino por su cuenta y el resultado
 * sea siempre el mismo.
 *
 * - 'superadmin' → '/superadmin' (su panel multi-barbería, fuera de toda
 *   barbería: entra por el dominio principal, sin slug).
 * - 'admin' → '/admin' (el panel de su barbería).
 * - 'cliente' → '/cliente'.
 * - Cualquier otro valor, incluido null/undefined, cae en '/admin', que es el
 *   comportamiento que ya tenía el proyecto: al no poder leer el rol la app
 *   manda al visitante al login del panel, no a una zona de cliente que no le
 *   corresponde.
 *
 * Si añades un rol nuevo, actualízalo aquí **y** las listas `roles` de
 * `src/App.jsx`.
 */
export function rutaInicioPorRol(rol) {
  if (rol === 'superadmin') return '/superadmin'
  if (rol === 'cliente') return '/cliente'
  return '/admin'
}
