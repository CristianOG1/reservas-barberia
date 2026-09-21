import { useNavigate } from 'react-router-dom'
const servicios = [
    {
      numero: '01',
      categoria: 'CORTES',
      badge: 'Signature',
      titulo: 'Corte',
      descripcion: 'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Hic culpa fugiat assumenda.',
      duracion: '00 min',
      tarifa: '$650 MXN',
      destacado: false,
    },
    {
      numero: '02',
      categoria: 'BARBAS',
      badge: 'Tradición',
      titulo: 'Barba',
      descripcion: 'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Hic culpa fugiat assumenda.',
      duracion: '00 min',
      tarifa: '$550 MXN',
      destacado: false,
    },
    {
      numero: '03',
      categoria: 'COMPLETO',
      badge: 'Más solicitado',
      titulo: 'Experiencia',
      descripcion: 'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Hic culpa fugiat assumenda.',
      duracion: '00 min',
      tarifa: '$1,100 MXN',
      destacado: true,
    },
    {
      numero: '04',
      categoria: 'Cortes',
      badge: 'Bienestar',
      titulo: 'Definicion',
      descripcion: 'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Hic culpa fugiat assumenda.',
      duracion: '00 min',
      tarifa: '$480 MXN',
      destacado: false,
    },
  ]
  
  export default function Servicios() {
    const navigate = useNavigate()
    return (
      <section className="px-8 py-16">
        {/* Encabezado */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-neutral-400 text-xs tracking-wide">SERVICIOS DISTINTIVOS</span>
            </div>
            <h2 className="text-3xl font-bold text-white">
              Experiencias en cortes de Cabello y Barba
            </h2>
          </div>
          <p className="text-neutral-400 text-sm self-end">
            Lorem ipsum dolor sit, amet consectetur adipisicing elit. Hic culpa fugiat assumenda. Quis dicta autem doloremque adipisci distinctio natus minima aliquid debitis! Ipsa illo ab, dolores in deleniti ex veritatis?
          </p>
        </div>
  
        {/* Grid de tarjetas */}
        <div className="grid md:grid-cols-4 gap-4">
          {servicios.map((s) => (
            <div
              key={s.numero}
              onClick={() => navigate(`/agendar?servicio=${encodeURIComponent(s.titulo)}`)}
              className={`rounded-xl p-5 border-3 ${
                s.destacado
                  ? 'bg-neutral-900 border-yellow-950'
                  : 'bg-neutral-900 border-neutral-800'
              }`}
            >
              {/* Fila superior: número / categoría + badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-neutral-500 text-xs">
                  {s.numero} / {s.categoria}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    s.destacado
                      ? 'bg-yellow-700 text-white'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {s.badge}
                </span>
              </div>
  
              <h3 className="text-white font-semibold mb-2">{s.titulo}</h3>
              <p className="text-neutral-400 text-sm mb-6">{s.descripcion}</p>
  
              {/* Fila inferior: duración / tarifa */}
              <div className="flex justify-between items-end border-t border-neutral-800 pt-4">
                <div>
                  <p className="text-neutral-500 text-[10px]">DURACIÓN</p>
                  <p className="text-white text-sm">{s.duracion}</p>
                </div>
                <div className="text-right">
                  <p className="text-neutral-500 text-[10px]">TARIFA</p>
                  <p className={`text-sm font-semibold ${s.destacado ? 'text-yellow-600' : 'text-white'}`}>
                    {s.tarifa}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
  
        {/* Link inferior */}
        <div className="text-right mt-8">
          <a href="#" className="text-white text-sm font-semibold">
            VER TODOS LOS SERVICIOS →
          </a>
        </div>
      </section>
    )
  }