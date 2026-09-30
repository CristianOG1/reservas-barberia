// src/pages/admin/ResumenPage.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

/* ========= DATOS DE EJEMPLO — reemplazar con lógica real ========= */

const METRICAS_EJEMPLO = {
  citasHoy: { total: 12, variacion: '+12%', pendientes: 3, vs: 'vs ayer' },
  barberos: { activos: 4, total: 6, descanso: 2 },
}

const STOCK_EJEMPLO = [
  { id: 'stock-1', nombre: 'Aceite para Barba', precio: 350, categoria: 'CISURADO', imagen: null, stock: 2 },
  { id: 'stock-2', nombre: 'Cera Mate', precio: 280, categoria: 'PEINADO', imagen: null, stock: 8 },
  { id: 'stock-3', nombre: 'Shampoo Carbón', precio: 320, categoria: 'CUIDADO', imagen: null, stock: 12 },
  { id: 'stock-4', nombre: 'Aftershave', precio: 400, categoria: 'ACABADO', imagen: null, stock: 3 },
]

/* ================================================================== */

function HoyEntero(d) {
  const n = typeof d === 'object' ? d : new Date(d + 'T00:00:00')
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0')
}

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

function getAccentBarbero(i) {
  const colores = ['bg-primary', 'bg-amber', 'bg-green-600', 'bg-red-600']
  return colores[i % colores.length]
}

function IconoReiniciar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2 11.5a10 10 0 0 1 18.8-4.3"/><path d="M22 12.5a10 10 0 0 1-18.8 4.2"/>
    </svg>
  )
}

function IconoFiltro() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  )
}

