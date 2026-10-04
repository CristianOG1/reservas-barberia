import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

const sedes = [
  {
    numero: '01',
    nombre: '',
    zona: '',
    badge: '',
    direccion: '',
    horarios: [''],
    lineaTitulo: '',
    telefono: '',
    notaTelefono: '',
    amenities: '',
    mapQuery: '',
  },
  {
    numero: '02',
    nombre: '',
    zona: '',
    badge: '',
    direccion: '',
    horarios: [''],
    lineaTitulo: '',
    telefono: '',
    notaTelefono: '',
    amenities: '',
    mapQuery: '',
  },
]

const garantias = [
  {
    icono: '⏱️',
    titulo: 'Puntualidad & Barra de Cortesía',
    texto:
      'Sugerimos presentarse con 10 minutos de antelación. Este lapso permite disfrutar de una extracción de café Geisha o degustación destilada en nuestra zona de sosiego.',
    etiqueta: 'EXPERIENCIA DE BIENVENIDA',
  },
  {
    icono: '📅',
    titulo: 'Política de Cambios y Cancelación',
    texto:
      'Reconocemos el valor de tu tiempo y el de nuestros maestros. Puedes modificar o reprogramar tu sesión sin penalización notificando con al menos 2 horas de anticipación.',
    etiqueta: 'RESPALDO Y FLEXIBILIDAD',
  },
]

