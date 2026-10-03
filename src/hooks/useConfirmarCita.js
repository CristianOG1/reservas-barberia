// src/hooks/useConfirmarCita.js
// Helper compartido para confirmar una cita desde Resumen y Gestión de Citas.
// Optimistic update: cambia el estado local de inmediato; si Supabase devuelve
// error, revierte y comunica el mensaje. Cada página conserva la propiedad de su
// propio listado (`citas`/`citasSemana`) y vuelve a consultar al montar, por eso
// toda la lógica de confirmar vive en este único lugar y no se duplica.
import { supabase } from '../supabaseClient'

/**
 * @param {(updater: (prev: any[]) => any[]) => void} setCitas
 *   Setter del array de citas de la página (setCitas en CitasAdmin,
 *   setCitasSemana en ResumenPage).
 * @param {(msg: string | null) => void} [setErrorMsg]
 *   Setter opcional para mostrar el error devuelto por Supabase.
 * @returns {(cita: any) => Promise<void>}
 */
export function useConfirmarCita(setCitas, setErrorMsg) {
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

    if (error) {
      // Revierte el cambio optimista y avisa.
      setCitas((prev) => prev.map((c) => (c.id === cita.id ? { ...c, estado: anterior } : c)))
      if (setErrorMsg) setErrorMsg(`No se pudo confirmar la cita: ${error.message}`)
    }
  }
}
