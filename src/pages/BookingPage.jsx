import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const PASOS = ['Servicio', 'Fecha & Hora', 'Tus Datos']

// Las horas SIEMPRE en 24 h ('14:30'): la columna `citas.hora` es `time without
// time zone` y Postgres rechaza '14:30 PM'. El AM/PM solo se muestra en pantalla.
const BLOQUES = [
  { titulo: 'Mañana (10:00 – 13:00)', horas: ['10:00', '11:00', '11:50', '12:40'] },
  { titulo: 'Tarde (14:00 – 18:00)', horas: ['14:30', '15:20', '16:00', '17:30'] },
  { titulo: 'Noche (18:30 – 20:00)', horas: ['18:30'] },
]

const ETIQUETAS_DIA = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

// Fecha local en YYYY-MM-DD. NO usar toISOString(): convierte a UTC y en México
// (UTC-6) devuelve el día anterior.
function FechaISO(d) {
  const n = d instanceof Date ? d : new Date(`${String(d).slice(0, 10)}T00:00:00`)
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

// lunes de la semana a la que pertenece la fecha (la semana empieza en lunes)
function lunesDe(fecha) {
  const n = new Date(fecha)
  n.setHours(0, 0, 0, 0)
  const dow = n.getDay() // 0 = domingo
  n.setDate(n.getDate() + (dow === 0 ? -6 : 1 - dow))
  return n
}

function aMinutos(hora) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

// Solo presentación: '14:30' → '2:30 PM'
function formato12h(hora) {
  const [h, m] = hora.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// `duracion` es TEXT: puede venir '30' o '50 min'.
function formatoDuracion(valor) {
  const s = String(valor ?? '').trim()
  return /^\d+$/.test(s) ? `${s} min` : s || '—'
}

// Igual que `ServiciosAdmin.aMinutos()`: extrae el primer número del texto.
function duracionAMinutos(valor) {
  const n = parseInt(String(valor ?? '').match(/\d+/)?.[0] ?? '', 10)
  return Number.isFinite(n) ? n : 0
}

export default function BookingPage() {
  const [fechaElegida, setFechaElegida] = useState(null) // 'YYYY-MM-DD'
  const [horaElegida, setHoraElegida] = useState(null) // 'HH:MM' (24 h)

  const [pasoActual, setPasoActual] = useState(1) // 1, 2 o 3

  const [servicios, setServicios] = useState([])
  const [cargandoServicios, setCargandoServicios] = useState(true)
  // Selección múltiple: el id va de vuelta en el objeto para deseleccionar fácil.
  const [serviciosElegidos, setServiciosElegidos] = useState([])

  // Productos (opcional, selección múltiple)
  const [productos, setProductos] = useState([])
  const [productosElegidos, setProductosElegidos] = useState([])

  // null = "Cualquier barbero" (opción por defecto, siempre disponible)
  const [barberos, setBarberos] = useState([])
  const [cargandoBarberos, setCargandoBarberos] = useState(true)
  const [barberoElegido, setBarberoElegido] = useState(null)
  const barberoIdElegido = barberoElegido?.id || null

  const [form, setForm] = useState({ nombre: '', telefono: '', correo: '', notas: '' })
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const [estadoEnvio, setEstadoEnvio] = useState('idle') // idle | enviando | error | slot | exito

  // Panel de confirmación final: el botón del sidebar solo lo abre; el insert
  // ocurre al pulsar "Confirmar reservación" dentro del modal.
  const [mostrarResumen, setMostrarResumen] = useState(false)

  const [horasOcupadas, setHorasOcupadas] = useState([])

  // Navegación de semanas
  const [semanaBase, setSemanaBase] = useState(() => lunesDe(new Date()))

  // Reloj congelado al montar: `new Date()` dentro del render es impuro
  // (react-hooks/purity) y haría que "hoy" cambiara entre renders.
  const [reloj] = useState(() => new Date())
  const hoyISO = FechaISO(reloj)
  const ahoraMin = reloj.getHours() * 60 + reloj.getMinutes()
  const lunesActual = useMemo(() => lunesDe(reloj), [reloj])

  /* ---- Servicios desde la base de datos ---- */
  useEffect(() => {
    let vigente = true
    supabase
      .from('servicios')
      .select('nombre, categoria, descripcion, costo, duracion, imagen')
      .order('nombre', { ascending: true })
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) console.error(error)
        setServicios(data || [])
        setCargandoServicios(false)
      })
    return () => { vigente = false }
  }, [])

  /* ---- Productos desde la base de datos ----
     La lectura pública de `productos` para `anon` ya existe (política "Lectura
     publica"). Si la consulta falla, la lista queda vacía y la sección entera no
     se muestra: los productos son opcionales y no deben romper el flujo. */
  useEffect(() => {
    let vigente = true
    supabase
      .from('productos')
      .select('id, nombre, categoria, descripcion, precio, imagen')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) console.error(error)
        setProductos(data || [])
      })
    return () => { vigente = false }
  }, [])

  /* ---- Barberos disponibles desde la base de datos ----
     La lectura pública de `barberos` para `anon` ya existe (política "Lectura
     publica"). Solo se piden los que están `disponible = true`. */
  useEffect(() => {
    let vigente = true
    supabase
      .from('barberos')
      .select('id, nombre, especialidad, imagen')
      .eq('disponible', true)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!vigente) return
        // Si la consulta falla no se le muestra nada al usuario: la lista queda
        // vacía y solo aparece "Cualquier barbero", que siempre es válida.
        if (error) console.error(error)
        setBarberos(data || [])
        setCargandoBarberos(false)
      })
    return () => { vigente = false }
  }, [])

  /* ---- Horas ya ocupadas ----
     Se consulta por RPC: `citas` no es legible por `anon` (expondría nombre,
     teléfono y correo). `horas_ocupadas` es SECURITY DEFINER y devuelve
     únicamente columnas `hora`.

     Con barbero concreto devuelve las horas ocupadas de ese barbero; con
     "Cualquier barbero" devuelve las horas en las que ya no queda ninguno
     disponible. */
  const cargarHorasOcupadas = async (fecha, barberoId) => {
    if (!fecha) return
    const { data, error } = await supabase.rpc('horas_ocupadas', {
      fecha_consulta: fecha,
      barbero_id: barberoId,
    })
    if (error) {
      console.error(error)
      setHorasOcupadas([])
      return
    }
    setHorasOcupadas((data || []).map((h) => String(h).slice(0, 5)))
  }

  useEffect(() => {
    // Sin fecha no hay nada que pedir. Las horas se limpian al elegir el día
    // (handler), no aquí, para no llamar a setState de forma síncrona en el efecto.
    if (!fechaElegida) return
    let vigente = true
    supabase
      .rpc('horas_ocupadas', { fecha_consulta: fechaElegida, barbero_id: barberoIdElegido })
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) {
          console.error(error)
          setHorasOcupadas([])
          return
        }
        setHorasOcupadas((data || []).map((h) => String(h).slice(0, 5)))
      })
    return () => { vigente = false }
  }, [fechaElegida, barberoIdElegido])

  /* ---- Calendario: 7 días de la semana, generado desde la fecha real ---- */
  const dias = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(semanaBase)
      date.setDate(date.getDate() + i)
      const fecha = FechaISO(date)
      return {
        fecha,
        label: ETIQUETAS_DIA[i],
        numero: date.getDate(),
        esHoy: fecha === hoyISO,
        pasado: fecha < hoyISO,
        cerrado: date.getDay() === 0, // domingo cerrado
      }
    })
  }, [semanaBase, hoyISO])

  // Mes/año reales: se toma el día del medio de la semana para que una semana a
  // caballo entre dos meses no se etiquete con el mes equivocado.
  const etiquetaMes = useMemo(() => {
    const medio = dias[3].fecha
    const texto = new Date(`${medio}T00:00:00`).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    return texto.charAt(0).toUpperCase() + texto.slice(1)
  }, [dias])

  const moverSemana = (delta) => {
    const n = new Date(semanaBase)
    n.setDate(n.getDate() + delta * 7)
    setSemanaBase(n)
  }

  const elegirFecha = (fecha) => {
    setFechaElegida(fecha)
    setHoraElegida(null) // la hora elegida puede no servir en el nuevo día
    setHorasOcupadas([]) // limpia las del día anterior hasta que responda la RPC
  }

  // Cambiar de barbero cambia la disponibilidad del día, así que la hora
  // seleccionada deja de ser válida.
  const elegirBarbero = (barbero) => {
    setBarberoElegido(barbero)
    setHoraElegida(null)
    setHorasOcupadas([])
  }

  /* ---- Selección múltiple ---- */
  const alternarServicio = (s) => {
    setServiciosElegidos((prev) =>
      prev.some((x) => x.nombre === s.nombre)
        ? prev.filter((x) => x.nombre !== s.nombre)
        : [...prev, s]
    )
  }

  const alternarProducto = (p) => {
    setProductosElegidos((prev) =>
      prev.some((x) => x.id === p.id)
        ? prev.filter((x) => x.id !== p.id)
        : [...prev, p]
    )
  }

  const quitarServicio = (nombre) => setServiciosElegidos((prev) => prev.filter((x) => x.nombre !== nombre))
  const quitarProducto = (id) => setProductosElegidos((prev) => prev.filter((x) => x.id !== id))

  // Una hora no está disponible si ya está reservada o si hoy ya pasó.
  const horaDisponible = (hora) => {
    if (horasOcupadas.includes(hora)) return false
    if (fechaElegida === hoyISO && aMinutos(hora) <= ahoraMin) return false
    return true
  }

  /* ---- Totales: servicios + productos ---- */
  const totalServicios = serviciosElegidos.reduce((a, s) => a + (Number(s.costo) || 0), 0)
  const totalProductos = productosElegidos.reduce((a, p) => a + (Number(p.precio) || 0), 0)
  const total = totalServicios + totalProductos

  // Duración estimada: solo la de los servicios. Los productos no ocupan silla.
  const duracionTotalMin = serviciosElegidos.reduce((a, s) => a + duracionAMinutos(s.duracion), 0)

  /* ---- Guardado ---- */
  const handleConfirmar = async () => {
    setEstadoEnvio('enviando')

    // Si el cliente eligió "Cualquier barbero", se le asigna el primer barbero
    // disponible y libre en ese horario. La RPC devuelve solo el id; si no hay
    // ninguno (salón sin barberos activos) devuelve NULL y la cita se guarda
    // sin barbero, como antes.
    let barberoId = barberoIdElegido
    if (!barberoId) {
      const { data, error } = await supabase.rpc('asignar_barbero', {
        fecha_consulta: fechaElegida,
        hora_consulta: horaElegida,
      })
      if (error) console.error(error)
      barberoId = data || null
    }

    // No se envía `addon` (la columna existe pero la página ya no ofrece el
    // add-on) ni `estado`: la columna tiene default 'pendiente' en la BD.
    const { error } = await supabase.from('citas').insert([{
      nombre: form.nombre,
      telefono: form.telefono,
      correo: form.correo,
      notas: form.notas,
      // Varios servicios van como texto separado por ', ' porque la columna es
      // TEXT y `CitasAdmin` sigue leyéndola como una sola cadena.
      servicio: serviciosElegidos.map((s) => s.nombre).join(', '),
      productos: productosElegidos.map((p) => ({ nombre: p.nombre, precio: Number(p.precio) || 0 })),
      fecha: fechaElegida,          // 'YYYY-MM-DD' en hora local
      hora: horaElegida,            // 'HH:MM' 24 h
      total,
      barbero_id: barberoId,
    }])

    if (error) {
      console.error(error)
      // 23505 = unique_violation: el índice citas_slot_unico detectó que otro
      // cliente tomó el slot entre la consulta y este insert.
      if (error.code === '23505') {
        setHoraElegida(null)
        await cargarHorasOcupadas(fechaElegida, barberoIdElegido)
        setEstadoEnvio('slot')
        // El horario se liberó: hay que rehacer la fecha/hora, así que el modal
        // se cierra para no dejar una pantalla de confirmación obsoleta.
        setMostrarResumen(false)
        setPasoActual(2)
      } else {
        setEstadoEnvio('error')
      }
    } else {
      setEstadoEnvio('exito')
    }
  }

  // Al fallar el insert dentro del modal se mantiene abierto para reintentar;
  // el mensaje de slot vive en el sidebar, así que ahí se muestra.
  const volverAAgregar = () => {
    setMostrarResumen(false)
    setEstadoEnvio('idle')
    setPasoActual(1) // conserva servicios, productos y datos del cliente
  }

  const diaElegido = dias.find((d) => d.fecha === fechaElegida)

  if (estadoEnvio === 'exito') {
    return (
      <div className="bg-neutral-950 min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <p className="text-white text-2xl font-semibold mb-2">¡Reservación confirmada!</p>
          <p className="text-neutral-400 mb-6">Te contactaremos por WhatsApp para confirmar tu horario.</p>
          <Link to="/" className="bg-white text-neutral-900 px-5 py-3 rounded-md font-semibold">
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-neutral-950 min-h-screen">
      <div className="px-8 py-8 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <p className="text-neutral-500 text-xs tracking-wide mb-4">
          Reservar Citas
        </p>

        {/* Stepper */}
        <div className="flex items-center gap-3 mb-10">
          {PASOS.map((nombre, i) => {
            const numero = i + 1
            const activo = numero === pasoActual
            const completado = numero < pasoActual
            return (
              <div key={nombre} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      activo || completado
                        ? 'bg-sky-500 text-white'
                        : 'bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {numero}
                  </span>
                  <span className={activo ? 'text-white text-sm' : 'text-neutral-500 text-sm'}>
                    {nombre}
                  </span>
                </div>
                {numero < PASOS.length && (
                  <span className={`w-8 h-px ${completado ? 'bg-sky-500' : 'bg-neutral-800'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Encabezado */}
        <h1 className="text-white text-3xl font-bold mb-2">Agenda tu Corte</h1>
        <p className="text-neutral-400 text-sm mb-10 max-w-xl">
          Selecciona el tipo de servicio y el horario que mas te quede
        </p>

        {/* Layout de 2 columnas */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Columna izquierda: contenido del paso (2/3 del ancho) */}
          <div className="lg:col-span-2">

          {pasoActual === 1 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sky-400 text-xs tracking-wide">01. ELECCIÓN DE SERVICIO</p>
              </div>

              {cargandoServicios ? (
                <p className="text-neutral-400 text-sm">Cargando servicios...</p>
              ) : servicios.length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-10 text-center">
                  <p className="text-neutral-400 text-sm">Aún no hay servicios disponibles.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  {servicios.map((s) => {
                    const seleccionado = serviciosElegidos.some((x) => x.nombre === s.nombre)
                    return (
                      <button
                        key={s.id ?? s.nombre}
                        onClick={() => alternarServicio(s)}
                        className={`text-left bg-neutral-900 border rounded-xl p-5 relative ${
                          seleccionado ? 'border-sky-500' : 'border-neutral-800'
                        }`}
                      >
                        {s.imagen && (
                          <img
                            src={s.imagen}
                            alt={s.nombre}
                            className="mb-4 h-28 w-full rounded-lg object-cover"
                          />
                        )}
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-neutral-500 text-[10px] tracking-wide">{s.categoria}</span>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                              seleccionado ? 'bg-sky-500 text-white' : 'bg-neutral-800 text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                        </div>
                        <h3 className="text-white font-semibold mb-2">{s.nombre}</h3>
                        <p className="text-neutral-400 text-sm mb-6">{s.descripcion}</p>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-neutral-500">{formatoDuracion(s.duracion)}</span>
                          <span className="text-white font-semibold">${Number(s.costo)} <span className="text-neutral-500 text-xs">MXN</span></span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* ===== Selección de barbero (opcional) ===== */}
              <div className="mt-10">
                <p className="text-sky-400 text-xs tracking-wide mb-2">02. BARBERO</p>
                <h2 className="text-white text-xl font-semibold mb-4">Elige a tu barbero</h2>

                {cargandoBarberos ? (
                  <p className="text-neutral-400 text-sm">Cargando...</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* "Cualquier barbero" siempre disponible y por defecto */}
                    <button
                      onClick={() => elegirBarbero(null)}
                      className={`text-left bg-neutral-900 border rounded-xl p-5 ${
                        barberoElegido === null ? 'border-sky-500' : 'border-neutral-800'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-neutral-500 text-[10px] tracking-wide">Sin preferencia</span>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                            barberoElegido === null ? 'bg-sky-500 text-white' : 'bg-neutral-800 text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-white font-semibold">Cualquier barbero</h3>
                          <p className="text-neutral-400 text-sm">Mayor disponibilidad inmediata</p>
                        </div>
                      </div>
                    </button>

                    {barberos.map((b) => {
                      const seleccionado = barberoElegido?.id === b.id
                      return (
                        <button
                          key={b.id}
                          onClick={() => elegirBarbero(b)}
                          className={`text-left bg-neutral-900 border rounded-xl p-5 ${
                            seleccionado ? 'border-sky-500' : 'border-neutral-800'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-neutral-500 text-[10px] tracking-wide">Disponible</span>
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                seleccionado ? 'bg-sky-500 text-white' : 'bg-neutral-800 text-transparent'
                              }`}
                            >
                              ✓
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {b.imagen ? (
                              <img
                                src={b.imagen}
                                alt={b.nombre}
                                className="h-10 w-10 shrink-0 rounded-full object-cover bg-neutral-800"
                              />
                            ) : (
                              <div className="h-10 w-10 shrink-0 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-semibold text-neutral-400">
                                {b.nombre?.charAt(0) || '?'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3 className="text-white font-semibold truncate">{b.nombre}</h3>
                              <p className="text-neutral-400 text-sm truncate">
                                {b.especialidad || 'Barbero'}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ===== Productos (opcional) ===== */}
              {productos.length > 0 && (
                <div className="mt-10">
                  <p className="text-sky-400 text-xs tracking-wide mb-2">PRODUCTOS</p>
                  <h2 className="text-white text-xl font-semibold mb-4">
                    ¿Quieres agregar algún producto?
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {productos.map((p) => {
                      const elegido = productosElegidos.some((x) => x.id === p.id)
                      return (
                        <button
                          key={p.id}
                          onClick={() => alternarProducto(p)}
                          className={`text-left bg-neutral-900 border rounded-xl p-5 ${
                            elegido ? 'border-sky-500' : 'border-neutral-800'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-neutral-500 text-[10px] tracking-wide">
                              {p.categoria}
                            </span>
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                elegido ? 'bg-sky-500 text-white' : 'bg-neutral-800 text-transparent'
                              }`}
                            >
                              ✓
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {p.imagen ? (
                              <img
                                src={p.imagen}
                                alt={p.nombre}
                                className="h-10 w-10 shrink-0 rounded-lg object-cover bg-neutral-800"
                              />
                            ) : (
                              <div className="h-10 w-10 shrink-0 rounded-lg bg-neutral-800 flex items-center justify-center text-sm font-semibold text-neutral-400">
                                {p.nombre?.charAt(0) || '?'}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="text-white font-semibold truncate">{p.nombre}</h3>
                              <p className="text-white text-sm font-semibold tabular-nums">
                                ${Number(p.precio)}{' '}
                                <span className="text-neutral-500 text-xs">MXN</span>
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Botón siguiente: depende SOLO del servicio; barbero y productos
                  son opcionales */}
              <button
                disabled={serviciosElegidos.length === 0}
                onClick={() => setPasoActual(2)}
                className="mt-8 bg-white text-neutral-900 font-semibold px-6 py-3 rounded-md disabled:opacity-30"
              >Siguiente →</button>
            </div>
          )}

          {pasoActual === 2 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sky-400 text-xs tracking-wide">03. SELECCIÓN DE FECHA & TURNO</p>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-500 text-xs">{etiquetaMes}</span>
                  <button
                    onClick={() => moverSemana(-1)}
                    disabled={semanaBase.getTime() <= lunesActual.getTime()}
                    aria-label="Semana anterior"
                    className="w-6 h-6 rounded bg-neutral-900 text-neutral-400 flex items-center justify-center disabled:opacity-30"
                  >‹</button>
                  <button
                    onClick={() => moverSemana(1)}
                    aria-label="Semana siguiente"
                    className="w-6 h-6 rounded bg-neutral-900 text-neutral-400 flex items-center justify-center"
                  >›</button>
                </div>
              </div>

              {/* Días */}
              <div className="grid grid-cols-7 gap-2 mb-8">
                {dias.map((d) => {
                  const seleccionado = fechaElegida === d.fecha
                  const bloqueado = d.pasado || d.cerrado
                  return (
                    <button
                      key={d.fecha}
                      disabled={bloqueado}
                      onClick={() => elegirFecha(d.fecha)}
                      className={`rounded-lg py-3 text-center disabled:opacity-30 ${
                        seleccionado ? 'bg-sky-500 text-white' : 'bg-neutral-900 text-neutral-300'
                      }`}
                    >
                      <p className="text-[10px]">{d.label}</p>
                      <p className="text-lg font-semibold">{d.numero}</p>
                    </button>
                  )
                })}
              </div>

              {/* Bloques de horario */}
              <div className="flex flex-col gap-6">
                {BLOQUES.map((bloque) => (
                  <div key={bloque.titulo}>
                    <p className="text-neutral-500 text-xs tracking-wide mb-3">{bloque.titulo}</p>
                    <div className="flex flex-wrap gap-3">
                      {bloque.horas.map((h) => {
                        const disponible = horaDisponible(h)
                        const seleccionado = horaElegida === h
                        return (
                          <button
                            key={h}
                            disabled={!disponible}
                            onClick={() => setHoraElegida(h)}
                            title={!disponible ? 'Horario no disponible' : undefined}
                            className={`px-4 py-2 rounded-md text-sm disabled:opacity-30 disabled:cursor-not-allowed ${
                              seleccionado ? 'bg-sky-500 text-white' : 'bg-neutral-900 text-neutral-300'
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

              <div className="flex gap-3 mt-8">
                <button onClick={() => setPasoActual(1)} className="bg-neutral-800 text-white px-6 py-3 rounded-md">
                  ← Atrás
                </button>
                <button
                  disabled={!fechaElegida || !horaElegida}
                  onClick={() => setPasoActual(3)}
                  className="bg-white text-neutral-900 font-semibold px-6 py-3 rounded-md disabled:opacity-30"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {pasoActual === 3 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sky-400 text-xs tracking-wide">04. TITULAR DE LA CITA</p>
                <p className="text-neutral-500 text-xs">Confirmación instantánea vía WhatsApp</p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-neutral-400 text-xs block mb-2">Nombre Completo *</label>
                  <input
                    name="nombre" value={form.nombre} onChange={handleChange} required
                    className="w-full bg-neutral-800 text-white text-sm px-4 py-3 rounded-md outline-none"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs block mb-2">Teléfono Móvil (WhatsApp) *</label>
                  <input
                    name="telefono" value={form.telefono} onChange={handleChange} required
                    className="w-full bg-neutral-800 text-white text-sm px-4 py-3 rounded-md outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-neutral-400 text-xs block mb-2">Correo Corporativo / Personal *</label>
                  <input
                    type="email" name="correo" value={form.correo} onChange={handleChange} required
                    className="w-full bg-neutral-800 text-white text-sm px-4 py-3 rounded-md outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-neutral-400 text-xs block mb-2">
                    Notas Especiales o Preferencias <span className="text-neutral-600">Opcional</span>
                  </label>
                  <textarea
                    name="notas" value={form.notas} onChange={handleChange} rows={3}
                    className="w-full bg-neutral-800 text-white text-sm px-4 py-3 rounded-md outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setPasoActual(2)} className="bg-neutral-800 text-white px-6 py-3 rounded-md">
                  ← Atrás
                </button>
              </div>
            </div>
          )}
          </div>

          {/* Columna derecha: sidebar de resumen (1/3 del ancho) */}
          <div>
            {/* Sidebar de resumen */}
            <div className="lg:sticky lg:top-8 h-fit">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-neutral-500 text-xs tracking-wide">Vista de reserva</p>
                </div>
                <h3 className="text-white font-semibold mb-4">Resumen de tu Cita</h3>

                <div className="bg-neutral-800 rounded-lg p-4 mb-4">
                  <p className="text-white text-sm font-medium">{form.nombre || '—'}</p>
                </div>

                <div className="flex flex-col gap-3 text-sm border-t border-neutral-800 pt-4">
                  {/* Servicios elegidos, cada uno quitable */}
                  {serviciosElegidos.map((s) => (
                    <div key={s.nombre} className="flex items-center justify-between gap-2">
                      <span className="text-neutral-400 truncate">
                        {s.nombre}
                        <span className="text-neutral-600 text-xs ml-1.5">
                          {formatoDuracion(s.duracion)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-white tabular-nums">
                          ${Number(s.costo)} MXN
                        </span>
                        <button
                          onClick={() => quitarServicio(s.nombre)}
                          aria-label={`Quitar ${s.nombre}`}
                          className="text-neutral-500 hover:text-white text-sm leading-none px-1"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  ))}

                  {/* Productos elegidos */}
                  {productosElegidos.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2">
                      <span className="text-neutral-400 truncate">{p.nombre}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-white tabular-nums">
                          ${Number(p.precio)} MXN
                        </span>
                        <button
                          onClick={() => quitarProducto(p.id)}
                          aria-label={`Quitar ${p.nombre}`}
                          className="text-neutral-500 hover:text-white text-sm leading-none px-1"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  ))}

                  {serviciosElegidos.length === 0 && productosElegidos.length === 0 && (
                    <span className="text-neutral-500 text-sm">Aún no has elegido nada.</span>
                  )}

                  {duracionTotalMin > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Duración estimada</span>
                      <span className="text-white tabular-nums">
                        {formatoDuracion(String(duracionTotalMin))}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-neutral-400">Barbero</span>
                    <span className="text-white">
                      {barberoElegido?.nombre || 'Cualquier barbero'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Fecha & Horario</span>
                    <span className="text-sky-400">
                      {diaElegido ? `${diaElegido.label} ${diaElegido.numero}` : '—'} {horaElegida ? `· ${formato12h(horaElegida)}` : ''}
                    </span>
                  </div>
                </div>

                <div className="border-t border-neutral-800 mt-4 pt-4 flex justify-between items-center">
                  <span className="text-neutral-400 text-sm">TOTAL AL CONCLUIR</span>
                  <span className="text-white text-xl font-bold">
                    ${total} <span className="text-sm font-normal">MXN</span>
                  </span>
                </div>
                <p className="text-neutral-500 text-xs mt-2">
                  No se cobra nada en línea. Pago directo en sucursal.
                </p>

                <button
                    onClick={() => { setEstadoEnvio('idle'); setMostrarResumen(true) }}
                    disabled={serviciosElegidos.length === 0 || !fechaElegida || !horaElegida || !form.nombre || !form.telefono || !form.correo || estadoEnvio === 'enviando'}
                    className="w-full bg-white text-neutral-900 font-semibold py-3 rounded-md mt-5 disabled:opacity-30"
                  >
                    CONFIRMAR RESERVACIÓN →
                  </button>
                  {estadoEnvio === 'slot' && (
                    <p className="text-amber-400 text-xs mt-2">Ese horario acaba de ser tomado, elige otro.</p>
                )}
                  {estadoEnvio === 'error' && (
                    <p className="text-red-400 text-xs mt-2">Algo salió mal, intenta de nuevo.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Panel de confirmación final =====
          Aquí ocurre el insert. El botón del sidebar solo abre este modal. */}
      {mostrarResumen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl bg-neutral-900 border border-neutral-800 p-5 sm:p-6">
            <div>
              <p className="text-sky-400 text-xs tracking-wide mb-1">Último paso</p>
              <h2 className="text-white text-xl font-semibold">Confirma tu reservación</h2>
              <p className="text-neutral-400 text-sm mt-1">
                Revisa los detalles antes de enviarlos.
              </p>
            </div>

            {/* Servicios */}
            <div>
              <p className="text-neutral-500 text-xs tracking-wide mb-2">Servicios</p>
              {serviciosElegidos.length === 0 ? (
                <p className="text-neutral-500 text-sm">Sin servicios.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {serviciosElegidos.map((s) => (
                    <div key={s.nombre} className="flex justify-between gap-3 text-sm">
                      <span className="text-white">
                        {s.nombre}
                        <span className="text-neutral-500 text-xs ml-1.5">
                          {formatoDuracion(s.duracion)}
                        </span>
                      </span>
                      <span className="text-white tabular-nums shrink-0">
                        ${Number(s.costo)} MXN
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {duracionTotalMin > 0 && (
                <p className="text-neutral-500 text-xs mt-2">
                  Duración estimada: {formatoDuracion(String(duracionTotalMin))}
                </p>
              )}
            </div>

            {/* Productos */}
            <div>
              <p className="text-neutral-500 text-xs tracking-wide mb-2">Productos</p>
              {productosElegidos.length === 0 ? (
                <p className="text-neutral-500 text-sm">Sin productos.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {productosElegidos.map((p) => (
                    <div key={p.id} className="flex justify-between gap-3 text-sm">
                      <span className="text-white">{p.nombre}</span>
                      <span className="text-white tabular-nums shrink-0">
                        ${Number(p.precio)} MXN
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Turno y datos */}
            <div className="border-t border-neutral-800 pt-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-neutral-400">Barbero</span>
                <span className="text-white">{barberoElegido?.nombre || 'Cualquier barbero'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-400">Fecha</span>
                <span className="text-sky-400">
                  {diaElegido ? `${diaElegido.label} ${diaElegido.numero}` : '—'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-400">Hora</span>
                <span className="text-sky-400">{horaElegida ? formato12h(horaElegida) : '—'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-400">Nombre</span>
                <span className="text-white truncate">{form.nombre || '—'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-400">Teléfono</span>
                <span className="text-white tabular-nums">{form.telefono || '—'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-400">Correo</span>
                <span className="text-white truncate">{form.correo || '—'}</span>
              </div>
              {form.notas && (
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-400">Notas</span>
                  <span className="text-white truncate">{form.notas}</span>
                </div>
              )}
            </div>

            <div className="border-t border-neutral-800 pt-4 flex justify-between items-center">
              <span className="text-neutral-400 text-sm">TOTAL</span>
              <span className="text-white text-xl font-bold">
                ${total} <span className="text-sm font-normal">MXN</span>
              </span>
            </div>

            {estadoEnvio === 'error' && (
              <p role="alert" className="text-red-400 text-sm">
                No se pudo guardar la reservación, intenta de nuevo.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirmar}
                disabled={estadoEnvio === 'enviando'}
                className="w-full bg-white text-neutral-900 font-semibold py-3 rounded-md disabled:opacity-30"
              >
                {estadoEnvio === 'enviando' ? 'Guardando...' : 'Confirmar reservación'}
              </button>
              <button
                onClick={volverAAgregar}
                disabled={estadoEnvio === 'enviando'}
                className="w-full bg-neutral-800 text-white py-3 rounded-md disabled:opacity-30"
              >
                Agregar otro servicio o producto
              </button>
            </div>
            <p className="text-neutral-500 text-xs">
              No se cobra nada en línea. Pago directo en sucursal.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
