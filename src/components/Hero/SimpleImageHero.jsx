// src/components/Hero/SimpleImageHero.jsx

import video from '../../assets/images/video.mp4';

const SimpleImageHero = () => {
  return (
    <div className="w-full flex justify-center bg-gray-100">
      <div
        className="relative w-full md:max-w-6xl flex items-center justify-center overflow-hidden"
        style={{ minHeight: '25vh' }} // Altura para móvil
      >
        {/* Contenedor para desktop con mayor altura */}
        <div className="hidden md:block absolute inset-0" style={{ minHeight: '70vh' }}></div>

        {/* Video de fondo */}
        <video
          className="absolute top-0 left-0 w-full h-full object-cover filter sepia"
          src={video}
          autoPlay
          loop
          muted
          playsInline
          style={{ minHeight: '100%', objectPosition: 'right 15%' }} // Alinear a la derecha para ver el logo
        />

        {/* Espaciador invisible para forzar altura */}
        <div className="w-full h-[25vh] md:h-[70vh] pointer-events-none"></div>
      </div>
    </div>
  );
};

export default SimpleImageHero;