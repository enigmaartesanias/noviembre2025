import andruDonalds from '../assets/images/andru.jpg';

const CelebrityCollaboration = () => {
    return (
        <section className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white py-16 md:py-24 overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-64 h-64 bg-yellow-500 rounded-full filter blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl"></div>
            </div>

            <div className="container mx-auto px-4 md:px-8 lg:px-16 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                    {/* Imagen */}
                    <div className="flex justify-center lg:justify-end">
                        <div className="relative">
                            {/* Badge "Artista de Confianza" */}
                            <div className="absolute -top-4 -left-4 bg-yellow-500 text-black px-4 py-2 rounded-full text-sm font-bold shadow-lg z-10">
                                ⭐ Artista de Confianza
                            </div>

                            <img
                                src={andruDonalds}
                                alt="Andru Donalds luciendo joyas de Enigma Artesanías"
                                className="w-full max-w-sm h-auto rounded-2xl shadow-2xl object-cover border-4 border-yellow-500/30"
                            />

                            {/* Badge "Desde 2021" */}
                            <div className="absolute -bottom-4 -right-4 bg-white text-gray-900 px-6 py-3 rounded-full text-sm font-bold shadow-lg">
                                Desde 2021
                            </div>
                        </div>
                    </div>

                    {/* Contenido */}
                    <div className="text-center lg:text-left">
                        <div className="inline-block bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                            COLABORACIÓN INTERNACIONAL
                        </div>

                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                            Creando Arte para
                            <span className="block text-yellow-400 mt-2">Andru Donalds</span>
                        </h2>

                        <p className="text-lg md:text-xl text-gray-300 mb-6 leading-relaxed">
                            Desde 2021, tengo el honor de crear piezas únicas para <strong className="text-white">Andru Donalds</strong>, voz principal del legendario proyecto musical <strong className="text-yellow-400">ENIGMA</strong>.
                        </p>

                        <p className="text-base md:text-lg text-gray-400 mb-8 leading-relaxed">
                            Una conexión que inspiró el nombre de mi taller y que representa mi compromiso con la excelencia artesanal. Cada pieza es diseñada exclusivamente para reflejar su estilo único: anillos con piedras naturales, cuarzos y dijes que combinan fuerza y elegancia.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <a
                                href="https://www.instagram.com/andrudonalds/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
                            >
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                                Ver en Instagram
                            </a>

                            <a
                                href="/el-taller"
                                className="inline-flex items-center justify-center bg-white/10 text-white border-2 border-white/30 px-8 py-4 rounded-lg font-semibold hover:bg-white/20 transition-all"
                            >
                                Conoce Mi Proceso
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CelebrityCollaboration;
