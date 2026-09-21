// src/components/BookingForm.jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'

const servicios = [
  'Corte Atelier Signature',
  'Barba & Navaja Japonesa',
  'Experiencia Integral Kromatik',
  'Terapia Capilar & Exfoliación',
]

export default function BookingForm({ onClose }) {
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    servicio: servicios[0],
    fecha: '',
    hora: '',
  })
  const [estado, setEstado] = useState('idle') // idle | enviando | exito | error

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEstado('enviando')

    const { error } = await supabase.from('citas').insert([form])

    if (error) {
      console.error(error)
      setEstado('error')
    } else {
      setEstado('exito')
    }
  }

  if (estado === 'exito') {
    return (
      <div className="bg-neutral-900 rounded-xl p-8 text-center">
        <p className="text-white text-lg font-semibold mb-2">¡Cita agendada!</p>
        <p className="text-neutral-400 text-sm mb-6">Te contactaremos para confirmar.</p>
        <button onClick={onClose} className="bg-white text-neutral-900 px-5 py-2 rounded-md font-semibold">
          Cerrar
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-900 rounded-xl p-8 flex flex-col gap-4">
      <h3 className="text-white text-lg font-semibold">Agendar cita</h3>

      <input
        name="nombre" value={form.nombre} onChange={handleChange} required
        placeholder="Nombre completo"
        className="bg-neutral-800 text-white text-sm px-4 py-3 rounded-md outline-none"
      />
      <input
        name="telefono" value={form.telefono} onChange={handleChange} required
        placeholder="Teléfono"
        className="bg-neutral-800 text-white text-sm px-4 py-3 rounded-md outline-none"
      />
      <select
        name="servicio" value={form.servicio} onChange={handleChange}
        className="bg-neutral-800 text-white text-sm px-4 py-3 rounded-md outline-none"
      >
        {servicios.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <div className="flex gap-4">
        <input
          type="date" name="fecha" value={form.fecha} onChange={handleChange} required
          className="bg-neutral-800 text-white text-sm px-4 py-3 rounded-md outline-none flex-1"
        />
        <input
          type="time" name="hora" value={form.hora} onChange={handleChange} required
          className="bg-neutral-800 text-white text-sm px-4 py-3 rounded-md outline-none flex-1"
        />
      </div>

      {estado === 'error' && (
        <p className="text-red-400 text-sm">Algo salió mal, intenta de nuevo.</p>
      )}

      <div className="flex gap-3 mt-2">
        <button
          type="submit" disabled={estado === 'enviando'}
          className="bg-white text-neutral-900 font-semibold px-5 py-3 rounded-md flex-1 disabled:opacity-50"
        >
          {estado === 'enviando' ? 'Enviando...' : 'Confirmar cita'}
        </button>
        <button type="button" onClick={onClose} className="bg-neutral-800 text-white px-5 py-3 rounded-md">
          Cancelar
        </button>
      </div>
    </form>
  )
}