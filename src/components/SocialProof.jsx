import { FaInstagram, FaTiktok, FaFacebook, FaYoutube } from 'react-icons/fa';

const SocialProof = () => {
    const socialStats = [
        {
            platform: 'Instagram',
            followers: '16.7k',
            icon: FaInstagram,
            url: 'https://www.instagram.com/enigma_artesanias/',
            color: 'from-purple-600 to-pink-600',
            iconColor: 'text-pink-500'
        },
        {
            platform: 'TikTok',
            followers: '12.2k',
            icon: FaTiktok,
            url: 'https://www.tiktok.com/@artesaniasenigma',
            color: 'from-gray-900 to-gray-700',
            iconColor: 'text-gray-900'
        },
        {
            platform: 'Facebook',
            followers: '11k',
            icon: FaFacebook,
            url: 'https://www.facebook.com/enigmaartesaniasyaccesorios/',
            color: 'from-blue-600 to-blue-800',
            iconColor: 'text-blue-600'
        },
        {
            platform: 'YouTube',
            followers: '7.3k',
            icon: FaYoutube,
            url: 'https://www.youtube.com/@artesaniasenigma',
            color: 'from-red-600 to-red-700',
            iconColor: 'text-red-600'
        }
    ];

    return (
        <section className="py-12 md:py-16 bg-white">
            <div className="container mx-auto px-4 md:px-8 lg:px-16">

                {/* Header - más compacto */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        Únete a Nuestra Comunidad
                    </h2>
                    <p className="text-base md:text-lg text-gray-600">
                        Más de <span className="font-bold text-gray-900">47,000 seguidores</span> confían en nuestro arte
                    </p>
                </div>

                {/* Social Media Stats - más compacto */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
                    {socialStats.map((social) => {
                        const Icon = social.icon;
                        return (
                            <a
                                key={social.platform}
                                href={social.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group"
                            >
                                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                                    <Icon className={`w-8 h-8 mx-auto mb-3 ${social.iconColor} group-hover:scale-110 transition-transform`} />
                                    <div className="text-2xl font-bold text-gray-900 mb-1">
                                        {social.followers}
                                    </div>
                                    <div className="text-xs text-gray-600 font-medium">
                                        {social.platform}
                                    </div>
                                </div>
                            </a>
                        );
                    })}
                </div>

                {/* CTA más discreto */}
                <div className="text-center mt-8">
                    <a
                        href="https://www.instagram.com/enigma_artesanias/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
                    >
                        <FaInstagram className="w-5 h-5 mr-2" />
                        Síguenos en Instagram
                    </a>
                </div>
            </div>
        </section>
    );
};

export default SocialProof;
