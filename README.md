# Enigma Artesanías - Web 2025

Sitio web de Enigma Artesanías, tienda de joyería artesanal en plata, alpaca y cobre.

## 🚀 Deploy

Este proyecto está configurado para deploy automático en Netlify. Cada push a la rama `main` dispara un nuevo deploy.

**📖 [Ver Guía Completa de Deploy](./DEPLOY.md)**

## 🛠️ Tecnologías

- **Frontend**: React 19 + Vite
- **Estilos**: Tailwind CSS
- **Base de datos**: Supabase
- **Hosting**: Netlify
- **Node.js**: 20.x

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm preview
```

## 🌐 URLs

- **Producción**: https://enigmajewelry.netlify.app
- **Repositorio**: https://github.com/enigmaartesanias/noviembre2025

## 📝 Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu-url-de-supabase
VITE_SUPABASE_ANON_KEY=tu-clave-anonima
```

## 📦 Estructura del Proyecto

```
src/
├── components/     # Componentes reutilizables
├── pages/         # Páginas de la aplicación
├── utils.js       # Utilidades y helpers
└── App.jsx        # Componente principal
```

## 🤝 Contribuir

Para hacer cambios al proyecto:

1. Asegúrate de estar en la rama `main`
2. Haz tus cambios
3. Commit y push a `main`
4. Netlify hará el deploy automáticamente

Ver [DEPLOY.md](./DEPLOY.md) para más detalles.

