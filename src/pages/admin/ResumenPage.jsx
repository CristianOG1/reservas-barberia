// src/pages/admin/ResumenPage.jsx
// Resumen del panel: la agenda de hoy, el personal y el inventario.
//
// Todas las cifras salen de los datos reales de la barbería abierta (filtrados
// por `barberia_id`). No hay ninguna constante de ejemplo: si la barbería no
// tiene datos, las cifras son 0 y la pantalla lo dice.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useConfirmarCita } from '../../hooks/useConfirmarCita'
import { useBarberia } from '../../context/useBarberia'
import { useConfiguracion } from '../../context/useConfiguracion'
import { HoyEntero } from '../../utils/fecha'
import {
  STOCK_MINIMO,
  barberosDisponibles,
  barberosEnPausa,
  categoriasDeServicios,
  citasDeHoy,
  contarPorEstado,
  ordenarPorStock,
  productosConStockBajo,
  stockDe,
  topServicios,
  totalStock,
} from '../../utils/resumen'
import CitaManualForm from './CitaManualForm'

const LABEL_ESTADO = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

function getBadgeEstado(estado) {
  const e = estado || 'pendiente'
  switch (e) {
    case 'confirmada':
      return 'bg-primary-100 text-primary'
    case 'completada':
      return 'bg-green-50 text-green-600'
    case 'cancelada':
      return 'bg-red-50 text-red-600'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export default function ResumenPage() {
  // El resumen es de UNA barbería: todo se filtra por su id.
  const { barberia } = useBarberia()
  const barberiaId = barberia?.id ?? null
  // Nombre real del salón: el de la fila de `configuracion` y, si esa barbería
  // todavía no tiene fila, el de la barbería.
  const { configuracion } = useConfiguracion()
  const nombreBarberia =
    (configuracion?.nombre || '').trim() || (barberia?.nombre || '').trim() || 'Barbería'

  const [servicios, setServicios] = useState([])
  const [productos, setProductos] = useState([])
  const [barberos, setBarberos] = useState([])
  const [citasSemana, setCitasSemana] = useState([])
  const [cargando, setCargando] = useState(true)
  // El fallo de carga va aparte del aviso de escritura (confirmar una cita):
  // un error de red no puede verse igual que un salón sin datos.
  const [errorCarga, setErrorCarga] = useState('')
  const [errorMsg, setErrorMsg] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  // Lógica de confirmación compartida con Gestión de Citas (§hook).
  const confirmarCita = useConfirmarCita(setCitasSemana, setErrorMsg, barberiaId)

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    setErrorCarga('')

    const hoy = HoyEntero(new Date())
    const enUnaSemana = HoyEntero(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))

    const [serviciosRes, productosRes, barberosRes, citasRes] = await Promise.all([
      supabase.from('servicios').select('*').eq('barberia_id', barberiaId).order('created_at', { ascending: true }),
      supabase.from('productos').select('*').eq('barberia_id', barberiaId).order('created_at', { ascending: false }),
      supabase.from('barberos').select('*').eq('barberia_id', barberiaId).order('created_at', { ascending: true }),
      supabase.from('citas').select('*').eq('barberia_id', barberiaId).gte('fecha', hoy).lte('fecha', enUnaSemana).order('fecha', { ascending: true }),
    ])

    const error = serviciosRes.error || productosRes.error || barberosRes.error || citasRes.error
    if (error) {
      console.error(error)
      setErrorCarga('No pudimos cargar el resumen. Intenta de nuevo.')
      setServicios([])
      setProductos([])
      setBarberos([])
      setCitasSemana([])
    } else {
      setServicios(serviciosRes.data || [])
      setProductos(productosRes.data || [])
      setBarberos(barberosRes.data || [])
      setCitasSemana(citasRes.data || [])
    }
    setCargando(false)
  }, [barberiaId])

  useEffect(() => {
    if (barberiaId) {
      // La carga se dispara FUERA del cuerpo síncrono del efecto: dentro de un
      // efecto, un `setState` síncrono provoca renders en cascada (regla
      // `react-hooks/set-state-in-effect`).
      Promise.resolve().then(cargarDatos)
    }
  }, [barberiaId, cargarDatos])

  if (cargando) return <p className="text-slate-500">Cargando...</p>

  const hoy = HoyEntero(new Date())
  // Citas de hoy ordenadas por hora. `hora` es de tipo `time` en la BD y llega
  // como 'HH:MM:SS': ordenar lexicográficamente ordena cronológicamente.
  const citasHoy = citasDeHoy(citasSemana, hoy)
    .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))

  // Lookup del barbero asignado a cada cita, mismo join por `barbero_id` que usa
  // CitasAdmin. Las citas sin barbero salen como "Sin asignar".
  const barberoDe = (cita) => barberos.find((b) => b.id === cita.barbero_id) || null

  // `citas.hora` llega como 'HH:MM:SS'; se muestra 'HH:MM' (igual que CitasAdmin).
  const formatearHora = (valor) => (valor ? String(valor).slice(0, 5) : '—')

  // ---- Cifras del panel: todas salen de los datos de arriba ----
  const pendientesHoy = contarPorEstado(citasHoy, 'pendiente')
  const disponibles = barberosDisponibles(barberos)
  const enPausa = barberosEnPausa(barberos)
  const stockBajo = productosConStockBajo(productos).length
  const unidades = totalStock(productos)
  const categorias = categoriasDeServicios(servicios)
  const populares = topServicios(citasSemana, 3)
  const inventarioCritico = ordenarPorStock(productos).slice(0, 4)

  const metricas = [
    {
      label: 'Citas para Hoy',
      valor: citasHoy.length,
      detalle: `${pendientesHoy} por confirmar`,
      apoyo: `${citasSemana.length} en los próximos 7 días`,
      iconoFondo: 'bg-primary-50 text-primary',
      icono: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>
        </svg>
      ),
    },
    {
      label: 'Productos en catálogo',
      valor: productos.length,
      detalle: `${stockBajo} con stock bajo`,
      apoyo: `${unidades} unidades en stock`,
      iconoFondo: 'bg-amber-50 text-amber',
      icono: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
      ),
    },
    {
      label: 'Barberos Activos',
      valor: `${disponibles} de ${barberos.length}`,
      detalle: 'disponibles',
      apoyo: `${enPausa} en pausa`,
      iconoFondo: 'bg-primary-50 text-primary',
      icono: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
    {
      label: 'Servicios en catálogo',
      valor: servicios.length,
      detalle: `${categorias} categorías`,
      apoyo: `${servicios.length + productos.length} ítems totales`,
      iconoFondo: 'bg-primary-50 text-primary',
      icono: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      ),
    },
  ]

  return (
    <div>
      {/* Header de página */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber mb-1">
            {nombreBarberia}
          </p>
          <h1 className="font-serif text-3xl text-navy">Panel General de Operaciones</h1>
          <p className="mt-1 text-sm text-slate">
            Resumen con el estado real de tu agenda, personal e inventario.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/citas"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-navy transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Ver Calendario Completo
          </Link>
          <button
            onClick={() => setMostrarForm(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            + Nueva Cita Rápida
          </button>
        </div>
      </div>

      {errorCarga ? (
        <div className="rounded-xl border border-red-600/30 bg-white p-5">
          <p role="alert" className="text-sm text-red-600">{errorCarga}</p>
          <button
            onClick={cargarDatos}
            className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-sm text-navy transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {/* Fila de 4 tarjetas */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {metricas.map((m) => (
              <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${m.iconoFondo}`}>
                    {m.icono}
                  </div>
                </div>
                <p className="mt-4 font-serif text-3xl text-navy">{m.valor}</p>
                <p className="mt-1 text-sm text-slate">{m.label}</p>
                <p className="mt-2 text-xs text-slate">
                  {m.detalle}
                  <span className="text-slate-400 mx-1">·</span>
                  {m.apoyo}
                </p>
              </div>
            ))}
          </div>

          {/* Bloque principal: tabla + sidebar derecha */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Tabla */}
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="font-serif text-lg text-navy">Últimas Citas Agendadas Hoy</h2>
              </div>

              {errorMsg && (
                <p role="alert" className="mx-5 mt-4 rounded-lg border border-red-600/30 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {errorMsg}
                </p>
              )}

              {citasHoy.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm text-slate-500">No hay citas agendadas para hoy.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Hora</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Cliente</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Servicio</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Barbero</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Estado</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citasHoy.slice(0, 6).map((c) => {
                      const barberoAsignado = barberoDe(c)
                      return (
                      <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <p className="font-serif text-sm tabular-nums text-navy">{formatearHora(c.hora)}</p>
                          <p className="text-xs text-slate">{c.fecha}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                              {c.nombre?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-navy">{c.nombre}</p>
                              <p className="text-xs text-slate">{c.telefono}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-navy">{c.servicio}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          {barberoAsignado ? (
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
                                {barberoAsignado.imagen ? (
                                  <img src={barberoAsignado.imagen} alt={barberoAsignado.nombre} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                                    {barberoAsignado.nombre?.charAt(0) || '?'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm text-navy">{barberoAsignado.nombre}</p>
                                <p className="text-xs text-slate">{barberoAsignado.especialidad || 'Sin especialidad'}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Sin asignar</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${getBadgeEstado(c.estado)}`}>
                            {LABEL_ESTADO[c.estado] || LABEL_ESTADO.pendiente}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {((c.estado || 'pendiente') === 'pendiente') && (
                              <button
                                onClick={() => confirmarCita(c)}
                                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                Confirmar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
                <p className="text-sm text-slate">
                  Mostrando <strong className="text-navy">{Math.min(citasHoy.length, 6)}</strong> de <strong className="text-navy">{citasSemana.length}</strong> citas de los próximos 7 días
                </p>
              </div>
            </div>

            {/* Sidebar derecha */}
            <div className="flex flex-col gap-4">
              {/* Inventario Crítico */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-serif text-base text-navy">Inventario Crítico · Productos & Stock</h3>
                </div>
                {inventarioCritico.length === 0 ? (
                  <p className="text-sm text-slate-500">Aún no hay productos en el catálogo.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {inventarioCritico.map((p) => {
                      const stock = stockDe(p)
                      const bajo = stock < STOCK_MINIMO
                      return (
                        <div key={p.id} className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                            {p.imagen ? (
                              <img src={p.imagen} alt={p.nombre} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs text-slate-400">?</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-navy">{p.nombre}</p>
                            <p className="text-xs text-slate">${p.precio} MXN</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            bajo ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {stock} en stock
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
                <Link
                  to="/admin/productos"
                  className="mt-4 block text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Gestionar catálogo completo →
                </Link>
              </div>

              {/* Popularidad Semanal */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4">
                  <h3 className="font-serif text-base text-navy">Popularidad Semanal · Servicios Más Solicitados</h3>
                </div>
                {populares.length === 0 ? (
                  <p className="text-sm text-slate-500">Aún no hay suficientes citas esta semana.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {populares.map((s) => (
                      <div key={s.nombre}>
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-sm text-navy">{s.nombre}</p>
                          <span className="text-sm font-medium text-primary">{s.pct}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${s.pct}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate">{s.sesiones} sesiones del ciclo</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {mostrarForm && (
        <CitaManualForm
          servicios={servicios}
          barberos={barberos}
          onClose={() => setMostrarForm(false)}
          onGuardado={() => {
            setMostrarForm(false)
            cargarDatos()
          }}
        />
      )}
    </div>
  )
}
