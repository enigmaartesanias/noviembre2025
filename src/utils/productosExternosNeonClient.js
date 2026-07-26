import { neon } from '@neondatabase/serverless';

const sql = neon(import.meta.env.VITE_DATABASE_URL);

export const productosExternosDB = {
  async getAll() {
    const productos = await sql`
      SELECT * FROM productos_externos 
      WHERE estado_activo = TRUE 
      ORDER BY fecha_registro DESC
    `;
    return productos;
  },

  async getById(id) {
    const [producto] = await sql`
      SELECT * FROM productos_externos
      WHERE id = ${id}
      LIMIT 1
    `;
    if (!producto) return null;
    return {
      ...producto,
      stock_actual: Number(producto.stock_actual) || 0,
      costo: Number(producto.costo) || 0,
      precio: Number(producto.precio) || 0,
    };
  },

  async getAllConsolidated() {
    const productos = await sql`
      SELECT * FROM productos_externos
      WHERE estado_activo = TRUE AND stock_actual > 0
      ORDER BY nombre ASC
    `;
    return productos.map(p => ({
      ...p,
      stock_actual: Number(p.stock_actual) || 0,
      costo: Number(p.costo) || 0,
      precio: Number(p.precio) || 0,
    }));
  },

  // ─── NUEVO: buscado por código QR o id ───────────────────────
  // Llamado desde useVentas.scanProduct() al escanear un QR.
  // Busca primero por codigo_usuario (ej: COMP-ANI-ALP-25),
  // y como fallback por id numérico.
  async getByCodigoConsolidated(codigo) {
    if (!codigo) return null;

    // 1. Buscar por codigo_usuario exacto (caso normal del QR)
    const [porCodigo] = await sql`
      SELECT * FROM productos_externos
      WHERE estado_activo = TRUE
        AND UPPER(codigo_usuario) = UPPER(${codigo.trim()})
      LIMIT 1
    `;
    if (porCodigo) return {
      ...porCodigo,
      stock_actual: Number(porCodigo.stock_actual) || 0,
      costo: Number(porCodigo.costo) || 0,
      precio: Number(porCodigo.precio) || 0,
    };

    // 2. Fallback: buscar por id numérico (QR generado con String(producto.id))
    const idNum = parseInt(codigo, 10);
    if (!isNaN(idNum)) {
      const [porId] = await sql`
        SELECT * FROM productos_externos
        WHERE estado_activo = TRUE
          AND id = ${idNum}
        LIMIT 1
      `;
      if (porId) return {
        ...porId,
        stock_actual: Number(porId.stock_actual) || 0,
        costo: Number(porId.costo) || 0,
        precio: Number(porId.precio) || 0,
      };
    }

    return null; // No encontrado
  },
  // ─────────────────────────────────────────────────────────────

  async getNextLote(tipoProducto, material) {
    if (!tipoProducto || !material) return { prefix: '', nextLote: 'L001', codigoUnico: '' };
    const getAbrev = (str) => str.substring(0, 3).toUpperCase();
    const prefix = `${getAbrev(tipoProducto)}-${getAbrev(material)}-`;
    try {
      const dbRes = await sql`SELECT codigo_usuario FROM productos_externos WHERE codigo_usuario LIKE ${prefix + '%'}`;
      let maxNum = 0;
      dbRes.forEach(row => {
        const parts = row.codigo_usuario.split('-L');
        if (parts.length > 1) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const nextLote = 'L' + String(maxNum + 1).padStart(3, '0');
      return { prefix, nextLote, codigoUnico: prefix + nextLote };
    } catch (e) {
      return { prefix, nextLote: 'L001', codigoUnico: prefix + 'L001' };
    }
  },

  // --- REGLA DE ORO: IMAGEN_URL SIEMPRE NULL ---
  async create(data) {
    const [producto] = await sql`
      INSERT INTO productos_externos (
        codigo_usuario, nombre, categoria, material, costo, precio, 
        stock_actual, origen, imagen_url, tipo_inventario
      ) VALUES (
        ${data.codigo_usuario}, ${data.nombre}, ${data.categoria}, ${data.material || ''},
        ${data.costo || 0}, ${data.precio || 0}, ${data.stock_actual || 0},
        ${data.origen || 'COMPRA'}, NULL, ${data.tipo_inventario || 'Único'}
      )
      RETURNING *
    `;
    return producto;
  },

  async upsertGrupal(data) {
    const result = await sql`
      INSERT INTO productos_externos (
        codigo_usuario, nombre, categoria, material, costo, precio, 
        stock_actual, origen, imagen_url, tipo_inventario
      ) VALUES (
        ${data.codigo_usuario}, ${data.nombre}, ${data.categoria}, ${data.material || ''},
        ${data.costo || 0}, ${data.precio || 0}, ${data.stock_actual || 0},
        ${data.origen || 'PRODUCCION'}, NULL, 'Grupal'
      )
      ON CONFLICT (codigo_usuario) 
      DO UPDATE SET 
        stock_actual = productos_externos.stock_actual + EXCLUDED.stock_actual,
        precio = EXCLUDED.precio,
        costo = EXCLUDED.costo
      RETURNING *
    `;
    return result[0];
  },

  async enviarAStock(data) {
    const tipoInventario = data.tipo_inventario || 'Único';
    const categoriaProducto = data.categoria || data.tipo_producto || 'OTROS';
    const result = await sql`
      INSERT INTO productos_externos (
        codigo_usuario, nombre, categoria, material, costo, precio, 
        stock_actual, origen, imagen_url, produccion_id, tipo_inventario
      ) VALUES (
        ${data.codigo}, ${data.nombre}, ${categoriaProducto}, ${data.material || ''},
        ${data.costo || 0}, ${data.precio}, ${data.cantidad},
        'PRODUCCION', NULL, ${data.produccionId || null}, ${tipoInventario}
      )
      ON CONFLICT (codigo_usuario) 
      DO UPDATE SET 
        stock_actual = productos_externos.stock_actual + EXCLUDED.stock_actual,
        precio = EXCLUDED.precio,
        categoria = COALESCE(productos_externos.categoria, EXCLUDED.categoria)
      RETURNING *
    `;
    return result[0];
  },

  async update(id, data) {
    const [producto] = await sql`
      UPDATE productos_externos SET
        codigo_usuario = ${data.codigo_usuario},
        nombre = ${data.nombre},
        categoria = ${data.categoria},
        material = ${data.material || ''},
        costo = ${data.costo},
        precio = ${data.precio},
        stock_actual = ${data.stock_actual},
        imagen_url = NULL
      WHERE id = ${id}
      RETURNING *
    `;
    return producto;
  },

  async delete(id) {
    return await sql`DELETE FROM productos_externos WHERE id = ${id} RETURNING *`;
  },

  async search(query) {
    return await sql`
      SELECT * FROM productos_externos
      WHERE estado_activo = TRUE
        AND stock_actual > 0
        AND (
          LOWER(nombre) LIKE ${`%${query.toLowerCase()}%`} 
          OR LOWER(codigo_usuario) LIKE ${`%${query.toLowerCase()}%`}
        )
      LIMIT 10
    `;
  },

  async incrementStock(id, cantidad) {
    return await sql`
      UPDATE productos_externos 
      SET stock_actual = stock_actual + ${cantidad} 
      WHERE id = ${id} 
      RETURNING *
    `;
  },

  async checkCodigo(codigo) {
    const [p] = await sql`
      SELECT stock_actual, nombre, precio
      FROM productos_externos 
      WHERE codigo_usuario = ${codigo.toUpperCase()} 
        AND estado_activo = TRUE 
      LIMIT 1
    `;
    return p
      ? { exists: true, stockActual: Number(p.stock_actual), precio: Number(p.precio) }
      : { exists: false, stockActual: 0, precio: null };
  },
};