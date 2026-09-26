// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError(null)

    const { error } = await login(email, password)

    if (error) {
      setError('Correo o contraseña incorrectos.')
      setCargando(false)
    } else {
      navigate('/admin')
    }
  }

  return (
    <div className="bg-neutral-950 min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-white text-xl font-semibold mb-2">Barberia Admin</h1>

        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
          placeholder="Correo"
          className="bg-neutral-800 text-white text-sm px-4 py-3 rounded-md outline-none"
        />
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
          placeholder="Contraseña"
          className="bg-neutral-800 text-white text-sm px-4 py-3 rounded-md outline-none"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" disabled={cargando}
          className="bg-white text-neutral-900 font-semibold py-3 rounded-md disabled:opacity-50">
          {cargando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}