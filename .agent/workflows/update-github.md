---
description: Actualizar GitHub con los cambios recientes
---

# Workflow: Actualizar GitHub

Este workflow sube automáticamente todos los cambios al repositorio de GitHub.

## Pasos:

1. Verificar el estado actual del repositorio
```bash
git status
```

// turbo
2. Agregar todos los cambios
```bash
git add .
```

// turbo
3. Crear commit con mensaje descriptivo
```bash
git commit -m "Actualización automática - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
```

// turbo
4. Subir cambios a GitHub (rama main)
```bash
git push origin main
```

5. Verificar que se subió correctamente
```bash
git log -1 --oneline
```

## Notas:
- Este workflow agrega TODOS los archivos modificados
- El commit incluye la fecha y hora automáticamente
- Se sube a la rama `main` por defecto
- Netlify detectará los cambios y hará deploy automáticamente
