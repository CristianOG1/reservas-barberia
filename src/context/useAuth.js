// src/context/useAuth.js
// Hook de consumo del provider de sesión. Archivo aparte para que provider y
// hook no compartan módulo (ver nota en auth.js).
import { useContext } from 'react'
import { AuthContext } from './auth'

// No avisa si falta el provider (como antes): devuelve `undefined` y quien lo
// usa ya comprueba lo que necesita.
export function useAuth() {
  return useContext(AuthContext)
}
