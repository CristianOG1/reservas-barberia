// src/pages/admin/CitasAdmin.jsx
// Gestión de Citas & Calendario del Salón.
// Página más grande del panel: se organiza en secciones — 1) header, 2) métricas,
// 3) controles de la tabla, 4) tabla de citas, 5) distribución semanal y
// recordatorios. Los datos vienen de `citas` y `barberos` reales; lo que aún no
// existe en el modelo (pago, recordatorios, vista calendario) se muestra como UI
// navegable y está marcado en el código como pendiente de lógica.
import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import CitaManualForm from './CitaManualForm'
import { useConfirmarCita } from '../../hooks/useConfirmarCita'

/* ============================================================
   1. UTILIDADES DE FECHA, HORA Y CATÁLOGO
   ============================================================ */

const DIAS_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

const ETIQUETA_ESTADO = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

// Colores de estado. Mismo mapa que usa ResumenPage: ámbar pendiente, azul
// confirmada, verde completada, rojo cancelada.
const BADGE_ESTADO = {
  pendiente: 'bg-amber-50 text-amber',
  confirmada: 'bg-primary-100 text-primary',
  completada: 'bg-green-50 text-green-600',
  cancelada: 'bg-red-50 text-red-600',
}

const ITEMS_POR_PAGINA = 8
const DURACION_POR_DEFECTO = 30 // minutos, cuando el servicio no está en el catálogo
const FILTRO_SIN_ASIGNAR = 'sin-asignar'

// 'estado' es nullable en la base: las citas nuevas nacen sin estado.
function estadoDe(cita) {
  return cita.estado || 'pendiente'
}

// Fecha local en formato YYYY-MM-DD. Se parsesa explícitamente en hora local:
// `new Date('2026-09-30')` se interpretaría en UTC y en México mostraría el 29.
function FechaISO(d) {
  const n = d instanceof Date ? d : new Date(`${String(d).slice(0, 10)}T00:00:00`)
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function etiquetaFecha(iso) {
  const n = new Date(`${iso}T00:00:00`)
  const dia = DIAS_CORTO[n.getDay()]
  const texto = n.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${texto}`
}

// `citas.hora` es una columna `time`: llega como 'HH:MM:SS'. El flujo público
// guarda textos tipo '10:00 AM', así que se aceptan ambos formatos.
function formatearHora(valor) {
  if (!valor) return '—'
  const s = String(valor).trim()
  const m = /^(\d{1,2}):(\d{2})/.exec(s)
  if (!m) return s
  if (/\b(am|pm)\b/i.test(s)) return s.toUpperCase()
  const h = Number(m[1])
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`
}

function minutosDeHora(valor) {
  if (valor instanceof Date) return valor.getHours() * 60 + valor.getMinutes()
  const m = /^(\d{1,2}):(\d{2})/.exec(String(valor || '').trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// `citas.servicio` es texto libre y casi nunca coincide con `servicios.nombre`
// (el catálogo dice 'Corte de Cabello', las citas dicen 'Corte'). Se resuelve
// por nombre exacto, luego por categoría exacta y luego por categoría contenida.
function buscarServicio(nombreCita, servicios) {
  const n = normalizar(nombreCita)
  if (!n) return null
  return (
    servicios.find((s) => normalizar(s.nombre) === n) ||
    servicios.find((s) => normalizar(s.categoria) === n) ||
    servicios.find((s) => normalizar(s.categoria) && n.includes(normalizar(s.categoria))) ||
    null
  )
}

/* ============================================================
   2. ICONOS
   ============================================================ */

function IconoCalendario() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function IconoReloj() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>
    </svg>
  )
}

function IconoCumplimiento() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
}

function IconoAnterior() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}

function IconoSiguiente() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function IconoTelefono() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
}

function IconoCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconoCobrar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  )
}

function IconoCalendarioMas() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
    </svg>
  )
}

function IconoX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function IconoReactivar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M3 2v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L3 8"/>
    </svg>
  )
}

function IconoBandeja() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
    </svg>
  )
}

function IconoLista() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}

function IconoParrilla() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function IconoBarras() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
    </svg>
  )
}

/* ============================================================
   3. ESTILOS DE LOS BOTONES DE ACCIÓN RÁPIDA
   ============================================================ */

