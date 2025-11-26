---
description: Deploy completo del proyecto a Netlify
---

# Workflow: Deploy a Netlify

Este workflow describe el proceso para hacer deploy completo del proyecto a Netlify.

## Configuración Actual

- **Repositorio**: https://github.com/enigmaartesanias/noviembre2025
- **Rama de producción**: `main`
- **Plataforma de deploy**: Netlify
- **URL de producción**: https://enigmajewelry.netlify.app

## Proceso de Deploy

### 1. Asegúrate de estar en la rama main

```bash
git checkout main
```

### 2. Verifica que tengas los últimos cambios

```bash
git status
```

Si hay cambios sin commitear, haz commit primero:

```bash
git add .
git commit -m "Descripción de los cambios"
```

### 3. Haz push a GitHub

// turbo
```bash
git push origin main
```

### 4. Netlify hará el deploy automáticamente

Netlify detectará el push a `main` y ejecutará:
- Instalación de dependencias
- Build del proyecto (`npm run build`)
- Publicación de la carpeta `dist`

### 5. Verifica el deploy

1. Ve a https://app.netlify.com
2. Selecciona el sitio `enigmajewelry`
3. Verifica que el deploy esté en progreso o completado
4. Una vez publicado, visita https://enigmajewelry.netlify.app

## Notas Importantes

- **Solo trabaja en la rama `main`**: De ahora en adelante, todos los cambios deben hacerse directamente en `main`
- **Deploy automático**: Cada push a `main` dispara un deploy automático en Netlify
- **Tiempo de deploy**: Aproximadamente 2-5 minutos
- **Variables de entorno**: Asegúrate de que las variables de Supabase estén configuradas en Netlify

## Solución de Problemas

Si el deploy falla:
1. Revisa los logs en Netlify dashboard
2. Verifica que el build local funcione: `npm run build`
3. Confirma que las variables de entorno estén configuradas en Netlify
