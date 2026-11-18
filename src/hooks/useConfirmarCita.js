// src/hooks/useConfirmarCita.js
// Confirmar con optimistic update y reversión; cada página conserva su listado.
import { supabase } from '../supabaseClient'

// setCitas: setter de la página; barberiaId acota el UPDATE (además de la RLS).
export function useConfirmarCita(setCitas, setErrorMsg, barberiaId) {
  return async (cita) => {
    const anterior = cita.estado || 'pendiente'
    if (anterior === 'confirmada') return

    // Cambio optimista: el badge y los botones de la fila se actualizan al instante.
    setCitas((prev) => prev.map((c) => (c.id === cita.id ? { ...c, estado: 'confirmada' } : c)))
    if (setErrorMsg) setErrorMsg(null)

    const { error } = await supabase
      .from('citas')
      .update({ estado: 'confirmada' })
      .eq('id', cita.id)
      .eq('barberia_id', barberiaId)

    if (error) {
      // Revierte el cambio optimista y avisa.
      setCitas((prev) => prev.map((c) => (c.id === cita.id ? { ...c, estado: anterior } : c)))
      if (setErrorMsg) setErrorMsg(`No se pudo confirmar la cita: ${error.message}`)
    }
  }
}
