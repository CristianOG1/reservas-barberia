/**
 * Ruta de inicio según el rol. Única fuente de verdad: la usan LoginPage,
 * Navbar y Hero, para que no decidan el destino por su cuenta y el resultado
 * sea siempre el mismo.
 *
 * - 'superadmin' y 'admin' → '/admin' (el dashboard multi-barbería del
 *   superadmin todavía no existe, así que entra al panel de la barbería).
 * - 'cliente' → '/cliente'.
 * - Rol null, undefined o cualquier valor desconocido → '/cliente'.
 *   Es el fallo a salvo: si no se pudo leer el rol se trata como cliente (§5),
 *   que es la opción que menos privilegios concede.
 */
export function rutaInicioPorRol(rol) {
  return rol === 'cliente' ? '/cliente' : '/admin'
}