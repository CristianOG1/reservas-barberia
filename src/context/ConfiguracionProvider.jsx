// src/context/ConfiguracionProvider.jsx
// Provider de los datos de la barbería. Carga la fila única (id = 1) UNA vez y la
// comparte con el sidebar y con la página de configuración, de modo que guardar
// en la página actualice el nombre y el logo del panel sin recargar.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { ConfiguracionContext } from './configuracion'

// Si la fila no existe (base recién creada) se cae en un objeto neutro para que
// la UI nunca reviente por un null.
const CONFIG_VACIA = { id: 1, nombre: '', estado: '', municipio: '', logo: '', descripcion: '' }

export function ConfiguracionProvider({ children }) {
  const [configuracion, setConfiguracion] = useState(CONFIG_VACIA)
  const [cargando, setCargando] = useState(true)

  const refrescar = useCallback(async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (error) console.error(error)
    if (data) setConfiguracion(data)
    setCargando(false)
  }, [])

  // La carga inicial se hace dentro del `.then` a propósito: llamar `refrescar()`
  // directo haría un setState síncrono en el cuerpo del efecto
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    let vigente = true
    supabase
      .from('configuracion')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) console.error(error)
        if (data) setConfiguracion(data)
        setCargando(false)
      })
    return () => { vigente = false }
  }, [])

  return (
    <ConfiguracionContext.Provider value={{ configuracion, cargando, refrescar }}>
      {children}
    </ConfiguracionContext.Provider>
  )
}
