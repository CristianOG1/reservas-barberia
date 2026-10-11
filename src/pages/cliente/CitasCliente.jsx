import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../supabaseClient'

// Mismos turnos que BookingPage. Horas en 24 h; el AM/PM es solo visual.
const BLOQUES = [
  { titulo: 'Mañana', horas: ['10:00', '11:00', '11:50', '12:40'] },
  { titulo: 'Tarde', horas: ['14:30', '15:20', '16:00', '17:30'] },
  { titulo: 'Noche', horas: ['18:30'] },
]

const estilosEstado = {
  pendiente: 'bg-amber-100 text-amber-800',
  confirmada: 'bg-green-100 text-green-800',
  completada: 'bg-slate-200 text-slate-700',
  cancelada: 'bg-red-100 text-red-700',
}

// 'YYYY-MM-DD' en hora local (no usar toISOString: en México daría el día anterior)
const fechaISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const recortarHora = (h) => String(h ?? '').slice(0, 5) // '14:30:00' → '14:30'

function formato12h(hora) {
  const [h, m] = recortarHora(hora).split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

function formatearFecha(fecha) {
  const [y, m, d] = String(fecha).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function aDate(fecha, hora) {
  const [y, m, d] = String(fecha).slice(0, 10).split('-').map(Number)
  const [h, min] = recortarHora(hora).split(':').map(Number)
  return new Date(y, m - 1, d, h, min)
}

function Modal({ titulo, onCerrar, children }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/40 p-4"
      onClick={onCerrar}
      onKeyDown={(e) => e.key === 'Escape' && onCerrar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-navy">{titulo}</h2>
        {children}
      </div>
    </div>
  )
}

export default function CitasCliente() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [citas, setCitas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [tab, setTab] = useState('proximas')

  const [citaCancelar, setCitaCancelar] = useState(null)
  const [citaReagendar, setCitaReagendar] = useState(null)
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [nuevaHora, setNuevaHora] = useState(null)
  const [horasOcupadas, setHorasOcupadas] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Reloj congelado al montar (igual que en BookingPage): evita `new Date()` impuro en render.
  const [reloj] = useState(() => new Date())
  const hoy = fechaISO(reloj)
  const ahoraMin = reloj.getHours() * 60 + reloj.getMinutes()

  /* ---- Cargar solo las citas del usuario logueado ----
     RLS ya filtra por cliente_id; el .eq es redundante pero deja la intención clara.
     `barberos(nombre)` requiere que citas.barbero_id sea FK a barberos.id. */
  const cargarCitas = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('citas')
      .select('id, fecha, hora, servicio, productos, total, estado, barbero_id, barberos(nombre)')
      .eq('cliente_id', userId)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true })

    if (error) {
      console.error(error)
      setErrorCarga('No se pudieron cargar tus citas. Intenta de nuevo.')
    } else {
      setErrorCarga('')
      setCitas(data || [])
    }
    setCargando(false)
  }, [userId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarCitas()
  }, [cargarCitas])

  /* ---- Horas ocupadas en el modal de reagendar ---- */
  useEffect(() => {
    if (!citaReagendar || !nuevaFecha) return
    let vigente = true
    supabase
      .rpc('horas_ocupadas', { fecha_consulta: nuevaFecha, barbero_id: citaReagendar.barbero_id || null })
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) console.error(error)
        setHorasOcupadas((data || []).map((h) => recortarHora(h)))
      })
    return () => { vigente = false }
  }, [citaReagendar, nuevaFecha])

  const { proximas, historial } = useMemo(() => {
    const ahora = new Date()
    const activa = (c) =>
      (c.estado === 'pendiente' || c.estado === 'confirmada') && aDate(c.fecha, c.hora) >= ahora
    return {
      proximas: citas.filter(activa),
      historial: citas.filter((c) => !activa(c)).reverse(),
    }
  }, [citas])

  const lista = tab === 'proximas' ? proximas : historial

  const abrirReagendar = (cita) => {
    setCitaReagendar(cita)
    setNuevaFecha(String(cita.fecha).slice(0, 10))
    setNuevaHora(null)
    setHorasOcupadas([])
    setError('')
  }

  const elegirFecha = (f) => {
    setNuevaFecha(f)
    setNuevaHora(null)
    setHorasOcupadas([])
  }

  const esDomingo = nuevaFecha ? new Date(`${nuevaFecha}T00:00:00`).getDay() === 0 : false

  const horaDisponible = (h) => {
    if (esDomingo || horasOcupadas.includes(h)) return false
    if (nuevaFecha === hoy) {
      const [hh, mm] = h.split(':').map(Number)
      if (hh * 60 + mm <= ahoraMin) return false
    }
    return true
  }

  const confirmarCancelacion = async () => {
    setGuardando(true)
    setError('')
    const { error } = await supabase.rpc('cancelar_cita', { p_id: citaCancelar.id })
    setGuardando(false)
    if (error) {
      console.error(error)
      setError('No se pudo cancelar la cita. Puede que ya haya pasado o cambiado de estado.')
      return
    }
    setCitaCancelar(null)
    cargarCitas()
  }

  const confirmarReagendado = async () => {
    if (!nuevaFecha || !nuevaHora) return setError('Elige fecha y hora.')
    setGuardando(true)
    setError('')
    const { error } = await supabase.rpc('reagendar_cita', {
      p_id: citaReagendar.id,
      p_fecha: nuevaFecha,
      p_hora: nuevaHora,
    })
    setGuardando(false)
    if (error) {
      console.error(error)
      if (error.code === '23505') {
        // Otro cliente tomó ese horario justo antes.
        setNuevaHora(null)
        setError('Ese horario acaba de ser tomado, elige otro.')
        supabase
          .rpc('horas_ocupadas', { fecha_consulta: nuevaFecha, barbero_id: citaReagendar.barbero_id || null })
          .then(({ data }) => setHorasOcupadas((data || []).map((h) => recortarHora(h))))
      } else {
        setError('No se pudo reagendar la cita. Intenta de nuevo.')
      }
      return
    }
    setCitaReagendar(null)
    cargarCitas()
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy">Mis citas</h1>
          <p className="mt-1 text-sm text-slate">Consulta, reagenda o cancela tus citas agendadas.</p>
        </div>
        <Link
          to="/agendar"
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          + Nueva cita
        </Link>
      </div>

      <div className="mt-5 flex gap-1 rounded-lg bg-slate-200/60 p-1" role="tablist">
        {[
          { id: 'proximas', label: `Próximas (${proximas.length})` },
          { id: 'historial', label: `Historial (${historial.length})` },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              tab === t.id ? 'bg-white font-semibold text-navy shadow-sm' : 'text-slate hover:text-navy'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {cargando && <p className="text-sm text-slate">Cargando tus citas…</p>}
        {errorCarga && <p role="alert" className="text-sm text-red-600">{errorCarga}</p>}

        {!cargando && !errorCarga && lista.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate">
            {tab === 'proximas' ? 'No tienes citas próximas.' : 'Aún no tienes historial de citas.'}
          </div>
        )}

        {lista.map((cita) => (
          <article key={cita.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold capitalize text-navy">{formatearFecha(cita.fecha)}</p>
                <p className="text-sm text-slate">{formato12h(cita.hora)}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${estilosEstado[cita.estado] || 'bg-slate-200 text-slate-700'}`}>
                {cita.estado}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div className="col-span-2">
                <dt className="text-xs text-slate">Servicios</dt>
                <dd className="font-medium text-navy">{cita.servicio}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate">Barbero</dt>
                <dd className="font-medium text-navy">{cita.barberos?.nombre || 'Por asignar'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate">Total</dt>
                <dd className="font-medium tabular-nums text-navy">${Number(cita.total) || 0} MXN</dd>
              </div>
              {Array.isArray(cita.productos) && cita.productos.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-xs text-slate">Productos</dt>
                  <dd className="font-medium text-navy">{cita.productos.map((p) => p.nombre).join(', ')}</dd>
                </div>
              )}
            </dl>

            {tab === 'proximas' && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => abrirReagendar(cita)}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Reagendar
                </button>
                <button
                  onClick={() => { setCitaCancelar(cita); setError('') }}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Cancelar cita
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      {/* Modal cancelar */}
      {citaCancelar && (
        <Modal titulo="Cancelar cita" onCerrar={() => setCitaCancelar(null)}>
          <p className="mt-2 text-sm text-slate">
            ¿Seguro que quieres cancelar tu cita del{' '}
            <strong className="capitalize text-navy">{formatearFecha(citaCancelar.fecha)}</strong> a las{' '}
            {formato12h(citaCancelar.hora)}?
          </p>
          {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setCitaCancelar(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-navy hover:bg-slate-100">
              Volver
            </button>
            <button onClick={confirmarCancelacion} disabled={guardando} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
              {guardando ? 'Cancelando…' : 'Sí, cancelar'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal reagendar */}
      {citaReagendar && (
        <Modal titulo="Reagendar cita" onCerrar={() => setCitaReagendar(null)}>
          <p className="mt-2 text-sm text-slate">
            Actual: <span className="capitalize">{formatearFecha(citaReagendar.fecha)}</span> · {formato12h(citaReagendar.hora)}
          </p>

          <label className="mt-4 block text-sm text-navy">
            Nueva fecha
            <input
              type="date"
              min={hoy}
              value={nuevaFecha}
              onChange={(e) => elegirFecha(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-100"
            />
          </label>
          {esDomingo && <p className="mt-2 text-sm text-amber-700">Los domingos permanecemos cerrados.</p>}

          <div className="mt-4 space-y-3">
            {BLOQUES.map((b) => (
              <div key={b.titulo}>
                <p className="mb-1.5 text-xs text-slate">{b.titulo}</p>
                <div className="flex flex-wrap gap-2">
                  {b.horas.map((h) => {
                    const ok = horaDisponible(h)
                    const sel = nuevaHora === h
                    return (
                      <button
                        key={h}
                        type="button"
                        disabled={!ok}
                        onClick={() => setNuevaHora(h)}
                        title={!ok ? 'Horario no disponible' : undefined}
                        className={`rounded-md border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          sel ? 'border-primary bg-primary text-white' : 'border-slate-200 text-navy hover:bg-slate-100'
                        }`}
                      >
                        {formato12h(h)}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setCitaReagendar(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-navy hover:bg-slate-100">
              Volver
            </button>
            <button
              onClick={confirmarReagendado}
              disabled={guardando || !nuevaFecha || !nuevaHora}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
