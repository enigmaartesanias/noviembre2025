import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './WhatsAppButton.css';

const WhatsAppButton = () => {
    const phoneNumber = '51960282376'; // Número de WhatsApp sin + ni espacios
    const location = useLocation();
    const [whatsappUrl, setWhatsappUrl] = useState('');

    useEffect(() => {
        const generateWhatsAppUrl = async () => {
            // Detectar si estamos en una página de producto
            const productMatch = location.pathname.match(/^\/producto\/(\d+)$/);

            if (productMatch) {
                const productId = productMatch[1];

                try {
                    // Obtener el título del producto desde Supabase
                    const { data, error } = await supabase
                        .from('productos')
                        .select('titulo')
                        .eq('id', productId)
                        .single();

                    if (!error && data) {
                        const productTitle = data.titulo;
                        const productUrl = window.location.href;
                        const message = encodeURIComponent(
                            `Hola estoy interesado, ${productTitle}, éste es el enlace ${productUrl}`
                        );
                        setWhatsappUrl(`https://wa.me/${phoneNumber}?text=${message}`);
                        return;
                    }
                } catch (err) {
                    console.error('Error al obtener el producto:', err);
                }
            }

            // Mensaje por defecto si no estamos en una página de producto
            const defaultMessage = encodeURIComponent('¡Hola! Me interesan sus productos artesanales.');
            setWhatsappUrl(`https://wa.me/${phoneNumber}?text=${defaultMessage}`);
        };

        generateWhatsAppUrl();
    }, [location.pathname]);

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-float"
            aria-label="Contactar por WhatsApp"
        >
            <svg
                viewBox="0 0 32 32"
                className="whatsapp-icon"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    fill="currentColor"
                    d="M16 0C7.164 0 0 7.163 0 16c0 2.824.736 5.488 2.014 7.813L.069 30.727a.5.5 0 0 0 .638.638l7.086-1.945A15.93 15.93 0 0 0 16 32c8.836 0 16-7.164 16-16S24.836 0 16 0zm0 29.333c-2.547 0-4.98-.713-7.04-2.013a.5.5 0 0 0-.413-.053l-5.36 1.473 1.473-5.36a.5.5 0 0 0-.053-.413A13.27 13.27 0 0 1 2.667 16c0-7.36 5.973-13.333 13.333-13.333S29.333 8.64 29.333 16 23.36 29.333 16 29.333z"
                />
                <path
                    fill="currentColor"
                    d="M23.547 19.427c-.32-.16-1.893-.933-2.187-1.04-.293-.107-.507-.16-.72.16-.213.32-.827 1.04-1.013 1.253-.187.213-.373.24-.693.08-.32-.16-1.347-.493-2.56-1.573-.947-.84-1.587-1.88-1.773-2.2-.187-.32-.02-.493.14-.653.147-.147.32-.373.48-.56.16-.187.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.72-1.733-.987-2.373-.253-.613-.52-.533-.72-.547-.187-.013-.4-.013-.613-.013s-.56.08-.853.4c-.293.32-1.12 1.093-1.12 2.667s1.147 3.093 1.307 3.307c.16.213 2.24 3.413 5.427 4.787.76.32 1.347.52 1.813.667.76.24 1.453.2 2 .12.613-.093 1.893-.773 2.16-1.52.267-.747.267-1.387.187-1.52-.08-.133-.293-.213-.613-.373z"
                />
            </svg>
            <span className="whatsapp-tooltip">¿Necesitas ayuda?</span>
        </a>
    );
};

export default WhatsAppButton;
