// src/pages/superadmin/BarberiaForm.jsx
// Alta y edición de una barbería. Mismo contrato y mismas clases que los modales
// del admin (`ServicioForm` es la referencia): label visible, `id` real,
// `soloCampo`, foco con anillo `primary` y errores con `role="alert"`.
//
// - Sin `barberia` → ALTA: nombre, slug, correo del dueño y contraseña temporal.
//   El trabajo real lo hace la Edge Function `crear-barberia`, que es la única
//   que puede crear el usuario de auth y darle el rol: el navegador no tiene
//   `service_role` ni puede escribir en `perfiles` (§10.5, §10.6).
// - Con `barberia` → EDICIÓN: solo el nombre. El slug se muestra bloqueado
//   porque es parte de la dirección del sitio.
import { useState } from 'react'
import { supabase } from '../../supabaseClient'

const REGEX_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SLUG_MIN = 3
const SLUG_MAX = 40
const PASSWORD_MIN = 8
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Palabras que no pueden ser slug: chocan con direcciones del software.
const RESERVADOS = ['www', 'app', 'admin', 'api', 'superadmin', 'mail', 'soporte']

// Sugiere un slug a partir del nombre: minúsculas, sin acentos, con guiones
// simples. Se recalcula mientras el nombre cambia hasta que el usuario escribe
// el slug a mano.
function slugDeNombre(nombre) {
  return String(nombre)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '')
}

// Devuelve el motivo por el que un slug no sirve, o null si es válido. Son las
// mismas reglas que aplica el `check barberias_slug_valido` y la Edge Function.
function motivoSlugInvalido(slug) {
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) {
    return `El slug debe tener entre ${SLUG_MIN} y ${SLUG_MAX} caracteres.`
  }
  if (!REGEX_SLUG.test(slug)) {
    return 'El slug solo admite minúsculas, números y guiones simples (sin empezar ni terminar con guion).'
  }
  if (RESERVADOS.includes(slug)) {
    return `"${slug}" es una palabra reservada. Elige otro slug.`
  }
  return null
}

// supabase-js deja el `Response` original en `error.context` cuando la Edge
// Function responde con un código de error; el motivo en español viene en el
// cuerpo. Sin esto solo se vería "Edge Function returned a non-2xx status code".
async function mensajeDeLaFuncion(error) {
  try {
    const respuesta = error?.context
    if (respuesta && typeof respuesta.json === 'function') {
      const cuerpo = await respuesta.json()
      if (cuerpo?.error) return cuerpo.error
      if (cuerpo?.message) return cuerpo.message
    }
  } catch {
    // Si el cuerpo no es legible se usa el mensaje genérico de quien llama.
  }
  return null
}

