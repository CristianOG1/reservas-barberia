import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [esRegistro, setEsRegistro] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError(null)
    setMensaje(null)

    if (esRegistro) {
      // Registrar nuevo usuario en Supabase
      const { error: registerError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nombre,
            role: 'cliente' // Por defecto se registra como cliente
          }
        }
      })

      if (registerError) {
        setError(registerError.message)
      } else {
        setMensaje('¡Cuenta creada con éxito! Ya puedes iniciar sesión.')
        setEsRegistro(false)
      }
      setCargando(false)
    } else {
      // Iniciar sesión
      const { data, error: loginError } = await login(email, password)

      if (loginError) {
        setError('Correo o contraseña incorrectos.')
        setCargando(false)
      } else {
        const user = data?.user || data?.session?.user
        const role = user?.user_metadata?.role || user?.role

        if (role === 'admin') {
          navigate('/admin')
        } else {
          navigate('/')
        }
      }
    }
  }

  return (
    <div className="bg-neutral-950 min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-white text-xl font-semibold mb-2 text-center">
          {esRegistro ? 'Crear Cuenta' : 'Iniciar Sesión'}
        </h1>

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