import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { productosExternosDB } from '../../../utils/productosExternosNeonClient';
import { produccionDB } from '../../../utils/produccionNeonClient';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaBox, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import StockIngressModal from '../components/StockIngressModal';

export default function Inventario() {
    const navigate = useNavigate();
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedMetal, setSelectedMetal] = useState('');

    const [pendientes, setPendientes] = useState([]);
    const [pendientesExpanded, setPendientesExpanded] = useState(true);
    const [selectedPendiente, setSelectedPendiente] = useState(null);
    const [showStockIngressModal, setShowStockIngressModal] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false, title: '', message: '', onConfirm: () => { }
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [prodData, pendData] = await Promise.all([
                productosExternosDB.getAllConsolidated(),
                produccionDB.getPendientesInventario()
            ]);
            setProductos(prodData);
            setPendientes(pendData);
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleIngresar = (item) => {
        setSelectedPendiente(item);
        setShowStockIngressModal(true);
    };

    const handleIngresarSuccess = () => {
        setShowStockIngressModal(false);
        setSelectedPendiente(null);
        toast.success('✅ Producto ingresado al inventario');
        loadData();
    };

    const handleDelete = (id, nombre) => {
        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Producto',
            message: `¿Estás seguro de eliminar "${nombre}" del inventario?`,
            onConfirm: async () => {
                await productosExternosDB.delete(id);
                toast.success('Producto eliminado');
                loadData();
            }
        });
    };

    // ── Listas únicas para filtros ─────────────────────────────
    const categorias = [...new Set(productos.map(p => p.categoria?.toUpperCase()).filter(Boolean))].sort();
    const metales = [...new Set(productos.map(p => p.material?.toUpperCase()).filter(Boolean))].sort();

    // ── Grid filtrado (ordenado por fecha de ingreso reciente: lo último ingresado primero) ──
    const filteredProductos = productos.filter(p => {
        const hasStock = p.stock_actual > 0;
        const matchesSearch =
            (p.nombre?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.codigo_usuario?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = !selectedCategory || (p.categoria?.toUpperCase() === selectedCategory);
        const matchesMetal = !selectedMetal || (p.material?.toUpperCase() === selectedMetal);
        return hasStock && matchesSearch && matchesCategory && matchesMetal;
    });

    const sortedProductos = [...filteredProductos].sort((a, b) => {
        const timeA = a.fecha_registro ? new Date(a.fecha_registro).getTime() : Number(a.id || 0);
        const timeB = b.fecha_registro ? new Date(b.fecha_registro).getTime() : Number(b.id || 0);
        return timeB - timeA;
    });

    // ── Tarjeta resumen ────────────────────────────────────────
    const resumen = filteredProductos.reduce((acc, p) => {
        const stock = Number(p.stock_actual) || 0;
        const costo = Number(p.costo) || 0;
        const precio = Number(p.precio) || 0;
        acc.productos += 1;
        acc.unidades += stock;
        acc.totalCosto += stock * costo;
        acc.totalVenta += stock * precio;
        return acc;
    }, { productos: 0, unidades: 0, totalCosto: 0, totalVenta: 0 });

    // ── Productos fabricados sin costo registrado ──────────────
    const sinCosto = filteredProductos.filter(p =>
        (p.origen === 'PRODUCCION' || p.origen === 'INV_TALLER') &&
        (Number(p.costo) || 0) === 0
    ).length;

    const fmt = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <Toaster position="top-right" />

            {/* Topbar */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                    <Link to="/inventario-home" className="flex items-center gap-2 text-gray-600 text-sm font-semibold">
                        <FaArrowLeft size={13} /> Volver
                    </Link>
                    <button
                        onClick={() => navigate('/inventario/nuevo')}
                        className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-700 flex items-center gap-1.5"
                    >
                        <FaPlus size={11} /> Nuevo Producto
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                            <FaBox className="text-teal-700 text-lg" />
                        </div>
                        <div>
                            <h1 className="text-base font-semibold text-gray-900 leading-tight">Reporte de inventario</h1>
                            <p className="text-xs text-gray-400">Enigma Artesanías · stock activo</p>
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                        Activo
                    </span>
                </div>

                {/* ── Tarjeta resumen ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Productos', value: resumen.productos, isNum: true, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                        { label: 'Unidades', value: resumen.unidades, isNum: true, color: 'bg-teal-50   text-teal-700   border-teal-100' },
                        { label: 'Costo total', value: fmt(resumen.totalCosto), isNum: false, color: 'bg-amber-50  text-amber-700  border-amber-100' },
                        { label: 'Valor venta', value: fmt(resumen.totalVenta), isNum: false, color: 'bg-green-50  text-green-700  border-green-100' },
                    ].map(card => (
                        <div key={card.label} className={`rounded-xl border px-4 py-3 flex flex-col gap-0.5 ${card.color}`}>
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{card.label}</span>
                            <span className="text-lg font-black leading-tight">
                                {card.isNum ? card.value.toLocaleString('es-PE') : card.value}
                            </span>
                            {(selectedCategory || selectedMetal || searchTerm) && (
                                <span className="text-[9px] opacity-50 font-medium">filtrado</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* ── Alerta global sin costo ── */}
                {!loading && sinCosto > 0 && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <span className="text-amber-500 text-base mt-0.5">⚠</span>
                        <div>
                            <p className="text-xs font-bold text-amber-800 leading-tight">
                                {sinCosto} {sinCosto === 1 ? 'producto fabricado no tiene' : 'productos fabricados no tienen'} costo registrado
                            </p>
                            <p className="text-[10px] text-amber-600 mt-0.5">
                                El reporte financiero puede estar incompleto. Edita el producto para agregar el costo real.
                            </p>
                        </div>
                    </div>
                )}

                {/* Producción Pendiente */}
                {!loading && pendientes.length > 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setPendientesExpanded(!pendientesExpanded)}
                            className="w-full flex items-center justify-between px-4 py-3 text-amber-800 text-xs font-bold uppercase"
                        >
                            Producción en Taller ({pendientes.length})
                            {pendientesExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                        {pendientesExpanded && (
                            <div className="divide-y divide-amber-100 bg-white">
                                {pendientes.map(item => (
                                    <div key={item.id_produccion} className="flex items-center justify-between px-4 py-3">
                                        <span className="text-xs font-medium text-gray-700">{item.nombre_producto}</span>
                                        <button
                                            onClick={() => handleIngresar(item)}
                                            className="px-3 py-1 bg-amber-600 text-white text-[10px] rounded-lg"
                                        >
                                            INGRESAR
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Filtros ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                        type="text"
                        placeholder="Buscar código o nombre..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
                    />
                    <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
                    >
                        <option value="">Todas las categorías</option>
                        {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <select
                        value={selectedMetal}
                        onChange={e => setSelectedMetal(e.target.value)}
                        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
                    >
                        <option value="">Todos los metales</option>
                        {metales.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                {/* ── Tabla responsive ── */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Código</th>
                                <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider">Producto</th>
                                <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Metal</th>
                                <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">Stock</th>
                                <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Costo unit.</th>
                                <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Costo total</th>
                                <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Precio</th>
                                <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Valor venta</th>
                                <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sortedProductos.map(p => {
                                const stock = Number(p.stock_actual) || 0;
                                const costo = Number(p.costo) || 0;
                                const precio = Number(p.precio) || 0;
                                const esFabricadoSinCosto =
                                    (p.origen === 'PRODUCCION' || p.origen === 'INV_TALLER') && costo === 0;

                                return (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-mono font-bold text-gray-700 whitespace-nowrap">
                                            {p.codigo_usuario}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-gray-800">{p.nombre}</div>
                                            {p.categoria && (
                                                <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{p.categoria}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {p.material ? (
                                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                                    {p.material}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center font-black text-teal-600 whitespace-nowrap">
                                            {stock}
                                        </td>

                                        {/* ── Costo unitario con alerta si es fabricado sin costo ── */}
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            {esFabricadoSinCosto ? (
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-gray-400">S/ 0.00</span>
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full leading-none">
                                                        ⚠ sin costo
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500">{fmt(costo)}</span>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 text-right font-semibold text-amber-700 whitespace-nowrap">
                                            {fmt(stock * costo)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                                            {fmt(precio)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-green-700 whitespace-nowrap">
                                            {fmt(stock * precio)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex justify-center gap-3">
                                                <button
                                                    onClick={() => navigate(`/inventario/editar/${p.id}`)}
                                                    className="text-blue-400 hover:text-blue-600 transition"
                                                    title="Editar"
                                                >
                                                    <FaEdit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p.id, p.nombre)}
                                                    className="text-red-400 hover:text-red-600 transition"
                                                    title="Eliminar"
                                                >
                                                    <FaTrash size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>

                        {/* Fila de totales */}
                        {sortedProductos.length > 0 && (
                            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                <tr>
                                    <td colSpan={4} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                                        Totales · {resumen.productos} productos · {resumen.unidades.toLocaleString('es-PE')} unidades
                                    </td>
                                    <td className="px-4 py-3" />
                                    <td className="px-4 py-3 text-right font-black text-amber-700 whitespace-nowrap">
                                        {fmt(resumen.totalCosto)}
                                    </td>
                                    <td className="px-4 py-3" />
                                    <td className="px-4 py-3 text-right font-black text-green-700 whitespace-nowrap">
                                        {fmt(resumen.totalVenta)}
                                    </td>
                                    <td />
                                </tr>

                                {/* ── Alerta en pie de tabla si hay fabricados sin costo ── */}
                                {sinCosto > 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 pb-3">
                                            <div className="flex items-center gap-2 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                                ⚠ {sinCosto} {sinCosto === 1 ? 'producto fabricado sin costo registrado' : 'productos fabricados sin costo registrado'} — el reporte financiero puede estar incompleto.
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tfoot>
                        )}
                    </table>

                    {!loading && sortedProductos.length === 0 && (
                        <div className="text-center py-16 text-gray-400">
                            <FaBox className="mx-auto text-3xl mb-3 opacity-30" />
                            <p className="text-sm">No hay productos con stock disponible</p>
                        </div>
                    )}
                </div>
            </div>

            {showStockIngressModal && (
                <StockIngressModal
                    item={selectedPendiente}
                    onSuccess={handleIngresarSuccess}
                    onCancel={() => setShowStockIngressModal(false)}
                />
            )}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />
        </div>
    );
}
