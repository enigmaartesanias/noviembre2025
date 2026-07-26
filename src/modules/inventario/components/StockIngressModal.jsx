import React, { useState, useEffect, useRef } from 'react';
import { productosExternosDB } from '../../../utils/productosExternosNeonClient';
import { produccionDB } from '../../../utils/produccionNeonClient';
import QRCode from 'react-qr-code';
import { FaTimes, FaBoxOpen, FaSpinner, FaRandom } from 'react-icons/fa';
import toast from 'react-hot-toast';

/**
 * StockIngressModal — v3
 * Regla de Oro: SIN imágenes. Solo texto.
 * Switch Único / Grupal con lógica de código diferenciada.
 * v3: Pre-llena precio con precio_sugerido de producción si existe.
 */
const StockIngressModal = ({ item, onSuccess, onCancel }) => {
    const [tipoIngreso, setTipoIngreso] = useState('Único');   // 'Único' | 'Grupal'
    const [codigo, setCodigo] = useState('');
    const [lote, setLote] = useState('');

    // ── Pre-llenar precio con precio_sugerido si viene de producción ──────────
    const precioSugeridoInicial = item?.precio_sugerido
        ? parseFloat(item.precio_sugerido) > 0
            ? String(parseFloat(item.precio_sugerido).toFixed(2))
            : ''
        : '';

    const [precio, setPrecio] = useState(precioSugeridoInicial);
    const [precioOferta, setPrecioOferta] = useState('');
    const [codigoCheck, setCodigoCheck] = useState(null);      // null | 'checking' | { exists, stockActual, precio }
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);

    // ── Cuando cambia el tipo de ingreso, limpiar código pero mantener precio ─
    useEffect(() => {
        setCodigo('');
        setLote('');
        setCodigoCheck(null);
    }, [tipoIngreso]);

    // ── Auto-uppercase + sin espacios ─────────────────────────────────────────
    const handleCodigoChange = (e) => {
        const val = e.target.value.toUpperCase().replace(/\s/g, '');
        setCodigo(val);

        // Extrae lote automáticamente si escriben "AN-ALP-L003"
        if (val.includes('-L')) {
            const parts = val.split('-L');
            if (parts.length > 1) {
                setLote('L' + parts[parts.length - 1].split('-')[0]);
            }
        }
    };

    // ── Generar código según tipo ─────────────────────────────────────────────
    const generarCodigo = async () => {
        if (tipoIngreso === 'Grupal') {
            // Código inteligente: PROD-CAT-MAT-PRECIO
            if (!precio) {
                toast.error('Ingresa primero el precio de venta para generar el código grupal.');
                return;
            }
            const cat = (item.tipo_producto || item.categoria || 'PRD').substring(0, 3).toUpperCase();
            const mat = (item.metal || item.material || 'MAT').substring(0, 3).toUpperCase();
            const prc = parseFloat(precio);
            const code = `PROD-${cat}-${mat}-${prc}`;
            setCodigo(code);
            setLote('');
            toast.success(`Código grupal generado: ${code}`);
        } else {
            // Código único correlativo automático
            if (!item.tipo_producto || !item.metal) {
                toast.error('Falta Tipo de Producto o Metal en la producción.');
                return;
            }
            try {
                const data = await productosExternosDB.getNextLote(item.tipo_producto, item.metal);
                setCodigo(data.codigoUnico);
                setLote(data.nextLote);
                toast.success('Código de lote autogenerado');
            } catch (err) {
                console.error(err);
                toast.error('Error al generar el código.');
            }
        }
    };

    // ── Validación en tiempo real del código ──────────────────────────────────
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!codigo.trim()) { setCodigoCheck(null); return; }

        setCodigoCheck('checking');
        debounceRef.current = setTimeout(async () => {
            try {
                const result = await productosExternosDB.checkCodigo(codigo.trim());
                setCodigoCheck(result);
                // Si el grupo ya existe y no hay precio cargado, pre-llena con el del grupo
                if (result.exists && result.precio && !precio) {
                    setPrecio(String(parseFloat(result.precio).toFixed(2)));
                }
            } catch {
                setCodigoCheck(null);
            }
        }, 500);

        return () => clearTimeout(debounceRef.current);
    }, [codigo]);

    // ── Feedback visual del código ────────────────────────────────────────────
    const renderCodigoFeedback = () => {
        if (!codigo) return null;
        if (codigoCheck === 'checking') return (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                <FaSpinner className="animate-spin" size={10} />
                <span>Verificando...</span>
            </div>
        );
        if (!codigoCheck) return null;
        if (codigoCheck.exists) return (
            <div className="mt-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-start gap-1.5">
                <span className="font-bold flex-shrink-0 mt-0.5">✅</span>
                <span>
                    Grupo <strong>{codigo}</strong> existe · Stock actual:{' '}
                    <strong>{codigoCheck.stockActual}u</strong>
                    {' '}→ sumará <strong>{item.cantidad}u</strong>
                    {' '}→ Total: <strong>{codigoCheck.stockActual + item.cantidad}u</strong>
                </span>
            </div>
        );
        return (
            <div className="mt-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center gap-1.5">
                <span className="flex-shrink-0">🆕</span>
                <span>
                    Código nuevo · se creará{' '}
                    <strong>{tipoIngreso === 'Grupal' ? 'el grupo' : 'el lote'}</strong>{' '}
                    <strong>{codigo}</strong>
                </span>
            </div>
        );
    };

    // ── Submit principal ──────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!codigo.trim()) { toast.error('El código es obligatorio'); return; }
        if (!precio) { toast.error('El precio de venta es obligatorio'); return; }

        setLoading(true);
        try {
            // 1. Marcar producción como terminada
            await produccionDB.updateEstado(item.id_produccion, 'terminado');

            // 2. Enviar a stock — SIN imagen_url (Regla de Oro)
            const result = await productosExternosDB.enviarAStock({
                codigo: codigo.trim(),
                lote: lote || null,
                cantidad: item.cantidad,
                precio: parseFloat(precio),
                precioReferencial: precioOferta ? parseFloat(precioOferta) : null,
                produccionId: item.id_produccion,
                codigo_produccion: item.codigo_correlativo || `PR-${String(item.id_produccion).padStart(4, '0')}`,
                tipo_producto: item.tipo_producto,
                categoria: item.tipo_producto || item.categoria || 'OTROS',
                tipo_inventario: tipoIngreso,
                origen_producto: 'Produccion',
                nombre: item.nombre_producto || `${item.tipo_producto} de ${item.metal}`,
                material: item.metal || '',
                imagen_url: null,                   // ← REGLA DE ORO: siempre null
                costo: parseFloat(item.costo_total_unitario || item.costo_materiales || 0)
            });

            // 3. Marcar como transferido en producción
            if (result) {
                await produccionDB.markAsTransferred(item.id_produccion, result.id);
                await produccionDB.marcarIngresadoInventario(item.id_produccion);
            }

            toast.success(
                `✅ ${codigo} · ${tipoIngreso} ingresado al stock`,
                { duration: 4000 }
            );
            onSuccess();
        } catch (error) {
            console.error('Error al ingresar al stock:', error);
            toast.error('Error al ingresar: ' + (error.message || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    };

    // ── Solo marcar como terminado ────────────────────────────────────────────
    const handleTerminarSinStock = async () => {
        setLoading(true);
        try {
            await produccionDB.updateEstado(item.id_produccion, 'terminado');
            toast('Producción terminada. Podés ingresarlo al stock más tarde.', { icon: '📋' });
            onSuccess();
        } catch (error) {
            toast.error('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Helpers visuales ──────────────────────────────────────────────────────
    const tienePrecioSugerido = parseFloat(item?.precio_sugerido || 0) > 0;
    const costoUnitario = parseFloat(item?.costo_total_unitario || item?.costo_materiales || 0);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <FaBoxOpen className="text-white/80" size={15} />
                            <span className="text-sm font-semibold text-white tracking-wide">Ingresar al Stock</span>
                        </div>
                        <button
                            onClick={onCancel}
                            className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10"
                        >
                            <FaTimes size={15} />
                        </button>
                    </div>
                    <p className="text-white font-bold text-base leading-tight">
                        {item.nombre_producto || `${item.tipo_producto} de ${item.metal}`}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-white/70 text-xs">
                            {item.cantidad} {item.cantidad === 1 ? 'unidad' : 'unidades'}
                        </span>
                        <span className="text-white/30">·</span>
                        <span className="text-white/70 text-xs">
                            Costo: S/ {costoUnitario.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div className="p-5 space-y-4">

                    {/* ── Switch Único / Grupal ── */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">
                            Tipo de Ingreso
                        </label>
                        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                            {['Único', 'Grupal'].map(tipo => (
                                <button
                                    key={tipo}
                                    type="button"
                                    onClick={() => setTipoIngreso(tipo)}
                                    className={`flex-1 py-2.5 text-xs font-bold transition-all ${tipoIngreso === tipo
                                            ? 'bg-gray-900 text-white'
                                            : 'bg-white text-gray-400 hover:bg-gray-50'
                                        }`}
                                >
                                    {tipo === 'Único' ? '🔹 Único' : '📦 Grupal'}
                                </button>
                            ))}
                        </div>
                        <p className="mt-1.5 text-[10px] text-gray-400 leading-relaxed">
                            {tipoIngreso === 'Único'
                                ? 'Lote correlativo automático. Cada pieza es individual.'
                                : 'Agrupa por metal y precio. Suma stock si el código ya existe.'}
                        </p>
                    </div>

                    {/* ── Precio — con badge de precio sugerido ── */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                                Precio venta <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">S/</span>
                                <input
                                    type="number"
                                    value={precio}
                                    onChange={e => setPrecio(e.target.value)}
                                    placeholder="0.00"
                                    step="0.50"
                                    className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                />
                            </div>
                            {/* Badge precio sugerido */}
                            {tienePrecioSugerido && (
                                <div className="mt-1.5 flex items-center justify-between">
                                    <span className="text-[9px] text-purple-500 font-semibold">
                                        ✦ Sugerido por producción
                                    </span>
                                    {precio !== precioSugeridoInicial && (
                                        <button
                                            type="button"
                                            onClick={() => setPrecio(precioSugeridoInicial)}
                                            className="text-[9px] text-purple-400 hover:text-purple-600 underline"
                                        >
                                            restaurar S/ {precioSugeridoInicial}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-blue-400 mb-1.5 uppercase tracking-wider">
                                Precio oferta
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">S/</span>
                                <input
                                    type="number"
                                    value={precioOferta}
                                    onChange={e => setPrecioOferta(e.target.value)}
                                    placeholder="Opcional"
                                    step="0.50"
                                    className="w-full pl-7 pr-3 py-2.5 border border-blue-200 bg-blue-50/40 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Info de margen si hay precio y costo ── */}
                    {precio && costoUnitario > 0 && (
                        <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-medium">Margen estimado</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-bold text-gray-700">
                                    S/ {(parseFloat(precio) - costoUnitario).toFixed(2)}
                                </span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${((parseFloat(precio) - costoUnitario) / costoUnitario) >= 1
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {costoUnitario > 0
                                        ? `${(((parseFloat(precio) - costoUnitario) / costoUnitario) * 100).toFixed(0)}%`
                                        : '—'
                                    }
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ── Código SKU / Lote ── */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                            {tipoIngreso === 'Único' ? 'Código SKU / Lote' : 'Código Grupal'}{' '}
                            <span className="text-red-400">*</span>
                            {tipoIngreso === 'Grupal' && (
                                <span className="ml-1 text-gray-300 normal-case font-normal">
                                    (PROD-CAT-MAT-PRECIO)
                                </span>
                            )}
                        </label>
                        <div className="flex gap-2 items-start">
                            <div className="flex-1">
                                <div className="flex gap-1.5">
                                    <input
                                        type="text"
                                        value={codigo}
                                        onChange={handleCodigoChange}
                                        placeholder={tipoIngreso === 'Único' ? 'Ej: AN-ALP-L001' : 'Ej: PROD-ANI-COB-50'}
                                        autoFocus
                                        readOnly={tipoIngreso === 'Grupal'}
                                        className={`w-full px-3 py-2.5 border rounded-xl text-sm font-mono font-bold uppercase tracking-widest focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none ${tipoIngreso === 'Grupal'
                                                ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                                                : 'border-gray-300'
                                            }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={generarCodigo}
                                        className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-[10px] font-bold whitespace-nowrap flex items-center gap-1 shadow-sm"
                                        title={tipoIngreso === 'Único' ? 'Generar Lote Automático' : 'Generar Código Grupal'}
                                    >
                                        <FaRandom size={12} /> Auto
                                    </button>
                                </div>
                                {renderCodigoFeedback()}
                            </div>

                            {/* QR Preview */}
                            <div className="w-14 h-14 bg-white border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 p-1.5">
                                {codigo ? (
                                    <QRCode value={codigo} size={40} />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 rounded-lg" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Acciones ── */}
                    <div className="space-y-2 pt-1">
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !codigo.trim() || !precio}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-purple-200 hover:opacity-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading
                                ? <><FaSpinner className="animate-spin" size={13} /> Ingresando...</>
                                : <><FaBoxOpen size={13} /> Ingresar al Stock</>
                            }
                        </button>
                        <button
                            onClick={handleTerminarSinStock}
                            disabled={loading}
                            className="w-full py-2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Solo marcar como terminado · ingresar al stock después
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default StockIngressModal;
