// src/context/auth.js
// El objeto Context vive solo en su archivo para poder exportar el provider y
// el hook por separado: si vivieran juntos, el plugin react-refresh marcaría el
// archivo con `only-export-components` (la regla que arrastraba el antiguo
// `AuthContext.jsx`).
// Mismo patrón que `barberia.js` / `BarberiaProvider.jsx` / `useBarberia.js`.
import { createContext } from 'react'

// undefined = el provider todavía no está montado; useAuth lo avisa.
export const AuthContext = createContext()
