import tecnica from '../../assets/images/tecnica.jpg';
import { Link } from 'react-router-dom';

const Hero3 = () => {
  return (
    <section className="bg-gray-50 py-8 md:py-16">
      <div className="container mx-auto px-4 md:px-8 lg:px-16">
        {/* Contenedor principal con grid para mayor control y evitar errores */}
        {/* Definimos 3 columnas en md y 4 en lg para distribuir el espacio */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 items-center gap-8 md:gap-16">

          {/* Columna de la imagen */}
          {/* En móvil: ocupa 1 columna y se centra. En md/lg: ocupa 1 de 3/4 columnas y se alinea a la izquierda. */}
          <div className="w-full md:col-span-1 lg:col-span-1 flex justify-center md:justify-start">
            <img
              src={tecnica}
              alt="Orfebre trabajando con técnicas artesanales"
              className="w-full max-w-[180px] h-auto rounded-lg shadow-lg object-cover"
            />
          </div>

          {/* Columna del texto y contenido */}
          {/* En móvil: ocupa 1 columna y se centra. En md/lg: ocupa 2 de 3 o 3 de 4 columnas, y texto a la izquierda. */}
          <div className="w-full md:col-span-2 lg:col-span-3 flex flex-col justify-center text-left md:text-left">
            <h2 className="text-2xl sm:text-2xl lg:text-3xl font-normal text-gray-900 mb-4">
              La Técnica
            </h2>

            {/* Cita */}
            <blockquote className="text-left text-base md:text-lg text-gray-800 pl-0 mb-4 leading-relaxed">
              En Enigma Artesanías y Accesorios, combinamos técnicas ancestrales como el alambrismo y el martillado con acabados envejecidos que otorgan carácter y autenticidad. Cada joya es trabajada a mano con precisión, soldadura experta y el dominio de metales como la plata, el cobre, la alpaca y el bronce.
            </blockquote>

            <Link
              to="/el-taller"
              className="inline-block text-gray-900 hover:text-gray-600 font-medium underline"
            >
              Ver más detalles del taller →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero3;