const CLASE_ACCION = {
  primario: 'inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
  neutro: 'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-navy transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
  peligro: 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600',
}

/* ============================================================
   4. PÁGINA
   ============================================================ */

export default function CitasAdmin() {
  const [citas, setCitas] = useState([])
  const [barberos, setBarberos] = useState([])
  const [servicios, setServicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  // Controles
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => FechaISO(new Date()))
  const [barberoFiltro, setBarberoFiltro] = useState('')
  const [tab, setTab] = useState('todas')
  const [vista, setVista] = useState('lista')
  const [pagina, setPagina] = useState(1)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [citaEditando, setCitaEditando] = useState(null)

  // Lógica de confirmación compartida con Resumen: optimistic update + revert (§).
  const confirmarCita = useConfirmarCita(setCitas, setErrorMsg)

  // `new Date()` dentro del render es una función impura (react-hooks/purity): da
  // resultados distintos en cada render. Se congela una sola vez al montar, así
  // "hoy", "ahora" y la semana no se mueven a media sesión.
  const [reloj] = useState(() => new Date())

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setCargando(true)
    const [citasRes, barberosRes, serviciosRes] = await Promise.all([
      supabase.from('citas').select('*').order('fecha', { ascending: true }).order('hora', { ascending: true }),
      supabase.from('barberos').select('*').order('created_at', { ascending: true }),
      supabase.from('servicios').select('*').order('nombre', { ascending: true }),
    ])

    setCitas(citasRes.data || [])
    setBarberos(barberosRes.data || [])
    setServicios(serviciosRes.data || [])
    setCargando(false)
  }

  const barberoPorId = (id) => barberos.find((b) => b.id === id) || null

  /* ---- Escrituras ----
     Patrón optimistic update + escritura real en Supabase, pero ahora revisando
     el `error`: si RLS o la red rechazan el cambio, se revierte y se avisa. */
  const aplicarEstado = async (cita, nuevoEstado) => {
    const anterior = estadoDe(cita)
    if (anterior === nuevoEstado) return
    setCitas(citas.map((c) => (c.id === cita.id ? { ...c, estado: nuevoEstado } : c)))
    setErrorMsg(null)
    const { error } = await supabase.from('citas').update({ estado: nuevoEstado }).eq('id', cita.id)
    if (error) {
      setCitas(citas.map((c) => (c.id === cita.id ? { ...c, estado: anterior } : c)))
      setErrorMsg(`No se pudo actualizar el estado de la cita: ${error.message}`)
    }
  }

  const abrirNueva = () => { setCitaEditando(null); setMostrarForm(true) }
  const abrirReprogramar = (cita) => { setCitaEditando(cita); setMostrarForm(true) }
  const alGuardar = () => {
    setMostrarForm(false)
    setCitaEditando(null)
    cargarDatos()
  }

  /* ---- Métricas ---- */
  const hoy = FechaISO(reloj)
  const hace6 = FechaISO(new Date(reloj.getTime() - 6 * 24 * 60 * 60 * 1000))
  const manana = FechaISO(new Date(reloj.getTime() + 24 * 60 * 60 * 1000))
  const ahoraMin = minutosDeHora(reloj)

  const citasHoy = citas.filter((c) => c.fecha === hoy)
  const citasSemana = citas.filter((c) => c.fecha >= hace6 && c.fecha <= hoy)
  const canceladasSemana = citasSemana.filter((c) => estadoDe(c) === 'cancelada')

  // En curso: la tabla no tiene un estado 'en curso' (solo pendiente/confirmada/
  // completada/cancelada), así que se deriva de la hora actual contra la hora de
  // la cita y la duración del servicio. También se acepta el literal por si más
  // adelante se agrega como estado.
  const estaEnCurso = (cita) => {
    const e = estadoDe(cita)
    if (e === 'en_curso' || e === 'en curso') return true
    if (e !== 'confirmada') return false
    const inicio = minutosDeHora(cita.hora)
    if (inicio == null) return false
    const duracion = Number(buscarServicio(cita.servicio, servicios)?.duracion) || DURACION_POR_DEFECTO
    return ahoraMin >= inicio && ahoraMin < inicio + duracion
  }

  const enCursoHoy = citasHoy.filter((c) => estaEnCurso(c) || estadoDe(c) === 'completada').length

  const cumplimientoPct = citasSemana.length > 0
    ? Math.round(((citasSemana.length - canceladasSemana.length) / citasSemana.length) * 100)
    : null

  const pendientesManana = citas.filter((c) => c.fecha === manana && estadoDe(c) === 'pendiente').length

  /* ---- Distribución de los últimos 7 días (conteo real agrupado por fecha) ---- */
  const distribucion = Array.from({ length: 7 }, (_, i) => {
    const fecha = FechaISO(new Date(reloj.getTime() - (6 - i) * 24 * 60 * 60 * 1000))
    const indiceDia = new Date(`${fecha}T00:00:00`).getDay()
    return {
      fecha,
      etiqueta: DIAS_CORTO[indiceDia],
      esHoy: fecha === hoy,
      total: citas.filter((c) => c.fecha === fecha).length,
    }
  })
  const maxDia = Math.max(...distribucion.map((d) => d.total), 1)
  const promedioDiario = citasSemana.length > 0 ? (citasSemana.length / 7).toFixed(1) : '0.0'

  /* ---- Filtrado ---- */
  const citasDelDia = citas.filter((c) => c.fecha === fechaSeleccionada)
  const citasBase = citasDelDia.filter((c) => {
    if (!barberoFiltro) return true
    if (barberoFiltro === FILTRO_SIN_ASIGNAR) return !c.barbero_id
    return c.barbero_id === barberoFiltro
  })

  // Los conteos de las pestañas se calculan sobre el set ya filtrado por fecha y
  // barbero, para que el número que se ve sea el número que se va a ver.
  const conteos = { todas: citasBase.length, pendiente: 0, confirmada: 0, completada: 0, cancelada: 0 }
  citasBase.forEach((c) => { conteos[estadoDe(c)] = (conteos[estadoDe(c)] || 0) + 1 })

  const citasFiltradas = citasBase.filter((c) => tab === 'todas' || estadoDe(c) === tab)

  const totalPaginas = Math.max(1, Math.ceil(citasFiltradas.length / ITEMS_POR_PAGINA))
  const paginadas = citasFiltradas.slice((pagina - 1) * ITEMS_POR_PAGINA, pagina * ITEMS_POR_PAGINA)
  const desde = citasFiltradas.length === 0 ? 0 : (pagina - 1) * ITEMS_POR_PAGINA + 1
  const hasta = Math.min(pagina * ITEMS_POR_PAGINA, citasFiltradas.length)

  const ultimaFechaConCitas = citas.length > 0 ? [...citas].sort((a, b) => b.fecha.localeCompare(a.fecha))[0].fecha : null

  const irADia = (delta) => {
    const f = new Date(`${fechaSeleccionada}T00:00:00`)
    f.setDate(f.getDate() + delta)
    setFechaSeleccionada(FechaISO(f))
    setPagina(1)
  }

  const cambiarFiltro = (setter) => (e) => {
    setter(e.target.value)
    setPagina(1)
  }

  if (cargando) return <p className="text-slate-500">Cargando...</p>

  /* ---- Acciones rápidas por estado ---- */
  const accionesDe = (cita) => {
    switch (estadoDe(cita)) {
      case 'pendiente':
        return [
          {
            k: 'recontactar',
            etiqueta: 'Recontactar',
            clase: 'neutro',
            icono: <IconoTelefono />,
            // PENDIENTE: este botón marca el número en el teléfono. El envío de
            // plantilla por WhatsApp depende del servicio de mensajería (§ tarjeta
            // de recordatorios), todavía inexistente.
            accion: () => window.open(`tel:${cita.telefono}`, '_self'),
          },
          {
            k: 'confirmar',
            etiqueta: 'Confirmar',
            clase: 'primario',
            icono: <IconoCheck />,
            accion: () => confirmarCita(cita),
          },
          {
            k: 'cancelar',
            etiqueta: 'Cancelar',
            clase: 'peligro',
            icono: <IconoX />,
            accion: () => {
              if (!confirm(`¿Cancelar la cita de ${cita.nombre}?`)) return
              aplicarEstado(cita, 'cancelada')
            },
          },
        ]
      case 'confirmada':
        return [
          {
            k: 'completar',
            etiqueta: 'Completar',
            clase: 'primario',
            icono: <IconoCheck />,
            accion: () => aplicarEstado(cita, 'completada'),
          },
          {
            k: 'cobrar',
            etiqueta: 'Cobrar',
            clase: 'neutro',
            icono: <IconoCobrar />,
            // PENDIENTE: `citas` no tiene columnas de pago (`pagado`, `metodo_pago`),
            // así que "Cobrar" cierra la cita como completada. Cuando exista el
            // registro de cobro, esta acción pasa a escribirlo.
            accion: () => {
              const monto = cita.total ? ` de $${cita.total} MXN` : ''
              if (!confirm(`¿Registrar el cobro${monto} y cerrar la cita?`)) return
              aplicarEstado(cita, 'completada')
            },
          },
          {
            k: 'reprogramar',
            etiqueta: 'Reprogramar',
            clase: 'neutro',
            icono: <IconoCalendarioMas />,
            accion: () => abrirReprogramar(cita),
          },
        ]
      case 'completada':
        return [
          {
            k: 'reprogramar',
            etiqueta: 'Reprogramar',
            clase: 'neutro',
            icono: <IconoCalendarioMas />,
            accion: () => abrirReprogramar(cita),
          },
        ]
      case 'cancelada':
        return [
          {
            k: 'reactivar',
            etiqueta: 'Reactivar',
            clase: 'neutro',
            icono: <IconoReactivar />,
            // Reactivar devuelve la cita a la cola de pendientes de confirmar.
            accion: () => aplicarEstado(cita, 'pendiente'),
          },
        ]
      default:
        return []
    }
  }

  return (
    <div>
      {/* ==========================================================
          SECCIÓN 1 · HEADER
          ========================================================== */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber">
            Gestion de Turnos
          </p>
          <h1 className="font-serif text-3xl text-navy">Gestión de Citas</h1>
          <p className="mt-1 text-sm text-slate">
            Control de citas en tiempo real: barberos en turno, servicios contratados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={abrirNueva}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <IconoCalendarioMas />
            Nueva Cita Manual
          </button>
        </div>
      </div>

      {/* ==========================================================
          SECCIÓN 2 · MÉTRICAS
          ========================================================== */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total histórico */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary">
            <IconoCalendario />
          </div>
          <p className="font-serif text-3xl tabular-nums text-navy">{citas.length}</p>
          <p className="mt-1 text-sm text-slate">Total histórico</p>
          <p className="mt-2 text-xs text-slate">
            <span className="text-primary">{citasSemana.length}</span>
            <span className="mx-1 text-slate-400">·</span>
            en los últimos 7 días
          </p>
        </div>

        {/* Citas hoy */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary">
            <IconoReloj />
          </div>
          <p className="font-serif text-3xl tabular-nums text-navy">{citasHoy.length}</p>
          <p className="mt-1 text-sm text-slate">Citas hoy</p>
          <p className="mt-2 text-xs text-slate">
            <span className="text-primary">{enCursoHoy}</span>
            <span className="mx-1 text-slate-400">·</span>
            en curso o completadas
          </p>
        </div>

        {/* Semana actual */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber">
            <IconoBarras />
          </div>
          <p className="font-serif text-3xl tabular-nums text-navy">{citasSemana.length}</p>
          <p className="mt-1 text-sm text-slate">Semana actual</p>
          <p className="mt-2 text-xs text-slate">
            <span className="text-slate">{promedioDiario}</span>
            <span className="mx-1 text-slate-400">·</span>
            promedio por día
          </p>
        </div>

        {/* Cumplimiento */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber">
            <IconoCumplimiento />
          </div>
          <p className="font-serif text-3xl tabular-nums text-navy">
            {cumplimientoPct == null ? '—' : `${cumplimientoPct}%`}
          </p>
          <p className="mt-1 text-sm text-slate">Cumplimiento</p>
          <p className="mt-2 text-xs text-slate">
            {cumplimientoPct == null ? (
              'Sin citas en la ventana de 7 días'
            ) : (
              <>
                <span className="text-red-600">{canceladasSemana.length}</span>
                <span className="mx-1 text-slate-400">·</span>
                canceladas sobre {citasSemana.length} del periodo
              </>
            )}
          </p>
        </div>
      </div>

      {/* ==========================================================
          SECCIÓN 3 · CONTROLES DE LA TABLA
          ========================================================== */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        {/* Navegador de fecha */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => irADia(-1)}
            aria-label="Día anterior"
            className="rounded-lg border border-slate-200 p-2 text-slate transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <IconoAnterior />
          </button>
          <button
            onClick={() => { setFechaSeleccionada(hoy); setPagina(1) }}
            aria-current={fechaSeleccionada === hoy ? 'date' : undefined}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              fechaSeleccionada === hoy
                ? 'border-primary bg-primary text-white'
                : 'border-slate-200 text-navy hover:bg-slate-100'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => irADia(1)}
            aria-label="Día siguiente"
            className="rounded-lg border border-slate-200 p-2 text-slate transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <IconoSiguiente />
          </button>
        </div>

        <p className="px-1 font-serif text-sm capitalize text-navy">{etiquetaFecha(fechaSeleccionada)}</p>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Filtro por barbero */}
          <select
            value={barberoFiltro}
            onChange={cambiarFiltro(setBarberoFiltro)}
            aria-label="Filtrar por barbero"
            className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary-100"
          >
            <option value="">Todos los Barberos</option>
            {barberos.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
            <option value={FILTRO_SIN_ASIGNAR}>Sin barbero asignado</option>
          </select>

          {/* Toggle de vista */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="Cambiar vista">
            <button
              onClick={() => setVista('lista')}
              aria-pressed={vista === 'lista'}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                vista === 'lista' ? 'bg-primary text-white' : 'text-slate hover:text-navy'
              }`}
            >
              <IconoLista />
              Lista Detallada
            </button>
            <button
              onClick={() => setVista('calendario')}
              aria-pressed={vista === 'calendario'}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                vista === 'calendario' ? 'bg-primary text-white' : 'text-slate hover:text-navy'
              }`}
            >
              <IconoParrilla />
              Vista Calendario
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <p role="alert" className="mb-4 rounded-lg border border-red-600/30 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {errorMsg}
        </p>
      )}

      {/* ==========================================================
          SECCIÓN 4 · TABLA DE CITAS
          ========================================================== */}
      {vista === 'calendario' ? (
        /* PENDIENTE: vista calendario. La pestaña ya es navegable, pero la línea de
           tiempo por hora no tiene lógica todavía. Requiere, además, revisar
           solapamientos de horario (hoy nada impide reservar dos citas en el
           mismo slot). */
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-16 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary">
            <IconoParrilla />
          </div>
          <h2 className="font-serif text-lg text-navy">Vista Calendario</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate">
            Próximamente: rejilla de franjas horarias con la duración real de cada servicio,
            una columna por barbero y el conflicto de agenda detectado.
          </p>
          <ul className="mx-auto mt-5 max-w-sm space-y-1.5 text-left text-sm text-slate">
            <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />Franjas por hora en la rejilla</li>
            <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />Bloqueos por mantenimiento y descansos</li>
            <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />Aviso de solapamiento al reservar</li>
          </ul>
          <button
            onClick={() => setVista('lista')}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm text-navy transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <IconoLista />
            Volver a la lista detallada
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Tabs de estado */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 className="font-serif text-lg text-navy">Agenda del {etiquetaFecha(fechaSeleccionada)}</h2>
            <div className="flex flex-wrap items-center gap-1 overflow-x-auto" role="group" aria-label="Filtrar por estado">
              {[
                { k: 'todas', label: 'Todas' },
                { k: 'pendiente', label: 'Pendientes de Confirmar' },
                { k: 'confirmada', label: 'Confirmadas' },
                { k: 'completada', label: 'Completadas' },
                { k: 'cancelada', label: 'Canceladas' },
              ].map((t) => (
                <button
                  key={t.k}
                  aria-pressed={tab === t.k}
                  onClick={() => { setTab(t.k); setPagina(1) }}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    tab === t.k ? 'bg-primary text-white' : 'text-slate hover:bg-slate-100 hover:text-navy'
                  }`}
                >
                  {t.label}
                  <span className={`ml-1.5 tabular-nums ${tab === t.k ? 'text-white/70' : 'text-slate-400'}`}>
                    {conteos[t.k] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {citasFiltradas.length === 0 ? (
            <div className="px-5 py-12 text-center">
              {citasDelDia.length === 0 ? (
                <>
                  <p className="text-sm text-slate-500">
                    No hay citas agendadas para el {etiquetaFecha(fechaSeleccionada)}.
                  </p>
                  {ultimaFechaConCitas && ultimaFechaConCitas !== fechaSeleccionada && (
                    <button
                      onClick={() => { setFechaSeleccionada(ultimaFechaConCitas); setPagina(1) }}
                      className="mt-3 block w-full text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Ir al {etiquetaFecha(ultimaFechaConCitas)}, el día con citas más reciente →
                    </button>
                  )}
                  <button
                    onClick={abrirNueva}
                    className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <IconoCalendarioMas />
                    Nueva Cita Manual
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-500">Ninguna cita del día coincide con este estado.</p>
                  <button
                    onClick={() => { setTab('todas'); setBarberoFiltro(''); setPagina(1) }}
                    className="mt-3 block w-full text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Quitar filtros →
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Hora &amp; Duración</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Cliente</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Servicio contratado</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Barbero asignado</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Estado</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate">Acciones rápidas</th>
                  </tr>
                </thead>
                <tbody>
                  {paginadas.map((c) => {
                    const estado = estadoDe(c)
                    const cancelada = estado === 'cancelada'
                    const servicio = buscarServicio(c.servicio, servicios)
                    const barbero = barberoPorId(c.barbero_id)
                    const enCurso = estaEnCurso(c)
                    // Primera visita: ninguna otra cita del mismo teléfono agendada
                    // antes que esta (mismo día, pero más temprano, cuenta como previa).
                    const primeraVisita = !citas.some((otra) =>
                      otra.id !== c.id &&
                      otra.telefono === c.telefono &&
                      (otra.fecha < c.fecha || (otra.fecha === c.fecha && minutosDeHora(otra.hora) < minutosDeHora(c.hora)))
                    )
                    const total = Number(c.total)

                    return (
                      <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        {/* Hora & duración */}
                        <td className="px-5 py-3.5">
                          <p className={`font-serif text-sm tabular-nums ${cancelada ? 'text-slate-400 line-through' : 'text-navy'}`}>
                            {formatearHora(c.hora)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate">
                            {servicio ? `${servicio.duracion} min` : 'Duración no registrada'}
                          </p>
                          {enCurso && (
                            <span className="mt-1 inline-block rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              (Actual)
                            </span>
                          )}
                        </td>

                        {/* Cliente */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate">
                              {c.nombre?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-navy">{c.nombre}</p>
                              <p className="truncate text-xs tabular-nums text-slate">{c.telefono}</p>
                              {primeraVisita && (
                                <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber">
                                  Primera visita
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Servicio + total */}
                        <td className="px-5 py-3.5">
                          <p className={`text-sm ${cancelada ? 'text-slate' : 'text-navy'}`}>{c.servicio}</p>
                          <p className="mt-0.5 text-xs tabular-nums text-slate">
                            {total ? `$${total.toLocaleString('es-MX')} MXN` : 'Precio sin capturar'}
                            {c.addon ? ' · con vapor ozono' : ''}
                          </p>
                        </td>

                        {/* Barbero asignado */}
                        <td className="px-5 py-3.5">
                          {barbero ? (
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100">
                                {barbero.imagen ? (
                                  <img src={barbero.imagen} alt={barbero.nombre} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                                    {barbero.nombre?.charAt(0) || '?'}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-navy">{barbero.nombre}</p>
                                <p className="truncate text-xs text-slate">{barbero.especialidad || 'Sin especialidad'}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400">Sin asignar</p>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="px-5 py-3.5">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_ESTADO[estado] || BADGE_ESTADO.pendiente}`}>
                            {ETIQUETA_ESTADO[estado] || ETIQUETA_ESTADO.pendiente}
                          </span>
                        </td>

                        {/* Acciones rápidas */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {accionesDe(c).map((a) => (
                              <button
                                key={a.k}
                                onClick={a.accion}
                                className={CLASE_ACCION[a.clase]}
                              >
                                {a.icono}
                                {a.etiqueta}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <p className="text-sm text-slate">
                Mostrando <strong className="text-navy">{desde}–{hasta}</strong> de{' '}
                <strong className="text-navy">{citasFiltradas.length}</strong> citas del día
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  aria-label="Página anterior"
                  className="rounded-lg border border-slate-200 p-1.5 text-slate transition-colors hover:bg-slate-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <IconoAnterior />
                </button>
                <span className="px-2 text-sm tabular-nums text-slate">
                  {pagina} / {totalPaginas}
                </span>
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  aria-label="Página siguiente"
                  className="rounded-lg border border-slate-200 p-1.5 text-slate transition-colors hover:bg-slate-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <IconoSiguiente />
                </button>
              </div>
            </div>
            </>
          )}
        </div>
      )}

      {/* ==========================================================
          SECCIÓN 5 · DISTRIBUCIÓN SEMANAL Y RECORDATORIOS
          ========================================================== */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* 5.1 Distribución semanal */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-serif text-base text-navy">Distribución Semanal</h3>
            <p className="mt-0.5 text-xs text-slate">
              Promedio de <strong className="text-navy">{promedioDiario}</strong> citas por día · últimos 7 días
            </p>
          </div>
          <div className="px-5 py-5">
            <div className="flex h-28 items-end gap-1.5">
              {distribucion.map((d) => (
                <div key={d.fecha} className="flex h-full flex-1 flex-col justify-end gap-1.5">
                  <span className="text-center text-xs tabular-nums text-navy">{d.total}</span>
                  <div
                    title={`${etiquetaFecha(d.fecha)}: ${d.total} citas`}
                    className={`w-full rounded-t ${d.total > 0 ? 'bg-primary' : 'bg-slate-100'}`}
                    style={{ height: `${d.total > 0 ? Math.max((d.total / maxDia) * 100, 6) : 2}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5 border-t border-slate-100 pt-2">
              {distribucion.map((d) => (
                <span
                  key={d.fecha}
                  className={`flex-1 text-center text-[10px] uppercase tracking-wide ${d.esHoy ? 'font-semibold text-primary' : 'text-slate'}`}
                >
                  {d.etiqueta}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 5.2 Recordatorios SMS / WhatsApp */}
        {/* PENDIENTE: esta integración NO existe. Los botones quedan deshabilitados
             a propósito —no hacen nada y no fingen mandar nada. Para conectarla
             hace falta: (1) un proveedor (Twilio / WhatsApp Business), (2) una
             Edge Function con la plantilla, y (3) decidir desde cuándo se dispara
             (H-24 y H-2 antes de la cita). El conteo de arriba sí es real. */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-serif text-base text-navy">Recordatorios SMS / WhatsApp</h3>
            <p className="mt-0.5 text-xs text-slate">
              <strong className="text-navy">{pendientesManana}</strong> citas por confirmar mañana
            </p>
          </div>
          <div className="px-5 py-5">
            <div className="mb-4 flex items-start gap-3 rounded-lg bg-slate-50 p-3">
              <span className="mt-0.5 shrink-0 text-slate-400"><IconoBandeja /></span>
              <p className="text-xs text-slate">
                Canal de mensajería <strong className="text-navy">no configurado</strong>. Enviar
                confirmaciones y recordatorios automáticos requiere conectar un proveedor externo.
              </p>
            </div>
            <ul className="mb-4 space-y-1.5 text-xs text-slate">
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />Plantilla · Confirmación de reserva</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />Plantilla · Recordatorio 24 h antes</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />Plantilla · Reprogramación y cancelación</li>
            </ul>
            <div className="flex gap-2">
              <button
                disabled
                title="Pendiente: sin integración de mensajería"
                className="flex-1 cursor-not-allowed rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate opacity-50"
              >
                Ver Plantillas
              </button>
              <button
                disabled
                title="Pendiente: sin integración de mensajería"
                className="flex-1 cursor-not-allowed rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white opacity-50"
              >
                Enviar Ahora
              </button>
            </div>
          </div>
        </div>
      </div>

      {mostrarForm && (
        <CitaManualForm
          cita={citaEditando}
          servicios={servicios}
          barberos={barberos}
          onClose={() => { setMostrarForm(false); setCitaEditando(null) }}
          onGuardado={alGuardar}
        />
      )}
    </div>
  )
}
