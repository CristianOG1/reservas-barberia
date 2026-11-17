import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { ConfiguracionContext } from './configuracion'
import { useBarberia } from './useBarberia'

// Si la barbería todavía no tiene fila (barbería recién creada) se cae en un
// objeto neutro para que la UI nunca reviente por un null.
const CONFIG_VACIA = {
  id: null, barberia_id: null, nombre: '', estado: '', municipio: '', logo: '', descripcion: '',
}

export function ConfiguracionProvider({ children }) {
  // La configuración es de UNA barbería: la fila se busca por barberia_id, no
  // por un id fijo (antes era .eq('id', 1) porque solo existía una barbería).
  const { barberia } = useBarberia()
  const barberiaId = barberia?.id ?? null

  const [configuracion, setConfiguracion] = useState(CONFIG_VACIA)
  const [cargando, setCargando] = useState(true)

  const refrescar = useCallback(async () => {
    if (!barberiaId) return
    setCargando(true)
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .eq('barberia_id', barberiaId)
      .maybeSingle()
    if (error) console.error(error)
    setConfiguracion(data ?? CONFIG_VACIA)
    setCargando(false)
  }, [barberiaId])

  // La carga inicial se hace dentro del `.then` a propósito: llamar `refrescar()`
  // directo haría un setState síncrono en el cuerpo del efecto
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!barberiaId) return
    let vigente = true
    supabase
      .from('configuracion')
      .select('*')
      .eq('barberia_id', barberiaId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) console.error(error)
        setConfiguracion(data ?? CONFIG_VACIA)
        setCargando(false)
      })
    return () => { vigente = false }
  }, [barberiaId])

  return (
    <ConfiguracionContext.Provider value={{ configuracion, cargando, refrescar }}>
      {children}
    </ConfiguracionContext.Provider>
  )
}
