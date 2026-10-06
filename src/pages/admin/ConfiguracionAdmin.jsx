// src/pages/admin/ConfiguracionAdmin.jsx
// Datos de la barbería: nombre, ubicación, logo y descripción.
// La tabla tiene una sola fila (id = 1), así que todo alta/edición es un upsert
// sobre esa misma fila.
import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useConfiguracion } from '../../context/useConfiguracion'

const MAX_IMAGEN_BYTES = 2 * 1024 * 1024 // 2 MB
const CARPETA = 'configuracion'

export default function ConfiguracionAdmin() {
  const { configuracion, cargando } = useConfiguracion()

  return (
    <div>
      {/* ===== Header ===== */}
      <div className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber">
          Datos de la barberia
        </p>
        <h1 className="font-serif text-3xl text-navy">Informacion Principal de la barberia</h1>
      </div>

      {/* El formulario se monta DESPUÉS de que llegan los datos, así sus
          useState iniciales leen la fila sin necesidad de un efecto de sincronía. */}
      {cargando ? (
        <p className="text-slate-500">Cargando configuración...</p>
      ) : (
        <FormularioConfiguracion configuracion={configuracion} />
      )}
    </div>
  )
}

function FormularioConfiguracion({ configuracion }) {
  const { refrescar } = useConfiguracion()

  const [form, setForm] = useState(() => ({
    nombre: configuracion.nombre || '',
    estado: configuracion.estado || '',
    municipio: configuracion.municipio || '',
    descripcion: configuracion.descripcion || '',
  }))
  const [logoActual, setLogoActual] = useState(configuracion.logo || '')
  const [archivoLogo, setArchivoLogo] = useState(null)
  const [previewLogo, setPreviewLogo] = useState(configuracion.logo || '')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [exitoMsg, setExitoMsg] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleLogo = (e) => {
    const archivo = e.target.files[0]
    if (!archivo) return

    if (!archivo.type.startsWith('image/')) {
      setErrorMsg('El archivo debe ser una imagen (JPG, PNG o WebP).')
      setExitoMsg(false)
      e.target.value = ''
      return
    }
    if (archivo.size > MAX_IMAGEN_BYTES) {
      setErrorMsg('La imagen pesa más de 2 MB. Elige una más liviana.')
      setExitoMsg(false)
      e.target.value = ''
      return
    }

    setErrorMsg(null)
    setExitoMsg(false)
    setArchivoLogo(archivo)
    setPreviewLogo(URL.createObjectURL(archivo)) // vista previa local
  }

  // Mismo patrón que los otros formularios: si no hay archivo nuevo, conserva el
  // logo que ya estaba guardado.
  const subirLogoSiHay = async () => {
    if (!archivoLogo) return logoActual || null

    const nombreArchivo = `${CARPETA}/${Date.now()}-${archivoLogo.name}`
    const { error } = await supabase.storage.from('imagenes').upload(nombreArchivo, archivoLogo)
    if (error) throw error

    const { data } = supabase.storage.from('imagenes').getPublicUrl(nombreArchivo)
    return data.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setErrorMsg(null)
    setExitoMsg(false)

    try {
      const logo = await subirLogoSiHay()

      const { error } = await supabase.from('configuracion').upsert(
        {
          id: 1,
          nombre: form.nombre,
          estado: form.estado || null,
          municipio: form.municipio || null,
          logo,
          descripcion: form.descripcion || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      if (error) throw error

      // El sidebar se actualiza al instante con la fila recién guardada.
      await refrescar()
      setArchivoLogo(null)
      setLogoActual(logo || '')
      setExitoMsg(true)
    } catch (err) {
      console.error(err)
      setErrorMsg('No se pudo guardar la configuración, intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const soloCampo = 'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-100'

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      {/* ===== Logo ===== */}
        <div className="mb-5 flex items-start gap-5">
          {previewLogo ? (
            <img
              src={previewLogo}
              alt="Logo de la barbería"
              className="h-20 w-20 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-serif text-2xl text-slate-400">
              {(form.nombre || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <label htmlFor="logo" className="block text-sm text-slate">Logo</label>
            <input
              id="logo"
              type="file"
              accept="image/*"
              onChange={handleLogo}
              className="mt-1 block w-full cursor-pointer text-xs text-slate file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-navy hover:file:bg-slate-200"
            />
            <p className="mt-1.5 text-xs text-slate">
              Máximo 2 MB. Si no subes nada, se conserva el logo actual.
            </p>
          </div>
        </div>

        {/* ===== Nombre ===== */}
        <div className="mb-5">
          <label htmlFor="nombre" className="block text-sm text-slate">
            Nombre de la barbería <span className="text-red-600">*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
            placeholder="Noble Blade"
            className={soloCampo}
          />
        </div>

        {/* ===== Estado y Municipio ===== */}
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="estado" className="block text-sm text-slate">Estado</label>
            <input
              id="estado"
              name="estado"
              value={form.estado}
              onChange={handleChange}
              placeholder="Estado de México"
              className={soloCampo}
            />
          </div>
          <div>
            <label htmlFor="municipio" className="block text-sm text-slate">Municipio</label>
            <input
              id="municipio"
              name="municipio"
              value={form.municipio}
              onChange={handleChange}
              placeholder="Nicolás Romero"
              className={soloCampo}
            />
          </div>
        </div>

        {/* ===== Descripción ===== */}
        <div className="mb-5">
          <label htmlFor="descripcion" className="block text-sm text-slate">Descripción</label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            rows={4}
            placeholder="Una línea sobre la barbería: su estilo, desde cuándo opera, qué la distingue."
            className={`${soloCampo} resize-none`}
          />
        </div>

        {errorMsg && (
          <p role="alert" className="mb-4 text-sm text-red-600">{errorMsg}</p>
        )}
        {exitoMsg && (
          <p role="status" className="mb-4 text-sm text-green-600">
            Configuración guardada.
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {configuracion.updated_at && (
            <p className="text-xs text-slate">
              Última actualización:{' '}
              {new Date(configuracion.updated_at).toLocaleString('es-MX', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>
    </form>
  )
}
