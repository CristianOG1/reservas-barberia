// Única fuente del destino por rol; null cae en /admin. Actualiza también las
// listas `roles` de App.jsx si añades un rol.
export function rutaInicioPorRol(rol) {
  if (rol === 'superadmin') return '/superadmin'
  if (rol === 'cliente') return '/cliente'
  return '/admin'
}
