// Aviso enlazado desde el checkbox del paso 3 de BookingPage.
import { Link } from 'react-router-dom'
import { useConfiguracion } from '../context/useConfiguracion'

export default function PrivacidadPage() {
  const { configuracion } = useConfiguracion()
  const negocio = configuracion?.nombre || 'la barbería'

  return (
    <div className="bg-neutral-950 min-h-screen px-8 py-16 text-neutral-300">
      <div className="max-w-3xl mx-auto">
        <p className="text-sky-400 text-xs tracking-wide mb-2">AVISO DE PRIVACIDAD</p>
        <h1 className="text-white text-3xl font-semibold mb-6">Términos y Privacidad</h1>

        <div className="grid gap-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold mb-2">Datos que recabamos</h2>
            <p>
              Al agendar una cita en {negocio} guardamos tu nombre, teléfono, correo y las
              notas que escribas, junto con el servicio, la fecha y la hora elegidos.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Para qué los usamos</h2>
            <p>
              Solo para gestionar tu cita: confirmarla, reprogramarla si hace falta y enviarte
              recordatorios por correo o WhatsApp antes del horario reservado.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Tus derechos</h2>
            <p>
              Puedes cancelar o reagendar tu cita desde el portal de cliente. Para solicitar la
              corrección o eliminación de tus datos, contacta directamente a {negocio}.
            </p>
          </section>
        </div>

        <Link to="/" className="inline-block mt-10 text-sky-400 text-sm underline">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  )
}
