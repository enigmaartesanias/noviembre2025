export const generateSlug = (text) => {
    if (!text) return '';

    // Convertir a minúsculas y reemplazar espacios con guiones
    let slug = text.toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales
        .replace(/[\s_-]+/g, '-') // Reemplazar espacios y guiones bajos con un solo guion
        .replace(/^-+|-+$/g, ''); // Eliminar guiones al inicio y al final

    // Añadir un sufijo aleatorio corto para garantizar unicidad
    const randomSuffix = Math.random().toString(36).substring(2, 7);

    return `${slug}-${randomSuffix}`;
};