export default function ContactoPage() {
  return (
    <div className="bg-neutral-950 min-h-screen text-white">
      <Navbar />

      <main>
        {/* Hero de la página */}
        <section className="px-8 pt-16 pb-10 max-w-7xl mx-auto">
          <p className="text-sky-400 text-xs tracking-wide mb-4">● ATENCIÓN PERSONALIZADA & SEDES</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contacto & Ubicaciones</h1>
          <p className="text-neutral-400 max-w-xl">
            Espacios concebidos para el sosiego y el cuidado capilar quirúrgico. Si buscas asegurar tu
            horario con un especialista específico, te recomendamos reservar tu turno directamente en línea.
          </p>
        </section>

        {/* Banner de agendar */}
        <section className="px-8 max-w-7xl mx-auto">
          <div className="bg-neutral-900 border border-neutral-800 border-l-4 border-l-sky-500 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-white font-semibold">¿Deseas agendar tu sesión de inmediato?</h2>
              <p className="text-neutral-400 text-sm mt-1">
                Omite esperas y selecciona tu servicio en nuestro sistema de citas con confirmación al instante.
              </p>
            </div>
            <Link
              to="/agendar"
              className="bg-white text-neutral-900 text-sm font-semibold px-6 py-3 rounded-md text-center whitespace-nowrap"
            >
              AGENDAR CITA AHORA →
            </Link>
          </div>
        </section>

        {/* Sedes */}
        <section className="px-8 py-14 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6 text-xs tracking-wide">
            <p>
              <span className="text-amber-200">SEDES METROPOLITANAS</span>
              <span className="text-neutral-500"> / {String(sedes.length).padStart(2, '0')} Recintos</span>
            </p>
            <p className="text-neutral-500">CDMX, MÉXICO</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {sedes.map((s) => (
              <article key={s.numero} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                {/* Mapa con textos encima */}
                <div className="relative h-56 bg-neutral-800">
                  <iframe
                    title={`Mapa ${s.nombre}`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(s.mapQuery)}&output=embed`}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full border-0"
                    style={{ filter: 'grayscale(1) invert(0.92) contrast(0.9)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent pointer-events-none" />

                  <span className="absolute top-4 left-4 bg-neutral-950/80 text-white text-[10px] tracking-wide px-3 py-1 rounded-md">
                    {s.badge}
                  </span>

                  <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end pointer-events-none">
                    <div>
                      <p className="text-amber-200 text-[10px] tracking-wide">SEDE {s.numero}</p>
                      <h3 className="text-white text-2xl font-semibold">{s.nombre}</h3>
                    </div>
                    <p className="text-neutral-400 text-sm">{s.zona}</p>
                  </div>
                </div>

                {/* Datos de la sede */}
                <div className="p-6">
                  <div className="grid sm:grid-cols-2 gap-6 text-sm">
                    <div>
                      <p className="text-neutral-500 text-[10px] tracking-wide mb-2">DIRECCIÓN</p>
                      <p className="text-neutral-200">{s.direccion}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 text-[10px] tracking-wide mb-2">HORARIOS DE ATENCIÓN</p>
                      {s.horarios.map((h) => (
                        <p key={h} className="text-neutral-200">{h}</p>
                      ))}
                    </div>
                    <div>
                      <p className="text-neutral-500 text-[10px] tracking-wide mb-2">{s.lineaTitulo}</p>
                      <p className="text-neutral-200">{s.telefono}</p>
                      <p className="text-amber-200 text-xs mt-1">{s.notaTelefono}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 text-[10px] tracking-wide mb-2">AMENITIES INCLUIDOS</p>
                      <p className="text-neutral-400">{s.amenities}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-5 border-t border-neutral-800">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.mapQuery)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-neutral-400 text-xs tracking-wide hover:text-white"
                    >
                      ABRIR EN GOOGLE MAPS ↗
                    </a>
                    <Link
                      to="/agendar"
                      className="bg-neutral-800 text-white text-xs font-semibold tracking-wide px-5 py-3 rounded-md text-center"
                    >
                      RESERVAR EN {s.nombre.split(' ')[0].toUpperCase()} →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        
       {/* Protocolo de llegada & garantías */}
        <section className="px-8 py-14 max-w-7xl mx-auto border-t border-neutral-900">
        <div className="grid md:grid-cols-2 gap-6 items-end mb-10">
            <div>
            <p className="text-amber-200 text-xs tracking-wide mb-2">
                EXPERIENCIA & NORMATIVA
            </p>
            <h2 className="text-3xl font-bold">
                Protocolo de Llegada & Garantías
            </h2>
            </div>

            <p className="text-neutral-400 text-sm md:text-right">
            Diseñamos cada estancia para preservar un entorno de acústica
            controlada, calma y máxima devoción al detalle.
            </p>
        </div>

        <div
            className={`grid gap-4 ${
            garantias.length === 1
                ? "grid-cols-1"
                : garantias.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
        >
            {garantias.map((g) => (
            <div
                key={g.titulo}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-6"
            >
                <span className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center mb-4">
                {g.icono}
                </span>

                <h3 className="text-white font-semibold mb-2">
                {g.titulo}
                </h3>

                <p className="text-neutral-400 text-sm mb-5">
                {g.texto}
                </p>

                <p className="text-amber-200 text-[10px] tracking-wide">
                {g.etiqueta}
                </p>
            </div>
            ))}
        </div>
        </section>

        {/* Hero final: solo botón de agendar */}
        <section className="px-8 pb-16 max-w-7xl mx-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl px-6 py-16 text-center">
            <span className="inline-flex items-center gap-2 bg-neutral-950 border border-neutral-800 text-neutral-300 text-[10px] tracking-wide px-4 py-2 rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              PRÓXIMOS TURNOS DISPONIBLES PARA HOY
            </span>

            <h2 className="text-4xl md:text-6xl font-bold uppercase leading-tight max-w-3xl mx-auto">
              El tiempo es tu mayor lujo.
            </h2>

            <p className="text-amber-200/80 max-w-xl mx-auto mt-6">
              Reserva tu espacio y desconecta 60 minutos en manos de maestros artesanos. Sin prisas, sin esperas,
              en un entorno de privacidad acústica.
            </p>

            <Link
              to="/agendar"
              className="inline-block bg-white text-neutral-900 text-sm font-semibold px-8 py-4 rounded-md mt-8"
            >
              AGENDAR CITA AHORA →
            </Link>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-12 text-neutral-400 text-xs">
              <span>🅿️ Valet Parking Gratuito</span>
              <span>📍 Ubicacion</span>
              <span>💳 Apple Pay & Amex Accepted</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}