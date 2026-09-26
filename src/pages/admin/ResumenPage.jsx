// src/pages/admin/ResumenPage.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

// Escala de estados para el riel. 'pendiente' reutiliza el acento brass.
const colorEstado = {
  pendiente: 'bg-brass-400',
  confirmada: 'bg-confirmada',
  completada: 'bg-completada',
  cancelada: 'bg-cancelada',
}

export default function ResumenPage() {
  const [totales, setTotales] = useState({ servicios: 0, productos: 0, barberosActivos: 0, citas: 0 })
  const [citasSemana, setCitasSemana] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    // count: 'exact', head: true → solo trae el número, no las filas (más rápido)
    const [servicios, productos, barberos, citas] = await Promise.all([
      supabase.from('servicios').select('*', { count: 'exact', head: true }),
      supabase.from('productos').select('*', { count: 'exact', head: true }),
      supabase.from('barberos').select('*', { count: 'exact', head: true }).eq('disponible', true),
      supabase.from('citas').select('*', { count: 'exact', head: true }),
    ])

    setTotales({
      servicios: servicios.count || 0,
      productos: productos.count || 0,
      barberosActivos: barberos.count || 0,
      citas: citas.count || 0,
    })

    // Recordatorios: citas entre hoy y los próximos 7 días
    const hoy = new Date().toISOString().split('T')[0]
    const enUnaSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: proximas } = await supabase
      .from('citas')
      .select('*')
      .gte('fecha', hoy)
      .lte('fecha', enUnaSemana)
      .order('fecha', { ascending: true })

    setCitasSemana(proximas || [])
    setCargando(false)
  }

  if (cargando) return <p className="text-bone-100">Cargando...</p>

  const tarjetas = [
    { label: 'Servicios', valor: totales.servicios},
    { label: 'Productos', valor: totales.productos},
    { label: 'Barberos activos', valor: totales.barberosActivos},
    { label: 'Citas totales', valor: totales.citas},
  ]

  return (
    <div className="bg-ink-950">
      <h1 className="font-serif text-3xl text-bone-100 mb-8">Resumen</h1>

      {/* Tarjetas de totales */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-10">
        {tarjetas.map((t) => (
          <div key={t.label} className="bg-ink-900 border border-ink-700 rounded-lg p-5">
            <p className="font-serif text-3xl tabular-nums text-bone-100">{t.valor}</p>
            <p className="mt-2 text-sm text-bone-600">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Recordatorios de la semana */}
      <div className="bg-ink-900 border border-ink-700 rounded-lg p-5 sm:p-6">
        <h2 className="font-serif text-xl text-bone-100 mb-5">Citas de esta semana</h2>

        {citasSemana.length === 0 ? (
          <p className="text-sm text-bone-600">No hay citas agendadas para los próximos 7 días.</p>
        ) : (
          <ol className="flex flex-col">
            {citasSemana.map((cita) => (
              <li
                key={cita.id}
                className="relative flex items-start gap-3 pb-5 pl-6 last:pb-0 before:absolute before:left-[5px] before:top-4 before:-bottom-1 before:w-px before:bg-ink-700 last:before:hidden"
              >
                {/* Nodo: el color sale del estado de la cita */}
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${
                    colorEstado[cita.estado] || colorEstado.pendiente
                  }`}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-bone-100">{cita.nombre}</p>
                  <p className="text-sm text-bone-600">{cita.servicio}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-serif text-lg tabular-nums text-bone-400">{cita.hora}</p>
                  <p className="text-xs tabular-nums text-bone-600">{cita.fecha}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
