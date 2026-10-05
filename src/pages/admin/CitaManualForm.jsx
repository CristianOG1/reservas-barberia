// src/pages/admin/CitaManualForm.jsx
// Alta manual de citas desde el panel: mismos campos que usa el flujo público de
// BookingPage, pero en un solo formulario (sin los 3 pasos) y escribiendo con la
// sesión del administrador en lugar de la clave pública.
// También se reutiliza en modo edición para "Reprogramar" (misma forma, update).
import { useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function CitaManualForm({ cita, servicios, barberos, onClose, onGuardado }) {
  const esEdicion = !!cita

  const [form, setForm] = useState({
    nombre: cita?.nombre || '',
    telefono: cita?.telefono || '',
    correo: cita?.correo || '',
    servicio: cita?.servicio || '',
    fecha: cita?.fecha || '',
    hora: cita?.hora ? String(cita.hora).slice(0, 5) : '',
    barbero_id: cita?.barbero_id || '',
    total: cita?.total ?? '',
    notas: cita?.notas || '',
  })
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  // Al elegir un servicio del catálogo se propone su precio. El campo sigue siendo
  // editable: el total real lo cobra el barbero en sucursal.
  const handleServicio = (e) => {
    const nombre = e.target.value
    const encontrado = servicios.find((s) => s.nombre === nombre)
    setForm({
      ...form,
      servicio: nombre,
      total: encontrado ? encontrado.costo : form.total,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setErrorMsg(null)

    try {
      const payload = {
        nombre: form.nombre,
        telefono: form.telefono,
        correo: form.correo || null,
        servicio: form.servicio,
        fecha: form.fecha,
        hora: form.hora,
        barbero_id: form.barbero_id || null,
        total: form.total === '' ? null : Number(form.total),
        notas: form.notas || null,
      }

      // En alta manual la cita nace 'pendiente' de confirmar, igual que las que
      // crea el flujo público. En edición NO se toca `estado`.
      const peticion = esEdicion
        ? supabase.from('citas').update(payload).eq('id', cita.id)
        : supabase.from('citas').insert([{ ...payload, estado: 'pendiente' }])

      const { error } = await peticion
      if (error) throw error
      onGuardado()
    } catch (err) {
      console.error(err)
      setErrorMsg('Algo salió mal, intenta de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber">Agenda Manual</p>
          <h3 className="font-serif text-lg text-navy">
            {esEdicion ? 'Reprogramar cita' : 'Nueva cita manual'}
          </h3>
          <p className="mt-1 text-xs text-slate">
            Mismos campos que el flujo público de reserva, capturados de una sola vez.
          </p>
        </div>

        <div>
          <label htmlFor="nombre" className="block text-sm text-slate">Nombre del cliente *</label>
          <input
            id="nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
            placeholder="Nombre del cliente"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="telefono" className="block text-sm text-slate">Teléfono (WhatsApp) *</label>
            <input
              id="telefono"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              required
              placeholder="10 dígitos"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div>
            <label htmlFor="correo" className="block text-sm text-slate">Correo</label>
            <input
              id="correo"
              name="correo"
              type="email"
              value={form.correo}
              onChange={handleChange}
              placeholder="cliente@correo.com"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="servicio" className="block text-sm text-slate">Servicio contratado *</label>
          <select
            id="servicio"
            name="servicio"
            value={form.servicio}
            onChange={handleServicio}
            required
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary-100"
          >
            <option value="">Selecciona un servicio del catálogo…</option>
            {servicios.map((s) => (
              <option key={s.id} value={s.nombre}>
                {s.nombre} · {s.duracion} min · ${s.costo} MXN
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate">
            El servicio se guarda como texto. Si falta uno, agrégalo primero en Gestión de Servicios.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="fecha" className="block text-sm text-slate">Fecha *</label>
            <input
              id="fecha"
              name="fecha"
              type="date"
              value={form.fecha}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div>
            <label htmlFor="hora" className="block text-sm text-slate">Hora *</label>
            <input
              id="hora"
              name="hora"
              type="time"
              value={form.hora}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="barbero_id" className="block text-sm text-slate">Barbero asignado</label>
            <select
              id="barbero_id"
              name="barbero_id"
              value={form.barbero_id}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Sin asignar</option>
              {barberos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre}{b.especialidad ? ` · ${b.especialidad}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="total" className="block text-sm text-slate">Total a cobrar (MXN)</label>
            <input
              id="total"
              name="total"
              type="number"
              min="0"
              step="1"
              value={form.total}
              onChange={handleChange}
              placeholder="0"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy tabular-nums outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notas" className="block text-sm text-slate">Notas</label>
          <textarea
            id="notas"
            name="notas"
            rows={3}
            value={form.notas}
            onChange={handleChange}
            placeholder="Preferencias, alergias, pedido especial…"
            className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-100"
          />
        </div>

        {errorMsg && <p role="alert" className="text-sm text-red-600">{errorMsg}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear cita'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm text-navy transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
