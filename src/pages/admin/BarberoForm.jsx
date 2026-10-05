// src/pages/admin/BarberoForm.jsx
// Alta / edición de un barbero. La lógica de escritura (storage + insert/update)
// es la que ya existía: solo cambió la presentación al tema claro del panel.
import { useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function BarberoForm({ barbero, onClose, onGuardado }) {
  const esEdicion = !!barbero

  const [form, setForm] = useState({
    nombre: barbero?.nombre || '',
    especialidad: barbero?.especialidad || '',
    disponible: barbero?.disponible ?? true,
  })
  const [archivoImagen, setArchivoImagen] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(barbero?.imagen || null)
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleImagen = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setArchivoImagen(file)
    setPreviewUrl(URL.createObjectURL(file)) // vista previa local, aún no se sube
  }

  const subirImagenSiHay = async () => {
    if (!archivoImagen) return barbero?.imagen || null

    const nombreArchivo = `barberos/${Date.now()}-${archivoImagen.name}`
    const { error } = await supabase.storage.from('imagenes').upload(nombreArchivo, archivoImagen)
    if (error) throw error

    const { data } = supabase.storage.from('imagenes').getPublicUrl(nombreArchivo)
    return data.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setErrorMsg(null)

    try {
      const urlImagen = await subirImagenSiHay()
      const payload = { ...form, imagen: urlImagen }

      const { error } = esEdicion
        ? await supabase.from('barberos').update(payload).eq('id', barbero.id)
        : await supabase.from('barberos').insert([payload])

      if (error) throw error
      onGuardado()
    } catch (err) {
      console.error(err)
      setErrorMsg('Algo salió mal, intenta de nuevo.')
      setGuardando(false)
    }
  }

  const soloCampo = 'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-100'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        {/* ===== Header del modal ===== */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber">Equipo del salón</p>
          <h3 className="font-serif text-lg text-navy">
            {esEdicion ? 'Editar Barbero' : 'Nuevo Barbero'}
          </h3>
          <p className="mt-1 text-xs text-slate">
            La foto se usa como avatar en las tarjetas del equipo.
          </p>
        </div>

        {/* ===== Avatar ===== */}
        <div className="flex items-center gap-4">
          <img
            src={previewUrl || 'https://placehold.co/80x80?text=%20'}
            alt={form.nombre ? `Foto de ${form.nombre}` : 'Vista previa del barbero'}
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
          />
          <label htmlFor="imagen" className="min-w-0 flex-1">
            <span className="block text-sm text-slate">Fotografía</span>
            <input
              id="imagen"
              type="file"
              accept="image/*"
              onChange={handleImagen}
              className="mt-1 block w-full cursor-pointer text-xs text-slate file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-navy hover:file:bg-slate-200"
            />
          </label>
        </div>

        {/* ===== Nombre ===== */}
        <div>
          <label htmlFor="nombre" className="block text-sm text-slate">Nombre *</label>
          <input
            id="nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
            placeholder="Nombre completo"
            className={soloCampo}
          />
        </div>

        {/* ===== Especialidad ===== */}
        <div>
          <label htmlFor="especialidad" className="block text-sm text-slate">Especialidad</label>
          <input
            id="especialidad"
            name="especialidad"
            value={form.especialidad}
            onChange={handleChange}
            placeholder="Barba · Clásico · Fade"
            className={soloCampo}
          />
        </div>

        {/* ===== Switch de disponibilidad: mismo control que en BarberosAdmin =====
            La etiqueta es "Disponible para Citas" y no "Disponible desde que se
            crea" porque este mismo control edita barberos ya existentes: con esa
            otra redacción el texto miente al editar. */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
          <button
            type="button"
            role="switch"
            aria-checked={form.disponible}
            onClick={() => setForm({ ...form, disponible: !form.disponible })}
            className="flex w-full items-center gap-2.5 text-left"
          >
            <span
              aria-hidden="true"
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                form.disponible ? 'bg-primary' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  form.disponible ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </span>
            <span className={form.disponible ? 'text-sm text-navy' : 'text-sm text-slate'}>
              Disponible para Citas
            </span>
          </button>
        </div>

        {errorMsg && <p role="alert" className="text-sm text-red-600">{errorMsg}</p>}

        {/* ===== Acciones ===== */}
        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
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
