import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-black text-white py-8 w-full">
      <div className="container mx-auto px-8">

        {/* Contenido principal - más compacto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-gray-800">

          {/* Columna 1: Información */}
          <div className="text-center md:text-left">
            <h3 className="text-base font-semibold mb-2">Enigma Artesanías</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Jr. Madre Selva 544 Tda. 02<br />
              Urb. Santa Isabel - Carabayllo<br />
              Lima - Perú
            </p>
          </div>

          {/* Columna 2: Contacto */}
          <div className="text-center md:text-left">
            <h3 className="text-base font-semibold mb-2">Contacto</h3>
            <p className="text-sm text-gray-400">
              <a href="mailto:artesaniasenigma@gmail.com" className="hover:text-white transition-colors">
                artesaniasenigma@gmail.com
              </a>
            </p>
            <p className="text-sm text-gray-400">
              <a href="https://wa.me/51960282376" className="hover:text-white transition-colors">
                WhatsApp: +51 960 282 376
              </a>
            </p>
          </div>

          {/* Columna 3: Enlaces */}
          <div className="text-center md:text-left">
            <h3 className="text-base font-semibold mb-2">Información</h3>
            <div className="flex flex-col space-y-1 text-sm text-gray-400">
              <Link to="/politicasenvios" className="hover:text-white transition-colors">
                Políticas de envío
              </Link>
              <Link to="/shippingpolicies" className="hover:text-white transition-colors">
                Shipping Policies
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright - más compacto */}
        <div className="pt-4 text-center text-xs text-gray-500">
          <p>© 2025 Enigma Artesanías y Accesorios. Todos los derechos reservados.</p>
          <p className="mt-1">Diseñado por Aldo Magallanes</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;