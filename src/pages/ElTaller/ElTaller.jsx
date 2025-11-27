import { Link } from 'react-router-dom';
import tecnica from '../../assets/images/tecnica.jpg';

const ElTaller = () => {
    return (
        <div className="bg-white">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-gray-900 to-gray-800 text-white py-20 md:py-32">
                <div className="container mx-auto px-4 md:px-8 lg:px-16">
                    <div className="max-w-4xl">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                            El Taller del Artista
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-300 mb-8">
                            Más de 20 años forjando historias únicas en metal y piedra
                        </p>

                    </div>
                </div>
            </section>

            {/* Imagen de Técnica */}
            <section className="py-12 bg-gray-50">
                <div className="container mx-auto px-4 md:px-8 lg:px-16">
                    <div className="flex justify-center">
                        <img
                            src={tecnica}
                            alt="Orfebre trabajando con técnicas artesanales"
                            className="w-full max-w-md h-auto rounded-lg shadow-xl object-cover"
                        />
                    </div>
                </div>
            </section>

            {/* La Historia Section */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4 md:px-8 lg:px-16">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
                            La Historia
                        </h2>
                        <div className="prose prose-lg max-w-none">
                            <p className="text-lg text-gray-700 leading-relaxed mb-6">
                                Desde hace más de 20 años, mi pasión por la orfebrería ha sido el motor que impulsa cada creación. En Enigma Artesanías, no fabricamos joyas en serie; cada pieza es una obra única, nacida de la inspiración del momento y del diálogo con los materiales nobles.
                            </p>
                            <p className="text-lg text-gray-700 leading-relaxed mb-6">
                                Mi filosofía es simple: crear piezas que cuenten historias. Trabajando solo en mi taller, controlo cada etapa del proceso, desde el diseño inicial hasta el acabado final. Esta dedicación artesanal garantiza que cada cliente reciba una joya verdaderamente especial.
                            </p>
                            <p className="text-lg text-gray-700 leading-relaxed">
                                Como artista orfebre, mi compromiso es con la excelencia y la autenticidad. Cada martillazo, cada soldadura, cada engaste es una expresión de mi amor por este arte ancestral.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* El Proceso Section */}
            <section className="py-16 md:py-24 bg-gray-50">
                <div className="container mx-auto px-4 md:px-8 lg:px-16">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
                            El Proceso Artesanal
                        </h2>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {/* Técnica 1 */}
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">
                                    Alambrismo y Filigrana
                                </h3>
                                <p className="text-gray-700">
                                    Técnica ancestral que requiere paciencia y precisión. Cada hilo de metal es trabajado a mano para crear patrones únicos y delicados.
                                </p>
                            </div>

                            {/* Técnica 2 */}
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">
                                    Martillado y Texturizado
                                </h3>
                                <p className="text-gray-700">
                                    Golpe a golpe, creo texturas únicas que dan carácter y profundidad a cada pieza. El martillado es un arte que domino tras años de práctica.
                                </p>
                            </div>

                            {/* Técnica 3 */}
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">
                                    Soldadura Experta
                                </h3>
                                <p className="text-gray-700">
                                    La soldadura es el corazón de la orfebrería. Cada unión es invisible pero resistente, garantizando la durabilidad de la pieza.
                                </p>
                            </div>

                            {/* Técnica 4 */}
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">
                                    Engaste de Piedras
                                </h3>
                                <p className="text-gray-700">
                                    Trabajo con cuarzos, piedras naturales y resinas, creando engastes que realzan la belleza de cada gema y la integran perfectamente en el diseño.
                                </p>
                            </div>

                            {/* Técnica 5 */}
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">
                                    Acabados Envejecidos
                                </h3>
                                <p className="text-gray-700">
                                    Los acabados oxidados y envejecidos aportan profundidad y misterio a las piezas, creando un contraste visual único.
                                </p>
                            </div>

                            {/* Técnica 6 */}
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">
                                    Diseños Personalizados
                                </h3>
                                <p className="text-gray-700">
                                    Cada cliente tiene una historia. Trabajo en colaboración para crear piezas que reflejen su personalidad y estilo único.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Los Materiales Section */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4 md:px-8 lg:px-16">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
                            Los Materiales
                        </h2>

                        <div className="grid md:grid-cols-2 gap-12">
                            {/* Metales */}
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                                    Metales Nobles
                                </h3>
                                <ul className="space-y-4">
                                    <li className="flex flex-col items-center text-center">
                                        <span className="text-2xl mb-2">✦</span>
                                        <div>
                                            <strong className="text-gray-900">Plata 950:</strong>
                                            <p className="text-gray-700">La plata de ley es mi material principal, conocida por su brillo y maleabilidad.</p>
                                        </div>
                                    </li>
                                    <li className="flex flex-col items-center text-center">
                                        <span className="text-2xl mb-2">✦</span>
                                        <div>
                                            <strong className="text-gray-900">Cobre:</strong>
                                            <p className="text-gray-700">El cobre aporta calidez y un color rojizo único a las creaciones.</p>
                                        </div>
                                    </li>
                                    <li className="flex flex-col items-center text-center">
                                        <span className="text-2xl mb-2">✦</span>
                                        <div>
                                            <strong className="text-gray-900">Alpaca:</strong>
                                            <p className="text-gray-700">Aleación versátil que permite crear piezas accesibles sin sacrificar calidad.</p>
                                        </div>
                                    </li>
                                    <li className="flex flex-col items-center text-center">
                                        <span className="text-2xl mb-2">✦</span>
                                        <div>
                                            <strong className="text-gray-900">Bronce:</strong>
                                            <p className="text-gray-700">Material ancestral que aporta un carácter único y atemporal.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            {/* Piedras y Elementos */}
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                                    Piedras y Elementos Naturales
                                </h3>
                                <ul className="space-y-4">
                                    <li className="flex flex-col items-center text-center">
                                        <span className="text-2xl mb-2">✦</span>
                                        <div>
                                            <strong className="text-gray-900">Cuarzos:</strong>
                                            <p className="text-gray-700">Cristales naturales que aportan energía y belleza a cada pieza.</p>
                                        </div>
                                    </li>
                                    <li className="flex flex-col items-center text-center">
                                        <span className="text-2xl mb-2">✦</span>
                                        <div>
                                            <strong className="text-gray-900">Piedras Naturales:</strong>
                                            <p className="text-gray-700">Amatistas, ópalos, turquesas y más, cada una seleccionada cuidadosamente.</p>
                                        </div>
                                    </li>
                                    <li className="flex flex-col items-center text-center">
                                        <span className="text-2xl mb-2">✦</span>
                                        <div>
                                            <strong className="text-gray-900">Resinas:</strong>
                                            <p className="text-gray-700">Materiales modernos que permiten crear efectos únicos de color y transparencia.</p>
                                        </div>
                                    </li>
                                    <li className="flex flex-col items-center text-center">
                                        <span className="text-2xl mb-2">✦</span>
                                        <div>
                                            <strong className="text-gray-900">Nácar:</strong>
                                            <p className="text-gray-700">Elemento orgánico que aporta iridiscencia y elegancia natural.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-16 md:py-24 bg-gray-900 text-white">
                <div className="container mx-auto px-4 md:px-8 lg:px-16 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        ¿Listo para tu pieza única?
                    </h2>
                    <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                        Cada joya cuenta una historia. Déjame crear la tuya.
                    </p>
                    <Link
                        to="/contacto"
                        className="inline-block bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                        Contactar al Artista
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default ElTaller;
