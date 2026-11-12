// src/pages/admin/ProductoForm.jsx
// Alta / edición de un producto. La lógica de escritura (storage + insert/update)
// es la que ya existía: solo cambió la presentación al tema claro del panel.
import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useBarberia } from '../../context/useBarberia'
import { validarEnteroNoNegativo } from '../../utils/validaciones'

export default function ProductoForm({ producto, categorias = [], soloLectura = false, onClose, onGuardado }) {
  const esEdicion = !!producto
  // La imagen nueva va a la carpeta de esta barbería y el alta lleva su id.
  const { barberia } = useBarberia()
  const barberiaId = barberia?.id ?? null

  const [form, setForm] = useState({
    nombre: producto?.nombre || '',
    categoria: producto?.categoria || '',
    descripcion: producto?.descripcion || '',
    precio: producto?.precio || '',
    // `productos.stock` es un entero nullable (default 0). El campo es editable
    // desde el panel: F-10 dice que el stock se edita aquí.
    stock: producto?.stock ?? '',
  })
  const [archivoImagen, setArchivoImagen] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(producto?.imagen || null)
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  // Aviso por campo (hoy solo el stock): el error general es el generico de
  // `handleSubmit` y no dice que campo falla.
  const [erroresCampos, setErroresCampos] = useState({})

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleImagen = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setArchivoImagen(file)
    setPreviewUrl(URL.createObjectURL(file)) // vista previa local, aún no se sube
  }

  const subirImagenSiHay = async () => {
    if (!archivoImagen) return producto?.imagen || null // no cambió, deja la que ya tenía

    const nombreArchivo = `${barberiaId}/productos/${Date.now()}-${archivoImagen.name}`
    const { error } = await supabase.storage.from('imagenes').upload(nombreArchivo, archivoImagen)
    if (error) throw error

    const { data } = supabase.storage.from('imagenes').getPublicUrl(nombreArchivo)
    return data.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setErrorMsg(null)

    // El stock tiene que ser un entero >= 0. El campo NO lleva `min`/`step`/
    // `required` a propósito: el navegador bloquearía el envío con su propio
    // mensaje (en inglés) y el aviso de la aplicación no se vería nunca.
    const problemaStock = validarEnteroNoNegativo(form.stock, {
      vacio: 'Indica cuántas unidades hay en stock.',
      formato: 'El stock debe ser un número entero mayor o igual que 0.',
    })
    setErroresCampos(problemaStock ? { stock: problemaStock } : {})
    if (problemaStock) {
      setGuardando(false)
      return
    }

    try {
      const urlImagen = await subirImagenSiHay()
      const payload = {
        ...form,
        precio: Number(form.precio),
        stock: Number(form.stock),
        imagen: urlImagen,
      }

      const { error } = esEdicion
        ? await supabase.from('productos').update(payload).eq('id', producto.id).eq('barberia_id', barberiaId)
        : await supabase.from('productos').insert([{ ...payload, barberia_id: barberiaId }])

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
          <p className="text-xs font-semibold uppercase tracking-widest text-amber">Inventario del salón</p>
          <h3 className="font-serif text-lg text-navy">
            {soloLectura ? 'Detalle del Producto' : esEdicion ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <p className="mt-1 text-xs text-slate">
            {soloLectura
              ? 'Consulta la ficha completa del producto.'
              : 'El precio es el de venta al público, en pesos mexicanos.'}
          </p>
        </div>

        {/* ===== Imagen ===== */}
        <div className="flex items-center gap-4">
          <img
            src={previewUrl || 'https://placehold.co/80x80?text=%20'}
            alt={form.nombre ? `Imagen de ${form.nombre}` : 'Vista previa del producto'}
            className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
          />
          {soloLectura ? (
            <p className="text-xs text-slate">
              {producto?.imagen ? 'Imagen cargada' : 'Este producto no tiene imagen.'}
            </p>
          ) : (
            <label htmlFor="imagen" className="min-w-0 flex-1">
              <span className="block text-sm text-slate">Imagen del producto</span>
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
            required
            disabled={soloLectura}
            placeholder="Nombre del producto"
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
            required
            disabled={soloLectura}
            placeholder="Escribe o elige una categoría"
            list="categorias-productos"
            className={soloCampo}
          />
          <datalist id="categorias-productos">
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
            rows={3}
            disabled={soloLectura}
            placeholder="Composición, presentación, tamaño..."
            className={`${soloCampo} resize-none`}
          />
        </div>

        {/* ===== Precio ===== */}
        <div>
          <label htmlFor="precio" className="block text-sm text-slate">Precio de venta (MXN) *</label>
          <input
            id="precio"
            type="number"
            name="precio"
            min="0"
            step="1"
            value={form.precio}
            onChange={handleChange}
            required
            disabled={soloLectura}
            placeholder="0"
            className={`${soloCampo} tabular-nums`}
          />
        </div>

        {/* ===== Stock ===== */}
        <div>
          <label htmlFor="stock" className="block text-sm text-slate">
            Unidades en stock *
          </label>
          <input
            id="stock"
            type="number"
            inputMode="numeric"
            name="stock"
            value={form.stock}
            onChange={handleChange}
            disabled={soloLectura}
            placeholder="0"
            aria-invalid={erroresCampos.stock ? 'true' : undefined}
            aria-describedby={erroresCampos.stock ? 'error-stock' : undefined}
            className={`${soloCampo} tabular-nums`}
          />
          {erroresCampos.stock && (
            <p id="error-stock" role="alert" className="mt-1 text-sm text-red-600">
              {erroresCampos.stock}
            </p>
          )}
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