export default function ResumenPage() {
  const [totales, setTotales] = useState({ servicios: 0, productos: 0, barberosActivos: 0, citas: 0 })
  const [citasSemana, setCitasSemana] = useState([])
  const [productos, setProductos] = useState([])
  const [popularidad, setPopularidad] = useState([])
  const [listaServicios, setListaServicios] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    // count: 'exact', head: true → solo trae el número, no las filas
    const [serviciosRes, productosRes, barberos, citasRes] = await Promise.all([
      supabase.from('servicios').select('*'),
      supabase.from('productos').select('*', { count: 'exact', head: true }),
      supabase.from('barberos').select('*', { count: 'exact', head: true }).eq('disponible', true),
      supabase.from('citas').select('*', { count: 'exact', head: true }),
    ])

    setTotales({
      servicios: serviciosRes.data?.length ?? 0,
      productos: productosRes.count || 0,
      barberosActivos: barberos.count || 0,
      citas: citasRes.count || 0,
    })
    setListaServicios(serviciosRes.data || [])

    // Próximas citas
    const hoy = HoyEntero(new Date())
    const enUnaSemana = HoyEntero(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))

    const { data: proximas } = await supabase
      .from('citas')
      .select('*')
      .gte('fecha', hoy)
      .lte('fecha', enUnaSemana)
      .order('fecha', { ascending: true })

    setCitasSemana(proximas || [])

    // Productos para inventario
    const { data: productosData } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false })

    setProductos(productosData || [])

    // Popularidad semanal: agrupa las citas reales por servicio
    const { data: citasSemanaData } = await supabase
      .from('citas')
      .select('servicio')
      .gte('fecha', hoy)
      .lte('fecha', enUnaSemana)

    setPopularidad(
      citasSemanaData && citasSemanaData.length > 0
        ? Object.entries(
            citasSemanaData.reduce((acc, c) => {
              acc[c.servicio] = (acc[c.servicio] || 0) + 1
              return acc
            }, {})
          )
            .map(([nombre, count]) => ({ nombre, sesiones: count, pct: Math.round((count / citasSemanaData.length) * 100) }))
            .sort((a, b) => b.sesiones - a.sesiones)
            .slice(0, 3)
        : []
    )

    setCargando(false)
  }

  if (cargando) return <p className="text-slate-500">Cargando...</p>

  const hoy = HoyEntero(new Date())
  const citasHoy = citasSemana.filter((c) => c.fecha === hoy)

  const metricas = [
    {
      label: 'Citas para Hoy',
      valor: citasHoy.length || METRICAS_EJEMPLO.citasHoy.total,
      detalle: <span className="text-green-600 font-medium">{METRICAS_EJEMPLO.citasHoy.variacion}</span>,
      apoyo: `${METRICAS_EJEMPLO.citasHoy.pendientes} por confirmar`,
      iconoFondo: 'bg-primary-50 text-primary',
      icono: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>
        </svg>
      ),
    },
    {
      label: 'Productos en catálogo',
      valor: totales.productos,
      detalle: `${productos.filter(p => (p.stock ?? 0) <= 3).length} con stock bajo`,
      apoyo: `${STOCK_EJEMPLO.length} productos listados`,
      iconoFondo: 'bg-amber-50 text-amber',
      icono: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
      ),
    },
    {
      label: 'Barberos Activos',
      valor: `${totales.barberosActivos} de ${METRICAS_EJEMPLO.barberos.total}`,
      detalle: 'en turno',
      apoyo: `${METRICAS_EJEMPLO.barberos.descanso} descanso programado`,
      iconoFondo: 'bg-primary-50 text-primary',
      icono: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
    {
      label: 'Servicios en catálogo',
      valor: totales.servicios,
      detalle: `${new Set(listaServicios.map(s => s.categoria).filter(Boolean)).size} categorías`,
      apoyo: `${totales.servicios + totales.productos} ítems totales`,
      iconoFondo: 'bg-primary-50 text-primary',
      icono: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      ),
    },
  ]

  const productosParaTabla = productos.length > 0
    ? productos.map((p, i) => ({
        ...p,
        stock: STOCK_EJEMPLO[i] ? STOCK_EJEMPLO[i].stock : 0,
      }))
    : STOCK_EJEMPLO

  return (
    <div>
      {/* Header de página */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber mb-1">
            Sede Central Atelier · Turno Matutino
          </p>
          <h1 className="font-serif text-3xl text-navy">Panel General de Operaciones</h1>
          <p className="mt-1 text-sm text-slate">
            Resumen con el estado real de tu agenda, personal e inventario.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-navy transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Ver Calendario Completo
          </button>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            + Nueva Cita Rápida
          </button>
        </div>
      </div>

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
            <div className="flex items-center gap-1">
              <button className="rounded-lg border border-slate-200 p-2 text-slate hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Filtrar">
                <IconoFiltro />
              </button>
              <button className="rounded-lg border border-slate-200 p-2 text-slate hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Actualizar">
                <IconoReiniciar />
              </button>
            </div>
          </div>

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
                {citasHoy.slice(0, 6).map((c, i) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <p className="font-serif text-sm text-navy">{c.hora}</p>
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
                      <span className="mt-0.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber">
                        {c.addon ? 'Con add-on' : 'Servicio base'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${getAccentBarbero(i)}`} />
                        <span className="text-sm text-slate">Barbero N°{i + 1}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${getBadgeEstado(c.estado)}`}>
                        {LABEL_ESTADO[c.estado] || LABEL_ESTADO.pendiente}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="text-sm text-primary hover:underline focus-visible:outline-none">
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
            <p className="text-sm text-slate">
              Mostrando <strong className="text-navy">{Math.min(citasHoy.length, 6)}</strong> de <strong className="text-navy">{citasSemana.length}</strong> citas programadas
            </p>
            <a href="/admin/citas" className="text-sm font-medium text-primary hover:underline">
              Ver todas las citas de hoy →
            </a>
          </div>
        </div>

        {/* Sidebar derecha */}
        <div className="flex flex-col gap-4">
          {/* Inventario Crítico */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-base text-navy">Inventario Crítico · Productos & Stock</h3>
            </div>
            <div className="flex flex-col gap-3">
              {productosParaTabla.slice(0, 4).map((p) => (
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
                    p.stock <= 3
                      ? 'bg-red-50 text-red-600'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {p.stock <= 3 ? `${p.stock} en stock` : `${p.stock} en stock`}
                  </span>
                </div>
              ))}
            </div>
            <a href="/admin/productos" className="mt-4 block text-sm font-medium text-primary hover:underline">
              Gestionar catálogo completo →
            </a>
          </div>

          {/* Popularidad Semanal */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4">
              <h3 className="font-serif text-base text-navy">Popularidad Semanal · Servicios Más Solicitados</h3>
            </div>
            {popularidad.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay suficientes citas esta semana.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {popularidad.map((s) => (
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
    </div>
  )
}