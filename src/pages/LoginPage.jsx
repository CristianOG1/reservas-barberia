import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { rutaInicioPorRol } from '../utils/rutaInicioPorRol'

export default function LoginPage() {
  const { login, rol, cargandoRol } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Si venimos de /agendar sin sesión, `volverA` dice a dónde regresar tras entrar.
  const volverA = location.state?.volverA

  const [esRegistro, setEsRegistro] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(false)
  // Marca "ya entraste, espera al rol para decidir a dónde vas".
  const [entrado, setEntrado] = useState(false)

  /* El rol se lee de `perfiles` justo después de iniciar sesión, así que llega un
     instante después que la sesión. Se redirige cuando ya se sabe.
     No basta con esperar a `cargandoRol`: AuthContext solo lo baja a `false` y
     nunca lo vuelve a subir, así que en un login hecho dentro de la app ya está
     en `false` desde antes de entrar (la pasada sin sesión lo dejó así) mientras
     `rol` sigue siendo el de "nadie" (`null`). Decidir con ese `null` mandaba a
     `/admin` a todo el mundo, superadmin incluido. Por eso la condición real es
     "ya hay rol": `rol` es `null` solo sin sesión, y con sesión el contexto
     siempre termina poniendo uno. */
  const rolListo = !cargandoRol && !!rol

  useEffect(() => {
    if (!entrado || !rolListo) return
    navigate(volverA || rutaInicioPorRol(rol), { replace: true })
  }, [entrado, rolListo, rol, volverA, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError(null)
    setMensaje(null)

    if (esRegistro) {
      // Registrar nuevo usuario en Supabase.
      // Solo `full_name`: el rol NO se envía. Lo decide el trigger de la base de
      // datos, que siempre crea el perfil como 'cliente'. Mandarlo aquí
      // permitiría auto-asignarse 'admin'.
      const { data: registro, error: registerError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nombre
          }
        }
      })

      /* El correo ya lo tiene otra cuenta. Supabase lo reporta de dos formas,
         según tenga o no activada la confirmación por correo:
         - sin confirmación: devuelve un error de "ya registrado";
         - con confirmación: devuelve un éxito falso con la lista de
           identidades vacía, para no revelar qué correos existen.
         En los dos casos se manda a iniciar sesión: la cuenta es la misma y la
         membresía de esta barbería se crea sola al entrar. El aviso NO menciona
         ninguna otra barbería. */
      const identidadesVacias =
        Array.isArray(registro?.user?.identities) && registro.user.identities.length === 0
      const yaRegistrado =
        registerError?.code === 'user_already_exists' ||
        /already\s+registered|already\s+exists|ya\s+est[aá]\s+registrad/i.test(
          registerError?.message || ''
        ) ||
        (!registerError && !registro?.session && identidadesVacias)

      if (yaRegistrado) {
        setMensaje('Ya tienes una cuenta. Inicia sesión con tu contraseña y te agregamos a esta barbería.')
        setEsRegistro(false)
      } else if (registerError) {
        setError(registerError.message)
      } else {
        setMensaje('¡Cuenta creada con éxito! Ya puedes iniciar sesión.')
        setEsRegistro(false)
      }
      setCargando(false)
    } else {
      // Iniciar sesión
      const { error: loginError } = await login(email, password)

      if (loginError) {
        setError('Correo o contraseña incorrectos.')
        setCargando(false)
      } else {
        // No se navega aquí: la redirección espera al rol (efecto de arriba).
        setCargando(false)
        setEntrado(true)
      }
    }
  }

  return (
    <div className="bg-neutral-950 min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-white text-xl font-semibold mb-2 text-center">
          {esRegistro ? 'Crear Cuenta' : 'Iniciar Sesión'}
        </h1>

        {volverA && (
          <p className="text-amber-400 text-xs text-center">
            Inicia sesión o crea tu cuenta para confirmar tu cita. Tu selección está guardada.
          </p>
        )}

        {esRegistro && (
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            placeholder="Nombre completo"
            className="bg-neutral-800 text-white text-sm px-4 py-3 rounded-md outline-none border border-neutral-700 focus:border-white"
          />
        )}

        <input
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required
          placeholder="Correo electrónico"
          className="bg-neutral-800 text-white text-sm px-4 py-3 rounded-md outline-none border border-neutral-700 focus:border-white"
        />
        <input
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required
          placeholder="Contraseña"
          className="bg-neutral-800 text-white text-sm px-4 py-3 rounded-md outline-none border border-neutral-700 focus:border-white"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {mensaje && <p className="text-green-400 text-sm">{mensaje}</p>}

        <button 
          type="submit" 
          disabled={cargando}
          className="bg-white text-neutral-900 font-semibold py-3 rounded-md disabled:opacity-50 hover:bg-neutral-200 transition-colors mt-2"
        >
          {cargando ? 'Procesando...' : esRegistro ? 'Registrarme' : 'Entrar'}
        </button>

        <button
          type="button"
          onClick={() => {
            setEsRegistro(!esRegistro)
            setError(null)
            setMensaje(null)
          }}
          className="text-neutral-400 hover:text-white text-xs text-center underline mt-2"
        >
          {esRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
        </button>
      </form>
    </div>
  )
}