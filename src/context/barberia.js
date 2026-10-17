// src/context/barberia.js
// El objeto Context vive solo en su archivo para poder exportar provider y hook
// por separado: si vivieran juntos, el plugin react-refresh marcaría el archivo
// con `only-export-components` (el mismo error que ya tiene AuthContext.jsx).
import { createContext } from 'react'

// null = el provider todavía no está montado; useBarberia lo avisa.
export const BarberiaContext = createContext(null)
