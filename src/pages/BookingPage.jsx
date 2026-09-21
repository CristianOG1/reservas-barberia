// src/pages/BookingPage.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'


const PASOS = ['Servicio', 'Fecha & Hora', 'Tus Datos']
const servicios = [
  {
    nombre: 'Corte',
    descripcion: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry',
    precio: 680,
  },
  {
    nombre: 'Definicion de Barba',
    descripcion: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry',
    precio: 540,
  },
]

const dias = [
  { label: 'LUN', numero: 21, disponible: true },
  { label: 'MAR', numero: 22, disponible: true },
  { label: 'MIÉ', numero: 23, disponible: true },
  { label: 'JUE', numero: 24, disponible: true },
  { label: 'VIE', numero: 25, disponible: true },
  { label: 'SÁB', numero: 26, disponible: true },
  { label: 'DOM', numero: 27, disponible: false },
]

const bloques = [
  { titulo: 'Mañana (10:00 – 13:00)', horas: ['10:00 AM', '11:00 AM', '11:50 AM', '12:40 PM'] },
  { titulo: 'Tarde (14:00 – 18:00)', horas: ['14:30 PM', '15:20 PM', '16:00 PM', '17:30 PM'] },
  { titulo: 'Noche (18:30 – 20:00)', horas: ['18:30 PM'] },
]

export default function BookingPage() {
  const [fechaElegida, setFechaElegida] = useState(null)
  const [horaElegida, setHoraElegida] = useState(null)

  const [pasoActual, setPasoActual] = useState(1) // 1, 2 o 3
  
  const [servicioElegido, setServicioElegido] = useState(null)
  const [addon, setAddon] = useState(false)

  const [form, setForm] = useState({ nombre: '', telefono: '', correo: '', notas: '' })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const [estadoEnvio, setEstadoEnvio] = useState('idle')

  const total = (servicioElegido?.precio || 0) + (addon ? 250 : 0)

  const handleConfirmar = async () => {
    setEstadoEnvio('enviando')
  
    const { error } = await supabase.from('citas').insert([{
      nombre: form.nombre,
      telefono: form.telefono,
      correo: form.correo,
      notas: form.notas,
      servicio: servicioElegido.nombre,
      fecha: `2025-10-${fechaElegida.numero}`, // ajusta el formato/mes según tu calendario real
      hora: horaElegida,
      addon,
      total,
    }])
  
    if (error) {
      console.error(error)
      setEstadoEnvio('error')
    } else {
      setEstadoEnvio('exito')
    }
  }

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
        <h1 className="text-white text-3xl font-bold mb-2">Agenda tu Cortye</h1>
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

              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                {servicios.map((s) => {
                  const seleccionado = servicioElegido?.nombre === s.nombre
                  return (
                    <button
                      key={s.nombre}
                      onClick={() => setServicioElegido(s)}
                      className={`text-left bg-neutral-900 border rounded-xl p-5 relative ${
                        seleccionado ? 'border-sky-500' : 'border-neutral-800'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-neutral-500 text-[10px] tracking-wide">{s.etiqueta}</span>
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
                        <span className="text-neutral-500">{s.duracion}</span>
                        <span className="text-white font-semibold">${s.precio} <span className="text-neutral-500 text-xs">MXN</span></span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Botón siguiente */}
              <button
                disabled={!servicioElegido}
                onClick={() => setPasoActual(2)}
                className="mt-8 bg-white text-neutral-900 font-semibold px-6 py-3 rounded-md disabled:opacity-30"
              >
                Siguiente →
              </button>
            </div>
          )}

          {pasoActual === 2 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sky-400 text-xs tracking-wide">03. SELECCIÓN DE FECHA & TURNO</p>
                <p className="text-neutral-500 text-xs">Octubre 2025</p>
              </div>

              {/* Días */}
              <div className="grid grid-cols-7 gap-2 mb-8">
                {dias.map((d) => {
                  const seleccionado = fechaElegida?.numero === d.numero
                  return (
                    <button
                      key={d.numero}
                      disabled={!d.disponible}
                      onClick={() => setFechaElegida(d)}
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
                {bloques.map((bloque) => (
                  <div key={bloque.titulo}>
                    <p className="text-neutral-500 text-xs tracking-wide mb-3">{bloque.titulo}</p>
                    <div className="flex flex-wrap gap-3">
                      {bloque.horas.map((h) => {
                        const seleccionado = horaElegida === h
                        return (
                          <button
                            key={h}
                            onClick={() => setHoraElegida(h)}
                            className={`px-4 py-2 rounded-md text-sm ${
                              seleccionado ? 'bg-sky-500 text-white' : 'bg-neutral-900 text-neutral-300'
                            }`}
                          >
                            {h}
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
                  <p className="text-white text-sm font-medium">Nicolas Romero</p>
                </div>

                <div className="flex flex-col gap-3 text-sm border-t border-neutral-800 pt-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
                      {servicioElegido?.nombre || '—'}
                    </span>
                    <span className="text-white">
                      {servicioElegido ? `$${servicioElegido.precio} MXN` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Fecha & Horario</span>
                    <span className="text-sky-400">
                      {fechaElegida ? `${fechaElegida.label} ${fechaElegida.numero}` : '—'} {horaElegida ? `· ${horaElegida}` : ''}
                    </span>
                  </div>
                </div>

                <div className="border-t border-neutral-800 mt-4 pt-4 flex justify-between items-center">
                  <span className="text-neutral-400 text-sm">TOTAL AL CONCLUIR</span>
                  <span className="text-white text-xl font-bold">
                    ${(servicioElegido?.precio || 0) + (addon ? 250 : 0)} <span className="text-sm font-normal">MXN</span>
                  </span>
                </div>
                <p className="text-neutral-500 text-xs mt-2">
                  No se cobra nada en línea. Pago directo en sucursal.
                </p>

                <button
                    onClick={handleConfirmar}
                    disabled={!servicioElegido || !fechaElegida || !horaElegida || !form.nombre || !form.telefono || !form.correo || estadoEnvio === 'enviando'}
                    className="w-full bg-white text-neutral-900 font-semibold py-3 rounded-md mt-5 disabled:opacity-30"
                  >
                    {estadoEnvio === 'enviando' ? 'Guardando...' : 'CONFIRMAR RESERVACIÓN →'}
                  </button>
                  {estadoEnvio === 'error' && (
                    <p className="text-red-400 text-xs mt-2">Algo salió mal, intenta de nuevo.</p>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}