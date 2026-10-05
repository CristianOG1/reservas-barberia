// src/pages/admin/ServicioForm.jsx
// Alta / edición / detalle de un servicio. La lógica de escritura (storage +
// insert/update) es la que ya existía: solo cambió la presentación al tema claro
// del panel. `soloLectura` abre el mismo formulario en modo detalle.
import { useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function ServicioForm({ servicio, categorias = [], soloLectura = false, onClose, onGuardado }) {
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

  const soloCampo = 'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-100 disabled:cursor-default disabled:bg-slate-100 disabled:text-slate'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        {/* ===== Header del modal ===== */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber">Carta del salón</p>
          <h3 className="font-serif text-lg text-navy">
            {soloLectura ? 'Detalle del Servicio' : esEdicion ? 'Editar Servicio' : 'Nuevo Servicio'}
          </h3>
          <p className="mt-1 text-xs text-slate">
            {soloLectura
              ? 'Consulta la ficha completa del servicio.'
              : 'Nombre, categoría y descripción son visibles en la carta del salón.'}
          </p>
        </div>

        {/* ===== Imagen ===== */}
        <div className="flex items-center gap-4">
          <img
            src={previewUrl || 'https://placehold.co/80x80?text=%20'}
            alt={form.nombre ? `Imagen de ${form.nombre}` : 'Vista previa del servicio'}
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
          />
          {soloLectura ? (
            <p className="text-xs text-slate">
              {servicio?.imagen ? 'Imagen cargada' : 'Este servicio no tiene imagen.'}
            </p>
          ) : (
            <label htmlFor="imagen" className="min-w-0 flex-1">
              <span className="block text-sm text-slate">Imagen del servicio</span>
              <input
                id="imagen"
                type="file"
                accept="image/*"
                onChange={handleImagen}
                className="mt-1 block w-full cursor-pointer text-xs text-slate file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-navy hover:file:bg-slate-200"
              />
            </label>
          )}
        </div>

        {/* ===== Nombre ===== */}
        <div>
          <label htmlFor="nombre" className="block text-sm text-slate">Nombre *</label>
          <input
            id="nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            disabled={soloLectura}
            required
            placeholder="Nombre del servicio"
            className={soloCampo}
          />
        </div>

        {/* ===== Categoría, con sugerencias del catálogo ===== */}
        <div>
          <label htmlFor="categoria" className="block text-sm text-slate">Categoría *</label>
          <input
            id="categoria"
            name="categoria"
            value={form.categoria}
            onChange={handleChange}
            disabled={soloLectura}
            required
            placeholder="Escribe o elige una categoría"
            list="categorias-servicios"
            className={soloCampo}
          />
          <datalist id="categorias-servicios">
            {categorias.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>

        {/* ===== Descripción ===== */}
        <div>
          <label htmlFor="descripcion" className="block text-sm text-slate">Descripción</label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            disabled={soloLectura}
            rows={3}
            placeholder="Qué incluye el servicio"
            className={`${soloCampo} resize-none`}
          />
        </div>

        {/* ===== Costo y Duración ===== */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="costo" className="block text-sm text-slate">Tarifa (MXN) *</label>
            <input
              id="costo"
              type="number"
              name="costo"
              min="0"
              step="1"
              value={form.costo}
              onChange={handleChange}
              disabled={soloLectura}
              required
              placeholder="0"
              className={`${soloCampo} tabular-nums`}
            />
          </div>

          <div>
            <label htmlFor="duracion" className="block text-sm text-slate">Duración (min) *</label>
            <input
              id="duracion"
              type="number"
              name="duracion"
              min="5"
              step="5"
              value={form.duracion}
              onChange={handleChange}
              disabled={soloLectura}
              required
              placeholder="30"
              className={`${soloCampo} tabular-nums`}
            />
          </div>
        </div>

        {errorMsg && <p role="alert" className="text-sm text-red-600">{errorMsg}</p>}

        {/* ===== Acciones ===== */}
        {soloLectura ? (
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Cerrar
          </button>
        ) : (
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
        )}
      </form>
    </div>
  )
}
