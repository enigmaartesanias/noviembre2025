# 🚀 Guía de Deploy - Enigma Artesanías

## Configuración del Proyecto

- **Repositorio GitHub**: https://github.com/enigmaartesanias/noviembre2025
- **Rama de Producción**: `main`
- **Plataforma**: Netlify
- **URL Producción**: https://enigmajewelry.netlify.app

## Proceso de Deploy Automático

Cada vez que hagas `push` a la rama `main`, Netlify automáticamente:

1. ✅ Detecta los cambios
2. ✅ Instala las dependencias
3. ✅ Ejecuta el build (`npm run build`)
4. ✅ Publica el sitio actualizado

## Pasos para Hacer Deploy

### 1. Asegúrate de estar en la rama main

```bash
git checkout main
```

### 2. Guarda tus cambios

```bash
git add .
git commit -m "Descripción de tus cambios"
```

### 3. Sube los cambios a GitHub

```bash
git push origin main
```

### 4. Verifica el deploy en Netlify

1. Ve a: https://app.netlify.com
2. Busca tu sitio: `enigmajewelry`
3. Espera 2-5 minutos
4. Visita tu sitio: https://enigmajewelry.netlify.app

## ⚙️ Configuración de Netlify

### Variables de Entorno Requeridas

En Netlify (Site settings → Environment variables):

```
VITE_SUPABASE_URL=https://qwvhrtdddpmaovnyarhr.supabase.co
VITE_SUPABASE_ANON_KEY=[tu-clave-anonima]
```

### Configuración de Build

El archivo `netlify.toml` ya está configurado con:

```toml
[build]
  command = "rm -rf node_modules package-lock.json && npm install && npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 📝 Notas Importantes

- **Trabaja siempre en `main`**: No uses otras ramas para desarrollo
- **Deploy automático**: Cada push dispara un nuevo deploy
- **Tiempo estimado**: 2-5 minutos por deploy
- **Node.js**: El proyecto usa Node.js 20.x

## 🔧 Solución de Problemas

### El deploy falla

1. Revisa los logs en Netlify dashboard
2. Verifica que el build funcione localmente:
   ```bash
   npm run build
   ```
3. Confirma que las variables de entorno estén en Netlify

### Los cambios no se reflejan

1. Espera 5 minutos (puede haber caché)
2. Limpia el caché del navegador (Ctrl + Shift + R)
3. Verifica que el deploy esté "Published" en Netlify

### Error de Node.js

El proyecto requiere Node.js 20.x. Netlify usa la versión especificada en:
- `package.json` → `"engines": { "node": "20.x" }`
- `.nvmrc` → `20`

## 📞 Contacto

Si tienes problemas con el deploy, revisa los logs en Netlify o contacta al equipo de desarrollo.
