// Cliente de Neon DB para Producción (Rediseñado)
// Producción = Solo costos, NO precios ni ganancias
import { neon } from '@neondatabase/serverless';
import { getLocalDate } from './dateUtils';

const DATABASE_URL = import.meta.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ VITE_DATABASE_URL no está configurada');
}

const sql = neon(DATABASE_URL);

// Constantes
const METALES = ['Plata', 'Alpaca', 'Cobre', 'Bronce', 'Bisutería'];
const TIPOS_PRODUCTO = ['Anillo', 'Arete', 'Collar', 'Pulsera'];

// Helper para queries de producción
export const produccionDB = {
  // ========================================
  // PRODUCCIÓN
  // ========================================

  async getAll() {
    const produccion = await sql`
      SELECT 
        pt.*,
        p.nombre_cliente,
        p.precio_total as precio_venta_pedido,
        pt.mano_de_obra as costo_mano_obra,
        ((pt.costo_materiales + pt.mano_de_obra + pt.costo_herramientas + pt.otros_gastos) / CASE WHEN pt.cantidad > 0 THEN pt.cantidad ELSE 1 END) as costo_total_unitario,
        (pt.costo_materiales + pt.mano_de_obra + pt.costo_herramientas + pt.otros_gastos) as costo_total_produccion,
        CASE 
          WHEN p.precio_total IS NOT NULL THEN 
            p.precio_total - (pt.costo_materiales + pt.mano_de_obra + pt.costo_herramientas + pt.otros_gastos)
          ELSE NULL
        END as ganancia_estimada_pedido
      FROM produccion_taller pt
      LEFT JOIN pedidos p ON pt.pedido_id = p.id_pedido
      ORDER BY pt.fecha_produccion DESC, pt.created_at DESC
    `;

    // Convertir fechas y números
    return produccion.map(p => ({
      ...p,
      codigo_correlativo: p.codigo_correlativo || `PR-${String(p.id_produccion).padStart(4, '0')}`,
      fecha_produccion: p.fecha_produccion ?
        (typeof p.fecha_produccion === 'string' ? p.fecha_produccion : new Date(p.fecha_produccion).toISOString().split('T')[0])
        : null,
      fecha_inicio_produccion: p.fecha_inicio_produccion ?
        (typeof p.fecha_inicio_produccion === 'string' ? p.fecha_inicio_produccion : new Date(p.fecha_inicio_produccion).toISOString().split('T')[0])
        : null,
      fecha_fin_produccion: p.fecha_fin_produccion ?
        (typeof p.fecha_fin_produccion === 'string' ? p.fecha_fin_produccion : new Date(p.fecha_fin_produccion).toISOString().split('T')[0])
        : null,
      cantidad: parseInt(p.cantidad) || 0,
      costo_materiales: parseFloat(p.costo_materiales) || 0,
      mano_de_obra: parseFloat(p.mano_de_obra) || 0,
      costo_herramientas: parseFloat(p.costo_herramientas) || 0,
      otros_gastos: parseFloat(p.otros_gastos) || 0,
      costo_total_unitario: parseFloat(p.costo_total_unitario) || 0,
      costo_total_produccion: parseFloat(p.costo_total_produccion) || 0,
      precio_sugerido: parseFloat(p.precio_sugerido) || 0,
      complejidad: p.complejidad || 'Media',
      motivo_anulacion: p.motivo_anulacion || ''
    }));
  },

  async getById(id) {
    const [produccion] = await sql`
      SELECT * FROM produccion_taller WHERE id_produccion = ${id}
    `;
    return produccion;
  },

  // Crear producción desde pedido
  async createFromPedido(pedidoId, data = {}) {
    const [pedido] = await sql`
      SELECT metal, tipo_producto, nombre_cliente FROM pedidos
      WHERE id_pedido = ${pedidoId}
    `;

    if (!pedido) throw new Error('Pedido no encontrado');

    const metal = data.metal || pedido.metal || 'Plata';
    const tipo_producto = data.tipo_producto || pedido.tipo_producto || 'Anillo';

    const nombre_producto = data.nombre_producto ||
      (data.tipo_producto ? `${data.tipo_producto} - ${pedido.nombre_cliente}` : `${pedido.nombre_cliente} - Pedido ${pedidoId}`);

    const [produccion] = await sql`
      INSERT INTO produccion_taller (
        pedido_id, tipo_produccion, metal, tipo_producto, nombre_producto,
        cantidad, costo_materiales, mano_de_obra, porcentaje_alquiler,
        costo_herramientas, otros_gastos, estado_produccion, observaciones, imagen_url,
        fecha_produccion, fecha_inicio_produccion
      ) VALUES (
        ${pedidoId},
        'PEDIDO',
        ${metal},
        ${tipo_producto},
        ${nombre_producto},
        ${data.cantidad || 1},
        ${data.costo_materiales || 0},
        ${data.mano_de_obra || 0},
        ${data.porcentaje_alquiler || 0},
        ${data.costo_herramientas || 0},
        ${data.otros_gastos || 0},
        'en_proceso',
        ${data.observaciones || 'Producción creada desde pedido'},
        ${data.imagen_url || ''},
        ${getLocalDate()},
        ${getLocalDate()}
      )
      RETURNING *
    `;
    return produccion;
  },

  async create(data) {
    const {
      pedido_id, tipo_produccion, metal, tipo_producto,
      nombre_producto, cantidad, costo_materiales,
      mano_de_obra, costo_herramientas, otros_gastos,
      estado_produccion, observaciones, imagen_url, codigo_producto
    } = data;

    const localToday = getLocalDate();
    let fechaInicio = null;
    let fechaFin = null;

    if (estado_produccion === 'en_proceso' || estado_produccion === 'terminado') {
      fechaInicio = localToday;
    }
    if (estado_produccion === 'terminado') {
      fechaFin = localToday;
    }

    const [newProduccion] = await sql`
      INSERT INTO produccion_taller(
        pedido_id, tipo_produccion, metal, tipo_producto,
        nombre_producto, cantidad, costo_materiales,
        mano_de_obra, costo_herramientas, otros_gastos,
        estado_produccion, observaciones, imagen_url, codigo_producto,
        fecha_inicio_produccion, fecha_fin_produccion,
        fecha_produccion, complejidad, precio_sugerido,
        peso_material_gramos, horas_trabajo_real, es_bisuteria,
        costo_empaque, costo_envio_asumido, sueldo_hora_objetivo
      ) VALUES(
        ${pedido_id || null}, ${tipo_produccion}, ${metal}, ${tipo_producto},
        ${nombre_producto}, ${cantidad}, ${costo_materiales || 0},
        ${mano_de_obra || 0}, ${costo_herramientas || 0}, ${otros_gastos || 0},
        ${estado_produccion}, ${observaciones}, ${imagen_url}, ${codigo_producto},
        ${fechaInicio}, ${fechaFin}, ${data.fecha_produccion || localToday},
        ${data.complejidad || 'Media'}, ${data.precio_sugerido || 0},
        ${data.peso_material_gramos || 0}, ${data.horas_trabajo_real || 0},
        ${data.es_bisuteria || false}, ${data.costo_empaque || 0},
        ${data.costo_envio_asumido || 0}, ${data.sueldo_hora_objetivo || 15.00}
      )
      RETURNING *
    `;
    return newProduccion;
  },

  async update(id, produccionData) {
    const [produccion] = await sql`
      UPDATE produccion_taller SET
        metal = ${produccionData.metal},
        tipo_producto = ${produccionData.tipo_producto},
        nombre_producto = ${produccionData.nombre_producto},
        cantidad = ${produccionData.cantidad},
        costo_materiales = ${produccionData.costo_materiales || 0},
        mano_de_obra = ${produccionData.mano_de_obra || 0},
        porcentaje_alquiler = ${produccionData.porcentaje_alquiler || 0},
        costo_herramientas = ${produccionData.costo_herramientas || 0},
        otros_gastos = ${produccionData.otros_gastos || 0},
        estado_produccion = ${produccionData.estado_produccion},
        observaciones = ${produccionData.observaciones || ''},
        imagen_url = ${produccionData.imagen_url || ''},
        codigo_producto = COALESCE(${produccionData.codigo_producto}, codigo_producto),
        tiene_codigo_qr = COALESCE(${produccionData.tiene_codigo_qr}, tiene_codigo_qr),
        fecha_produccion = ${produccionData.fecha_produccion || null},
        complejidad = ${produccionData.complejidad || 'Media'},
        precio_sugerido = ${produccionData.precio_sugerido || 0},
        peso_material_gramos = ${produccionData.peso_material_gramos || 0},
        horas_trabajo_real = ${produccionData.horas_trabajo_real || 0},
        es_bisuteria = ${produccionData.es_bisuteria || false},
        costo_empaque = ${produccionData.costo_empaque || 0},
        costo_envio_asumido = ${produccionData.costo_envio_asumido || 0},
        sueldo_hora_objetivo = ${produccionData.sueldo_hora_objetivo || 15.00}
      WHERE id_produccion = ${id}
      RETURNING *
    `;
    return produccion;
  },

  async updateCostosReales(id, data) {
    const [produccion] = await sql`
      UPDATE produccion_taller SET
        peso_material_gramos = ${data.peso_material_gramos || 0},
        horas_trabajo_real = ${data.horas_trabajo_real || 0},
        costo_insumos_extra = ${data.costo_insumos_extra || 0},
        costo_materiales = ${data.costo_materiales || 0},
        mano_de_obra = ${data.mano_de_obra || 0},
        costo_herramientas = ${data.costo_herramientas || 0},
        precio_sugerido = ${data.precio_sugerido || 0},
        imagen_url = COALESCE(${data.imagen_url || null}, imagen_url)
      WHERE id_produccion = ${id}
      RETURNING *
    `;
    return produccion;
  },

  async updateEstado(id, nuevoEstado) {
    const now = new Date();
    const localToday = getLocalDate();

    const [produccion] = await sql`
      UPDATE produccion_taller SET
        estado_produccion = ${nuevoEstado},
        fecha_terminado = ${nuevoEstado === 'terminado' ? now.toISOString() : null},
        fecha_fin_produccion = ${nuevoEstado === 'terminado' ? localToday : null}
      WHERE id_produccion = ${id}
      RETURNING *
    `;
    return produccion;
  },

  async delete(id) {
    await sql`DELETE FROM produccion_taller WHERE id_produccion = ${id}`;
  },

  // Método anular actualizado con parámetro motivo
  async anular(id, motivo = '') {
    const [produccion] = await sql`
      UPDATE produccion_taller SET
        estado_produccion = 'anulado',
        motivo_anulacion = ${motivo || null}
      WHERE id_produccion = ${id}
      RETURNING *
    `;
    return produccion;
  },

  // ========================================
  // PEDIDOS PENDIENTES (para selector)
  // ========================================

  async getPedidosPendientes() {
    const productos = await sql`
      SELECT
        p.id_pedido,
        p.nombre_cliente,
        p.telefono,
        p.metal,
        p.tipo_producto,
        p.fecha_pedido,
        d.id_detalle,
        d.nombre_producto,
        d.cantidad,
        d.precio_unitario
      FROM pedidos p
      INNER JOIN detalles_pedido d ON p.id_pedido = d.id_pedido
      LEFT JOIN produccion_taller pr ON pr.pedido_id = p.id_pedido 
        AND pr.nombre_producto LIKE '%' || d.nombre_producto || '%'
      WHERE pr.id_produccion IS NULL
      ORDER BY p.fecha_pedido DESC, d.id_detalle
    `;

    return productos.map(prod => ({
      ...prod,
      cantidad: parseInt(prod.cantidad) || 1,
      precio_unitario: parseFloat(prod.precio_unitario) || 0
    }));
  },

  // ========================================
  // ESTADÍSTICAS
  // ========================================

  async getStats() {
    const [stats] = await sql`
      SELECT
        COUNT(*) as total_registros,
        COUNT(*) FILTER(WHERE estado_produccion = 'pendiente') as pendientes,
        COUNT(*) FILTER(WHERE estado_produccion = 'en_proceso') as en_proceso,
        COUNT(*) FILTER(WHERE estado_produccion = 'terminado') as terminados
      FROM v_produccion_con_precios
      WHERE fecha_produccion >= CURRENT_DATE - INTERVAL '30 days'
    `;

    return {
      total_registros: parseInt(stats.total_registros) || 0,
      pendientes: parseInt(stats.pendientes) || 0,
      en_proceso: parseInt(stats.en_proceso) || 0,
      terminados: parseInt(stats.terminados) || 0
    };
  },

  // ========================================
  // TRANSFERENCIA A INVENTARIO
  // ========================================

  async markAsTransferred(id_produccion, producto_externo_id) {
    const [produccion] = await sql`
      UPDATE produccion_taller SET
        transferido_inventario = TRUE,
        pendiente_inventario = FALSE,
        fecha_transferencia = CURRENT_TIMESTAMP,
        producto_externo_id = ${producto_externo_id}
      WHERE id_produccion = ${id_produccion}
      RETURNING *
    `;
    return produccion;
  },

  // ========================================
  // PENDIENTES DE INVENTARIO
  // ========================================

  async marcarPendienteInventario(id) {
    const [produccion] = await sql`
      UPDATE produccion_taller
      SET pendiente_inventario = true
      WHERE id_produccion = ${id}
      RETURNING *
    `;
    return produccion;
  },

  async getPendientesInventario() {
    const items = await sql`
      SELECT 
        pt.*,
        p.nombre_cliente,
        ((pt.costo_materiales + pt.mano_de_obra + pt.costo_herramientas + pt.otros_gastos) / CASE WHEN pt.cantidad > 0 THEN pt.cantidad ELSE 1 END) as costo_total_unitario,
        (pt.costo_materiales + pt.mano_de_obra + pt.costo_herramientas + pt.otros_gastos) as costo_total_produccion
      FROM produccion_taller pt
      LEFT JOIN pedidos p ON pt.pedido_id = p.id_pedido
      WHERE pt.estado_produccion = 'terminado'
        AND pt.pendiente_inventario = true
        AND (pt.transferido_inventario IS NOT TRUE)
      ORDER BY pt.fecha_fin_produccion DESC, pt.created_at DESC
    `;
    return items.map(p => ({
      ...p,
      cantidad: parseInt(p.cantidad) || 0,
      costo_total_unitario: parseFloat(p.costo_total_unitario) || 0,
      costo_total_produccion: parseFloat(p.costo_total_produccion) || 0
    }));
  },

  async marcarIngresadoInventario(id) {
    const [produccion] = await sql`
      UPDATE produccion_taller
      SET pendiente_inventario = false,
          transferido_inventario = true
      WHERE id_produccion = ${id}
      RETURNING *
    `;
    return produccion;
  }
};

// Exportar constantes
export { METALES, TIPOS_PRODUCTO };
export default sql;