export default function BarberiaForm({ barberia, onClose, onGuardado }) {
  const esEdicion = !!barberia

  const [form, setForm] = useState({
    nombre: barberia?.nombre || '',
    slug: barberia?.slug || '',
    correo: '',
    password: '',
  })
  // El slug deja de seguir al nombre en cuanto el usuario lo escribe a mano.
  const [slugManual, setSlugManual] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const soloCampo =
    'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-100'

  const cambiarNombre = (valor) => {
    setForm((f) => ({ ...f, nombre: valor, slug: slugManual ? f.slug : slugDeNombre(valor) }))
  }

  const cambiarSlug = (valor) => {
    setSlugManual(true)
    setForm((f) => ({ ...f, slug: valor.toLowerCase() }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg(null)

    if (esEdicion) {
      const nombre = form.nombre.trim()
      if (!nombre) {
        setErrorMsg('El nombre del negocio es obligatorio.')
        return
      }
      setGuardando(true)
      try {
        // `count` se revisa a propósito: un UPDATE que RLS no deja pasar afecta 0
        // filas sin lanzar error (§10.5).
        const { error, count } = await supabase
          .from('barberias')
          .update({ nombre }, { count: 'exact' })
          .eq('id', barberia.id)
        if (error) throw error
        if (!count) throw new Error('La barbería no se actualizó. Revisa que sigas como superadmin.')
        onGuardado()
      } catch (err) {
        console.error(err)
        setErrorMsg(err.message || 'Algo salió mal, intenta de nuevo.')
        setGuardando(false)
      }
      return
    }

    const nombre = form.nombre.trim()
    const slug = form.slug.trim().toLowerCase()
    const correo = form.correo.trim().toLowerCase()
    const password = form.password

    if (!nombre) {
      setErrorMsg('El nombre del negocio es obligatorio.')
      return
    }
    const motivo = motivoSlugInvalido(slug)
    if (motivo) {
      setErrorMsg(motivo)
      return
    }
    if (!REGEX_CORREO.test(correo)) {
      setErrorMsg('Escribe un correo válido para el dueño.')
      return
    }
    if (password.length < PASSWORD_MIN) {
      setErrorMsg(`La contraseña temporal debe tener al menos ${PASSWORD_MIN} caracteres.`)
      return
    }

    setGuardando(true)
    try {
      const { data, error } = await supabase.functions.invoke('crear-barberia', {
        body: { nombre, slug, correo, password },
      })
      if (error) {
        const delServidor = await mensajeDeLaFuncion(error)
        throw new Error(delServidor || 'No se pudo crear la barbería. Intenta de nuevo.')
      }
      if (data?.error) throw new Error(data.error)
      onGuardado()
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Algo salió mal, intenta de nuevo.')
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
          <p className="text-xs uppercase tracking-widest text-amber">
            {esEdicion ? 'Editar' : 'Nueva'}
          </p>
          <h2 className="font-serif text-lg text-navy">
            {esEdicion ? 'Editar barbería' : 'Nueva barbería'}
          </h2>
          <p className="mt-1 text-xs text-slate">
            {esEdicion
              ? 'Cambia el nombre con el que se muestra el negocio.'
              : 'Se crea el negocio y la cuenta de su dueño, que entra como administrador.'}
          </p>
        </div>

        <div>
          <label htmlFor="barberia-nombre" className="block text-sm text-slate">
            Nombre del negocio *
          </label>
          <input
            id="barberia-nombre"
            type="text"
            required
            value={form.nombre}
            onChange={(e) => cambiarNombre(e.target.value)}
            placeholder="Barbería El Buen Corte"
            className={soloCampo}
          />
        </div>

        <div>
          <label htmlFor="barberia-slug" className="block text-sm text-slate">
            Slug *
          </label>
          <input
            id="barberia-slug"
            type="text"
            required
            value={form.slug}
            onChange={(e) => cambiarSlug(e.target.value)}
            disabled={esEdicion}
            placeholder="el-buen-corte"
            aria-describedby="barberia-slug-ayuda"
            className={`${soloCampo} ${
              esEdicion ? 'disabled:bg-slate-100 disabled:text-slate' : ''
            }`}
          />
          <p id="barberia-slug-ayuda" className="mt-1 text-xs text-slate">
            {esEdicion
              ? 'El slug no se puede cambiar porque es parte de la dirección.'
              : `Será la dirección del sitio: https://<slug>.tusoftware.com. Solo minúsculas, números y guiones (${SLUG_MIN}–${SLUG_MAX} caracteres).`}
          </p>
        </div>

        {!esEdicion && (
          <>
            <div>
              <label htmlFor="barberia-correo" className="block text-sm text-slate">
                Correo del dueño *
              </label>
              <input
                id="barberia-correo"
                type="email"
                required
                value={form.correo}
                onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
                placeholder="dueno@correo.com"
                className={soloCampo}
              />
            </div>

            <div>
              <label htmlFor="barberia-password" className="block text-sm text-slate">
                Contraseña temporal *
              </label>
              <input
                id="barberia-password"
                type="text"
                required
                minLength={PASSWORD_MIN}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={`Mínimo ${PASSWORD_MIN} caracteres`}
                aria-describedby="barberia-password-ayuda"
                className={soloCampo}
              />
              <p id="barberia-password-ayuda" className="mt-1 text-xs text-slate">
                Se muestra en claro a propósito: hay que copiarla y pasársela al dueño, que
                entra con ella a su panel.
              </p>
            </div>
          </>
        )}

        {errorMsg && (
          <p role="alert" className="text-sm text-red-600">
            {errorMsg}
          </p>
        )}

        <div className="mt-1 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm text-navy transition-colors hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a38a0] disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear barbería'}
          </button>
        </div>
      </form>
    </div>
  )
}
