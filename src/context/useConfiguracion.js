// src/context/useConfiguracion.js
// Hook de consumo del provider. Archivo aparte para que provider y hook no
// compartan módulo (ver nota en configuracion.js).
import { useContext } from 'react'
import { ConfiguracionContext } from './configuracion'

export function useConfiguracion() {
  const valor = useContext(ConfiguracionContext)
  if (!valor) {
    throw new Error('useConfiguracion debe usarse dentro de <ConfiguracionProvider>')
  }
  return valor
}
