import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import youtubeIcon from '../../assets/youtube.ico';

const Header = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);

    const toggleMenu = () => setMenuOpen(!menuOpen);
    const toggleDropdown = (material) => {
        setActiveDropdown(activeDropdown === material ? null : material);
    };
    // Función para compartir la página
    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Enigma Artesanías y Accesorios',
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('¡Enlace copiado!');
        }
    };

    // Cerrar menú al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            const headerElement = document.getElementById('main-header');
            const mobileMenuElement = document.getElementById('mobile-menu-nav');
            const submenus = document.querySelectorAll('.has-submenu');

            if (
                menuOpen &&
                headerElement &&
                !headerElement.contains(event.target) &&
                mobileMenuElement &&
                !mobileMenuElement.contains(event.target)
            ) {
                setMenuOpen(false);
                setActiveDropdown(null);
            }

            if (activeDropdown) {
                let clickedInsideSubmenu = false;
                submenus.forEach((li) => {
                    if (li.contains(event.target)) {
                        clickedInsideSubmenu = true;
                    }
                });
                if (!clickedInsideSubmenu) {
                    setActiveDropdown(null);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen, activeDropdown]);

    const materials = ['Plata', 'Alpaca', 'Cobre'];
    const jewelryByMaterial = {
        Plata: [
            { name: 'Anillos', path: '/catalogo/Plata/ANILLO' },
            { name: 'Pulseras', path: '/catalogo/Plata/PULSERA' },
            { name: 'Collares', path: '/catalogo/Plata/COLLAR' },
            { name: 'Aretes', path: '/catalogo/Plata/ARETE' },
        ],
        Alpaca: [
            { name: 'Anillos', path: '/catalogo/Alpaca/ANILLO' },
            { name: 'Pulseras', path: '/catalogo/Alpaca/PULSERA' },
            { name: 'Collares', path: '/catalogo/Alpaca/COLLAR' },
            { name: 'Aretes', path: '/catalogo/Alpaca/ARETE' },
        ],
        Cobre: [
            { name: 'Anillos', path: '/catalogo/Cobre/ANILLO' },
            { name: 'Pulseras', path: '/catalogo/Cobre/PULSERA' },
            { name: 'Collares', path: '/catalogo/Cobre/COLLAR' },
            { name: 'Aretes', path: '/catalogo/Cobre/ARETE' },
        ],
    };

    return (
        <header
            id="main-header"
            className="bg-white text-black z-50 shadow-md w-full md:sticky md:top-0 fixed top-0"
        >
            <div className="container mx-auto px-8 py-4 flex justify-between items-center">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <Link
                        to="/"
                        onClick={() => {
                            setActiveDropdown(null);
                            if (window.innerWidth < 768) setMenuOpen(false);
                        }}
                    >
                        <img
                            src={logo}
                            alt="Logo de tu marca de joyería artesanal"
                            className="h-10 cursor-pointer"
                        />
                    </Link>
                </div>

                {/* Botones móviles: Menú y Compartir */}
                <div className="flex items-center space-x-4 md:hidden">
                    {/* Botón compartir */}
                    <button
                        onClick={handleShare}
                        className="text-xl text-gray-500 hover:text-gray-700"
                        title="Compartir página"
                    >
                        🔗
                    </button>
                    {/* Botón menú móvil */}
                    <button onClick={toggleMenu} className="text-2xl z-50">
                        ☰
                    </button>
                </div>

                {/* Menú principal */}
                <nav
                    id="mobile-menu-nav"
                    className={`${menuOpen ? 'translate-x-0' : '-translate-x-full'
                        } fixed left-0 w-full bg-white z-40 h-[calc(100vh-64px)] overflow-y-auto
            transform transition-transform duration-300 ease-in-out
            md:static md:block md:w-auto md:h-auto md:overflow-visible
            md:translate-x-0 md:bg-transparent`}
                    style={{ top: '64px' }}
                >
                    {menuOpen && (
                        <button
                            onClick={toggleMenu}
                            className="absolute top-4 right-4 text-gray-600 md:hidden text-3xl z-50"
                            aria-label="Cerrar menú"
                        >
                            &times;
                        </button>
                    )}

                    <ul className="flex flex-col md:flex-row md:space-x-6 md:items-center px-4 pb-4 md:pb-0 pt-4 h-full overflow-y-auto md:h-auto md:overflow-visible text-left">
                        <li>
                            <Link
                                to="/sobremi"
                                className="block px-4 py-2 hover:text-gray-500"
                                onClick={() => {
                                    if (window.innerWidth < 768) toggleMenu();
                                    setActiveDropdown(null);
                                }}
                            >
                                Sobre mí
                            </Link>
                        </li>

                        {materials.map((material) => (
                            <li key={material} className="group has-submenu md:relative">
                                <button
                                    className="flex items-center justify-between w-full px-4 py-2 hover:text-gray-500 text-left md:inline md:w-auto"
                                    onClick={() => toggleDropdown(material)}
                                >
                                    {material}
                                    <span className="ml-2 md:hidden">
                                        {activeDropdown === material ? 'v' : '>'}
                                    </span>
                                </button>
                                <ul
                                    className={`${activeDropdown === material
                                            ? 'block md:absolute bg-gray-200 md:min-w-[160px] md:mt-2 shadow-lg z-50'
                                            : 'hidden'
                                        }`}
                                >
                                    {jewelryByMaterial[material].map((jewelry) => (
                                        <li key={`${material}-${jewelry.name}`}>
                                            <Link
                                                to={jewelry.path}
                                                className="block px-4 py-2 hover:bg-gray-200"
                                                onClick={() => {
                                                    setActiveDropdown(null);
                                                    if (window.innerWidth < 768) toggleMenu();
                                                }}
                                            >
                                                {jewelry.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}

                        <li>
                            <Link
                                to="/catalogo/all/PERSONALIZADO"
                                className="block px-4 py-2 hover:text-gray-500"
                                onClick={() => {
                                    if (window.innerWidth < 768) toggleMenu();
                                    setActiveDropdown(null);
                                }}
                            >
                                Personalizados
                            </Link>
                        </li>

                        <li>
                            <Link
                                to="/videoshorts"
                                className="gap-2 block px-4 py-2 hover:text-gray-500 justify-center md:justify-start"
                                onClick={() => {
                                    if (window.innerWidth < 768) toggleMenu();
                                    setActiveDropdown(null);
                                }}
                            >
                                <img
                                    src={youtubeIcon}
                                    alt="YouTube"
                                    className="w-5 h-5 inline-block mr-1"
                                />
                                Videos Shorts
                            </Link>
                        </li>

                        <li>
                            <Link
                                to="/contacto"
                                className="block px-4 py-2 hover:text-gray-500"
                                onClick={() => {
                                    if (window.innerWidth < 768) toggleMenu();
                                    setActiveDropdown(null);
                                }}
                            >
                                Contacto
                            </Link>
                        </li>
                    </ul>
                </nav>
            </div>
        </header>
    );
};

export default Header;