import React from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const ImageModal = ({ isOpen, onClose, imageUrl }) => {
  if (!isOpen || !imageUrl) return null;

  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95 backdrop-blur-sm p-0 sm:p-4"
      onClick={handleBackgroundClick}
    >
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* Botón de cierre minimalista (X) */}
        <button
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all duration-200"
          onClick={onClose}
          title="Cerrar"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Componente principal de zoom y paneo */}
        <TransformWrapper
          initialScale={1}
          initialPositionX={0}
          initialPositionY={0}
          doubleClick={{ disabled: false, step: 0.5 }} // Doble clic hace zoom
          wheel={{ step: 0.1, disabled: false }}
          pinch={{ step: 0.1, disabled: false }} // Pellizco habilitado
          centerOnInit={true}
          alignmentAnimation={{ sizeX: 0, sizeY: 0 }}
        >
          {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
            <TransformComponent
              wrapperClass="!w-full !h-full flex items-center justify-center"
              contentClass="!w-full !h-full flex items-center justify-center"
            >
              <img
                src={imageUrl}
                alt="Imagen ampliada del producto"
                className="max-w-full max-h-screen object-contain"
                style={{ width: 'auto', height: 'auto' }}
              />
            </TransformComponent>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
};

export default ImageModal;