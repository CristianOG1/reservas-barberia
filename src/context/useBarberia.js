// src/context/useBarberia.js
// Hook de consumo del provider. Archivo aparte para que provider y hook no
// compartan módulo (ver nota en barberia.js).
import { useContext } from 'react'
import { BarberiaContext } from './barberia'

export function useBarberia() {
  const valor = useContext(BarberiaContext)
  if (!valor) {
    throw new Error('useBarberia debe usarse dentro de <BarberiaProvider>')
  }
  return valor
}
