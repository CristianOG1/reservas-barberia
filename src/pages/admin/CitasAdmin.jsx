// src/pages/admin/CitasAdmin.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

const estados = ['pendiente', 'confirmada', 'completada', 'cancelada']

// Nodo del rail: 'pendiente' va hueco con borde brass, el resto relleno.
const colorEstado = {
  pendiente: 'border-brass-400 bg-ink-950',
  confirmada: 'border-confirmada bg-confirmada',
  completada: 'border-completada bg-completada',
  cancelada: 'border-cancelada bg-cancelada',
}

// Etiqueta del estado, para donde no cabe el nodo del rail.
const textEstado = {
  pendiente: 'text-brass-400',
  confirmada: 'text-confirmada',
  completada: 'text-completada',
  cancelada: 'text-cancelada',
}

// Punto del estado, acompañando siempre a la etiqueta.
const puntoEstado = {
  pendiente: 'bg-brass-400',
  confirmada: 'bg-confirmada',
  completada: 'bg-completada',
  cancelada: 'bg-cancelada',
}

export default function CitasAdmin() {
  const [citas, setCitas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [citaSeleccionada, setCitaSeleccionada] = useState(null)

  useEffect(() => {
    cargarCitas()
  }, [])

  const cargarCitas = async () => {
    setCargando(true)
    const { data } = await supabase.from('citas').select('*').order('fecha', { ascending: true })
    setCitas(data || [])
    setCargando(false)
  }

  const cambiarEstado = async (nuevoEstado) => {
    setCitaSeleccionada({ ...citaSeleccionada, estado: nuevoEstado })
    setCitas(citas.map((c) => (c.id === citaSeleccionada.id ? { ...c, estado: nuevoEstado } : c)))
    await supabase.from('citas').update({ estado: nuevoEstado }).eq('id', citaSeleccionada.id)
  }

  // Ficha de la cita seleccionada: mismas filas y mismas condicionales que antes,
  // solo cambia la presentación a filas de definición.
  const ficha = citaSeleccionada
    ? [
        { label: 'Teléfono', valor: citaSeleccionada.telefono },
        citaSeleccionada.correo && { label: 'Correo', valor: citaSeleccionada.correo },
        { label: 'Servicio', valor: citaSeleccionada.servicio },
        { label: 'Fecha', valor: citaSeleccionada.fecha },
        { label: 'Hora', valor: citaSeleccionada.hora },
        citaSeleccionada.addon && { label: 'Add-on', valor: 'Vapor ozono' },
        citaSeleccionada.total && { label: 'Total', valor: `$${citaSeleccionada.total} MXN` },
        citaSeleccionada.notas && { label: 'Notas', valor: citaSeleccionada.notas, ancho: true },
      ].filter(Boolean)
    : []

  return (
    <div>
      <h1 className="mb-8 font-serif text-3xl text-bone-100">Citas</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Listado como rail de día */}
        <div className="lg:col-span-2">
          {cargando ? (
            <p className="text-bone-400">Cargando...</p>
          ) : citas.length === 0 ? (
            <p className="text-sm text-bone-600">Aún no hay citas agendadas.</p>
          ) : (
            <ol className="rounded-lg border border-ink-700 bg-ink-900 p-4 sm:p-5">
              {citas.map((c, i) => {
                const esUltima = i === citas.length - 1
                const seleccionado = citaSeleccionada?.id === c.id
                const estado = c.estado || 'pendiente'
                const cancelada = c.estado === 'cancelada'

                return (
                  <li key={c.id} className="relative">
                    <button
                      onClick={() => setCitaSeleccionada(c)}
                      aria-current={seleccionado ? 'true' : undefined}
                      className="flex w-full items-start gap-3 py-3 pl-7 pr-1 text-left transition-colors duration-200 hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60 motion-reduce:transition-none sm:pl-8"
                    >
                      {/* Hora: columna fija para que las horas alineen */}
                      <p className="w-12 shrink-0 font-serif text-lg tabular-nums text-bone-400 sm:w-16">
                        {c.hora}
                      </p>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-semibold ${
                            cancelada ? 'text-bone-600 line-through' : 'text-bone-100'
                          }`}
                        >
                          {c.nombre}
                        </p>
                        <p className={`truncate text-sm ${cancelada ? 'text-bone-600' : 'text-bone-400'}`}>
                          {c.servicio}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm tabular-nums text-bone-600">{c.fecha}</p>
                        <span className="mt-1 flex items-center justify-end gap-1.5">
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full ${puntoEstado[estado] || puntoEstado.pendiente}`}
                          />
                          <span
                            className={`text-xs capitalize ${
                              textEstado[estado] || textEstado.pendiente
                            }`}
                          >
                            {estado}
                          </span>
                        </span>
                      </div>
                    </button>

                    {/* Hairline brass del elemento seleccionado */}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute bottom-0 left-0 top-0 w-0.5 rounded-full bg-brass-400 transition-opacity duration-200 motion-reduce:transition-none ${
                        seleccionado ? 'opacity-100' : 'opacity-0'
                      }`}
                    />

                    {/* Línea del rail, discreta */}
                    {!esUltima && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-1 left-3 top-7 w-px bg-ink-700"
                      />
                    )}

                    {/* Nodo: el estado se lee por forma y color, sin pills */}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute h-2.5 w-2.5 rounded-full border transition-[left,top,width,height,background-color,border-color] duration-200 motion-reduce:transition-none ${
                        seleccionado ? 'left-1 top-[5px] h-4 w-4' : 'left-[7px] top-2'
                      } ${colorEstado[estado] || colorEstado.pendiente}`}
                    />
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        {/* Panel de detalle */}
        <div className="h-fit rounded-lg border border-ink-700 bg-ink-900 p-5 sm:p-6 lg:sticky lg:top-8">
          {!citaSeleccionada ? (
            <p className="text-sm text-bone-600">Selecciona una cita para ver su información.</p>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="font-serif text-xl text-bone-100">{citaSeleccionada.nombre}</h3>
                <span className="mt-2 flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      puntoEstado[citaSeleccionada.estado] || puntoEstado.pendiente
                    }`}
                  />
                  <span
                    className={`text-xs capitalize ${
                      textEstado[citaSeleccionada.estado] || textEstado.pendiente
                    }`}
                  >
                    {citaSeleccionada.estado || 'pendiente'}
                  </span>
                </span>
              </div>

              {/* Filas de definición */}
              <dl className="flex flex-col border-t border-ink-700">
                {ficha.map((f) => (
                  <div
                    key={f.label}
                    className="border-b border-ink-700 py-2.5 last:border-b-0 sm:grid sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:items-baseline sm:gap-x-4"
                  >
                    <dt className="text-sm text-bone-600">{f.label}</dt>
                    <dd
                      className={`text-sm text-bone-100 ${f.ancho ? '' : 'mt-0.5 break-words sm:mt-0 sm:text-right'}`}
                    >
                      {f.valor}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="border-t border-ink-700 pt-4">
                <p className="mb-2 text-sm text-bone-600">Cambiar estado</p>
                <div className="flex flex-wrap gap-2">
                  {estados.map((e) => (
                    <button
                      key={e}
                      onClick={() => cambiarEstado(e)}
                      aria-pressed={citaSeleccionada.estado === e}
                      className={`rounded-md border px-3 py-2 text-sm capitalize transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60 motion-reduce:transition-none ${
                        citaSeleccionada.estado === e
                          ? 'border-brass-400 bg-brass-400 font-semibold text-ink-950'
                          : 'border-ink-700 bg-ink-800 text-bone-400 hover:border-bone-600 hover:text-bone-100'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
