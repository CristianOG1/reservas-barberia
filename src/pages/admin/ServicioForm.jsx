import { useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function ServicioForm({ servicio, onClose, onGuardado }) {
  const esEdicion = !!servicio

  const [form, setForm] = useState({
    nombre: servicio?.nombre || '',
    categoria: servicio?.categoria || '',
    descripcion: servicio?.descripcion || '',
    costo: servicio?.costo || '',
    duracion: servicio?.duracion || '',
  })
  const [archivoImagen, setArchivoImagen] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(servicio?.imagen || null)
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
    if (!archivoImagen) return servicio?.imagen || null // no cambió, deja la que ya tenía

    const nombreArchivo = `servicios/${Date.now()}-${archivoImagen.name}`
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
      const payload = { ...form, costo: Number(form.costo), imagen: urlImagen }

      const { error } = esEdicion
        ? await supabase.from('servicios').update(payload).eq('id', servicio.id)
        : await supabase.from('servicios').insert([payload])

      if (error) throw error
      onGuardado()
    } catch (err) {
      console.error(err)
      setErrorMsg('Algo salió mal, intenta de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-lg border border-ink-700 bg-ink-900 p-5 sm:p-6"
      >
        <h3 className="font-serif text-lg text-bone-100">
          {esEdicion ? 'Editar servicio' : 'Nuevo servicio'}
        </h3>

        {/* Imagen */}
        <div className="flex items-center gap-4">
          <img
            src={previewUrl || 'https://placehold.co/80x80?text=%20'}
            className="h-16 w-16 shrink-0 rounded-md object-cover bg-ink-800"
          />
          <label htmlFor="imagen" className="min-w-0 flex-1">
            <span className="block text-sm text-bone-400">Imagen</span>
            <input
              id="imagen"
              type="file"
              accept="image/*"
              onChange={handleImagen}
              className="mt-1 block w-full cursor-pointer text-xs text-bone-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-ink-800 file:px-3 file:py-1.5 file:text-sm file:text-bone-100 hover:file:bg-ink-700"
            />
          </label>
        </div>

        <div>
          <label htmlFor="nombre" className="block text-sm text-bone-400">Nombre *</label>
          <input
            id="nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
            placeholder="Nombre del servicio"
            className="mt-1 w-full rounded-md border border-ink-700 bg-ink-800 px-4 py-2.5 text-sm text-bone-100 transition-colors placeholder:text-bone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
          />
        </div>

        <div>
          <label htmlFor="categoria" className="block text-sm text-bone-400">Categoría *</label>
          <input
            id="categoria"
            name="categoria"
            value={form.categoria}
            onChange={handleChange}
            required
            placeholder="Categoría (ej. Corte, Barba)"
            className="mt-1 w-full rounded-md border border-ink-700 bg-ink-800 px-4 py-2.5 text-sm text-bone-100 transition-colors placeholder:text-bone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
          />
        </div>

        <div>
          <label htmlFor="descripcion" className="block text-sm text-bone-400">Descripción</label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            rows={3}
            placeholder="Descripción"
            className="mt-1 w-full resize-none rounded-md border border-ink-700 bg-ink-800 px-4 py-2.5 text-sm text-bone-100 transition-colors placeholder:text-bone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="costo" className="block text-sm text-bone-400">Costo (MXN) *</label>
            <input
              id="costo"
              type="number"
              name="costo"
              value={form.costo}
              onChange={handleChange}
              required
              placeholder="Costo (MXN)"
              className="mt-1 w-full rounded-md border border-ink-700 bg-ink-800 px-4 py-2.5 text-sm text-bone-100 transition-colors placeholder:text-bone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
            />
          </div>

          <div>
            <label htmlFor="duracion" className="block text-sm text-bone-400">Duración *</label>
            <input
              id="duracion"
              name="duracion"
              value={form.duracion}
              onChange={handleChange}
              required
              placeholder="Duración (ej. 50 min)"
              className="mt-1 w-full rounded-md border border-ink-700 bg-ink-800 px-4 py-2.5 text-sm text-bone-100 transition-colors placeholder:text-bone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
            />
          </div>
        </div>

        {errorMsg && <p className="text-sm text-cancelada">{errorMsg}</p>}

        <div className="mt-2 flex gap-3">
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 rounded-md bg-brass-400 px-5 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-brass-300 active:bg-brass-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-ink-700 px-5 py-2.5 text-sm text-bone-400 transition-colors hover:bg-ink-800 hover:text-bone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
