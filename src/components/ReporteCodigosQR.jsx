import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productosExternosDB } from '../utils/productosExternosNeonClient';
import { FaArrowLeft, FaPrint, FaSearch, FaBarcode, FaCheckCircle, FaTimes, FaPlus, FaMinus, FaCalendarDay } from 'react-icons/fa';
import QRCode from 'react-qr-code';
import toast, { Toaster } from 'react-hot-toast';
import html2canvas from 'html2canvas';

const getLocalYYYYMMDD = (dateInput) => {
    if (!dateInput) return null;
    const d = new Date(dateInput);
    if (isNaN(d)) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// Parte el código (ej: "COMP-ANI-ALP-18") en 2 líneas balanceadas por grupos
const splitCodeForLabel = (code) => {
    if (!code) return ['CÓDIGO', ''];
    const parts = code.split('-');
    if (parts.length <= 1) return [code, ''];
    const mid = Math.ceil(parts.length / 2);
    return [parts.slice(0, mid).join('-'), parts.slice(mid).join('-')];
};

// Guía de corte tipo "cintura de avispa" en SVG
const CutGuide = ({ totalWidth = 50, totalHeight = 11.4, faceWidth = 12, waistInset = 1.2, waistFlatHalf = 2, curveSpread = 5 }) => {
    const bridgeStart = faceWidth;
    const bridgeEnd = totalWidth - faceWidth;
    const mid = totalWidth / 2;
    const waistLeftX = mid - waistFlatHalf;
    const waistRightX = mid + waistFlatHalf;
    const c1 = bridgeStart + curveSpread;
    const c2 = bridgeEnd - curveSpread;
    const bottomWaist = totalHeight - waistInset;
    const d = `M0,0 L${bridgeStart},0 C${c1},0 ${c1},${waistInset} ${waistLeftX},${waistInset} ` +
        `L${waistRightX},${waistInset} C${c2},${waistInset} ${c2},0 ${bridgeEnd},0 L${totalWidth},0 ` +
        `L${totalWidth},${totalHeight} L${bridgeEnd},${totalHeight} C${c2},${totalHeight} ${c2},${bottomWaist} ${waistRightX},${bottomWaist} ` +
        `L${waistLeftX},${bottomWaist} C${c1},${bottomWaist} ${c1},${totalHeight} ${bridgeStart},${totalHeight} L0,${totalHeight} Z`;
    return (
        <svg className="cut-guide" viewBox={`0 0 ${totalWidth} ${totalHeight}`} preserveAspectRatio="none">
            <path d={d} fill="none" stroke="#444" strokeWidth="0.2" />
        </svg>
    );
};

const ReporteCodigosQR = () => {
    const navigate = useNavigate();
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('TODOS');
    const [dateFilter, setDateFilter] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [printQuantities, setPrintQuantities] = useState({});
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // NUEVO: Estado para alternar entre A6 (Mini) y A4
    const [paperSize, setPaperSize] = useState('A6');

    const printRef = useRef(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await productosExternosDB.getAllConsolidated();
            const sorted = data.sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB - dateA;
            });
            setProductos(sorted);
        } catch (error) {
            console.error('Error cargando datos:', error);
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    const categorias = ['TODOS', ...new Set(
        productos.map(p => p.categoria || 'OTROS').map(c => c.toUpperCase()).sort()
    )];

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) return prev.filter(i => i !== id);
            setPrintQuantities(prevQ => ({ ...prevQ, [id]: 10 }));
            return [...prev, id];
        });
    };

    const updateQuantity = (id, change) => {
        setPrintQuantities(prev => ({
            ...prev,
            [id]: Math.max(1, (prev[id] || 1) + change)
        }));
    };

    const setTodayFilter = () => setDateFilter(getLocalYYYYMMDD(new Date()));

    const handlePrint = () => {
        if (selectedIds.length === 0) { toast.error('Selecciona al menos un producto'); return; }
        setShowBatchModal(true);
    };

    const confirmPrint = () => {
        setShowBatchModal(false);
        setTimeout(() => {
            window.print();
        }, 500);
    };

    const handleDownloadSheet = async () => {
        if (selectedIds.length === 0) return;
        try {
            setIsDownloading(true);
            const loadingToast = toast.loading(`Preparando imagen ${paperSize}...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            const element = printRef.current;
            const originalClass = element.className;
            element.className = 'print-view-container visible-for-capture';
            const canvas = await html2canvas(element, {
                scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.querySelector('.print-view-container');
                    if (el) el.style.display = 'block';
                }
            });
            element.className = originalClass;
            const link = document.createElement('a');
            link.download = `etiquetas-enigma-${paperSize}-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.dismiss(loadingToast);
            toast.success('Imagen descargada exitosamente');
            setShowBatchModal(false);
        } catch (error) {
            console.error(error);
            toast.error('Error al generar la imagen');
        } finally {
            setIsDownloading(false);
        }
    };

    const filteredProductos = productos.filter(p => {
        const matchesSearch =
            (p.nombre && p.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.codigo_usuario && p.codigo_usuario.toLowerCase().includes(searchTerm.toLowerCase()));
        const pCat = (p.categoria ? p.categoria : 'OTROS').toUpperCase();
        const matchesCategory = categoryFilter === 'TODOS' || pCat === categoryFilter;
        let matchesDate = true;
        if (dateFilter) {
            const pDate = getLocalYYYYMMDD(p.created_at);
            matchesDate = pDate === dateFilter;
        }
        return matchesSearch && matchesCategory && matchesDate;
    });

    const selectedProductsData = productos.filter(p => selectedIds.includes(p.id));

    // Generador de filas adaptativo según el tamaño de papel seleccionado
    const generateRows = () => {
        let rows = [];
        // En A6 (Vertical) entra 1 etiqueta por fila. En A4 entran 3 etiquetas horizontales.
        const maxLabelsPerRow = paperSize === 'A6' ? 1 : 3;

        selectedProductsData.forEach(prod => {
            let labelsLeft = printQuantities[prod.id] || 10;
            while (labelsLeft > 0) {
                const labelsInThisRow = Math.min(labelsLeft, maxLabelsPerRow);
                rows.push({ data: prod, labelCount: labelsInThisRow });
                labelsLeft -= labelsInThisRow;
            }
        });
        return rows;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="max-w-7xl mx-auto mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
                <div className="flex items-center gap-4 w-full lg:w-auto shrink-0">
                    <button onClick={() => navigate('/inventario-home')} className="p-2 bg-white rounded-full shadow hover:bg-gray-50 transition-colors text-gray-600">
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 tracking-tight">
                            <FaBarcode className="text-indigo-600" /> Catálogo de Etiquetas
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">
                            {selectedIds.length} seleccionados · {filteredProductos.length} productos con stock
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
                    <div className="flex items-center bg-white rounded-xl border border-gray-200 p-1 shadow-sm w-full sm:w-auto shrink-0">
                        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                            className="py-1.5 px-3 rounded-lg text-sm text-gray-600 outline-none w-full sm:w-auto cursor-pointer" />
                        <button onClick={setTodayFilter}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-colors ml-1">
                            <FaCalendarDay className="inline mr-1 mb-0.5" /> Hoy
                        </button>
                        {dateFilter && (
                            <button onClick={() => setDateFilter('')} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                <FaTimes />
                            </button>
                        )}
                    </div>

                    <div className="relative w-full sm:w-64 shrink-0">
                        <FaSearch className="absolute left-3 top-3 text-gray-400" />
                        <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none w-full bg-white shadow-sm" />
                    </div>

                    <button onClick={handlePrint} disabled={selectedIds.length === 0}
                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:bg-gray-300 disabled:shadow-none w-full sm:w-auto shrink-0">
                        <FaPrint /> Generar Etiquetas ({selectedIds.length})
                    </button>
                </div>
            </div>

            {/* Filtros Categoría */}
            <div className="max-w-7xl mx-auto mb-6 print:hidden overflow-x-auto pb-2">
                <div className="flex gap-2 min-w-max">
                    {categorias.map(cat => (
                        <button key={cat} onClick={() => setCategoryFilter(cat)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all border ${categoryFilter === cat
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 shadow-sm'}`}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid de Selección */}
            <div className="max-w-7xl mx-auto print:hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredProductos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                        <FaSearch size={40} className="mb-4 text-gray-300" />
                        <p className="font-medium text-lg">No se encontraron productos</p>
                        <p className="text-sm">Intenta borrar los filtros.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredProductos.map((producto) => {
                            const isSelected = selectedIds.includes(producto.id);
                            return (
                                <div key={producto.id} onClick={() => toggleSelect(producto.id)}
                                    className={`relative border-2 rounded-2xl p-4 flex flex-col items-center text-center transition-all cursor-pointer bg-white group ${isSelected ? 'border-indigo-500 shadow-indigo-100 shadow-lg' : 'border-gray-100 hover:border-gray-200'}`}>
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 text-indigo-500 animate-in zoom-in z-10">
                                            <FaCheckCircle size={20} />
                                        </div>
                                    )}
                                    <div className="w-full flex flex-col items-center justify-center min-h-[120px] p-2 gap-2">
                                        <QRCode value={producto.codigo_usuario || String(producto.id)} size={56} level="L" />
                                        <span className="font-bold text-gray-700 text-xs text-center line-clamp-2 leading-tight uppercase">
                                            {producto.nombre}
                                        </span>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full border transition-colors ${isSelected ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                        <span className="font-mono text-[10px] font-bold">{producto.codigo_usuario || 'S/N'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* VISTA DE IMPRESIÓN */}
            <div className={`print-view-container ${isDownloading ? 'visible-for-capture' : ''}`} ref={printRef}>
                <div className="print-page-wrapper">
                    {generateRows().map((row, idx) => {
                        const [codeLine1, codeLine2] = splitCodeForLabel(row.data.codigo_usuario);
                        return (
                            <div key={idx} className="label-row">

                                {/* GUÍA DE REFERENCIA (Izquierda) */}
                                <div className="reference-box">
                                    <span className="ref-text-name">{row.data.nombre}</span>
                                    <span className="ref-text-code">{row.data.codigo_usuario}</span>
                                </div>

                                {/* BANDERINES (1 en A6 / hasta 3 en A4) */}
                                {Array.from({ length: row.labelCount }).map((_, i) => (
                                    <div key={i} className="dumbbell-label">
                                        <CutGuide />

                                        {/* Cara A: QR */}
                                        <div className="label-face label-front">
                                            <div className="qr-wrapper">
                                                <QRCode
                                                    value={row.data.codigo_usuario || String(row.data.id)}
                                                    size={56}
                                                    level="L"
                                                    style={{ width: '100%', height: '100%' }}
                                                    viewBox="0 0 256 256"
                                                />
                                            </div>
                                        </div>

                                        {/* Puente/Cintura */}
                                        <div className="label-bridge" />

                                        {/* Cara B: Código + Precio */}
                                        <div className="label-face label-back">
                                            <div className="code-block">
                                                <span className="code-line">{codeLine1}</span>
                                                {codeLine2 && <span className="code-line">{codeLine2}</span>}
                                            </div>
                                            <div className="price-tag">
                                                S/ {row.data.precio || row.data.precio_venta || '0.00'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal Configuración */}
            {showBatchModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-indigo-600 p-6 text-white relative">
                            <button onClick={() => setShowBatchModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white">
                                <FaTimes size={20} />
                            </button>
                            <h3 className="text-xl font-bold flex items-center gap-2"><FaPrint /> Configurar Lote</h3>
                            <p className="text-indigo-100 text-xs mt-1">{selectedIds.length} productos seleccionados.</p>
                        </div>

                        <div className="p-4 sm:p-6 space-y-5">

                            {/* Selector de Tamaño de Papel */}
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                                    Tamaño de Papel Físico
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaperSize('A6')}
                                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${paperSize === 'A6'
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                            }`}
                                    >
                                        📄 Mini A6 (105x148mm)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaperSize('A4')}
                                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${paperSize === 'A4'
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                            }`}
                                    >
                                        📜 Hoja A4 (210x297mm)
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3">
                                    Cantidades a Imprimir
                                </label>
                                <div className="max-h-[25vh] overflow-y-auto space-y-2.5 pr-1">
                                    {selectedProductsData.map(prod => (
                                        <div key={prod.id} className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                            <div className="flex flex-col items-start min-w-0 pr-2">
                                                <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">{prod.codigo_usuario}</span>
                                                <span className="text-xs text-gray-600 font-medium truncate w-28 sm:w-36 text-left">{prod.nombre}</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button onClick={() => updateQuantity(prod.id, -1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100">
                                                    <FaMinus size={9} />
                                                </button>
                                                <span className="text-sm font-black text-gray-800 w-6 text-center">{printQuantities[prod.id] || 10}</span>
                                                <button onClick={() => updateQuantity(prod.id, 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100">
                                                    <FaPlus size={9} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-3 text-xs text-gray-500 border-t pt-3 text-center">
                                    Total: <strong>{selectedProductsData.reduce((acc, p) => acc + (printQuantities[p.id] || 10), 0)}</strong> etiquetas
                                </p>
                            </div>

                            <button onClick={confirmPrint} disabled={isDownloading}
                                className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:bg-gray-400 text-sm">
                                <FaPrint /> Confirmar e Imprimir ({paperSize})
                            </button>

                            <button onClick={handleDownloadSheet} disabled={isDownloading}
                                className="w-full bg-white border-2 border-indigo-600 text-indigo-600 py-3.5 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                                {isDownloading
                                    ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                    : <FaPrint />}
                                Descargar Hoja (Imagen {paperSize})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ESTILOS CSS ADAPTATIVOS A4 / A6 */}
            <style>{`
                @media screen {
                    .print-view-container { display: none; }
                }

                .print-view-container.visible-for-capture {
                    display: block !important;
                    position: fixed;
                    left: -9999px;
                    top: 0;
                    width: ${paperSize === 'A6' ? '105mm' : '210mm'};
                    background: white !important;
                    z-index: -1;
                    padding: ${paperSize === 'A6' ? '4mm' : '8mm'};
                    box-sizing: border-box;
                }

                @media print {
                    @page { 
                        size: ${paperSize === 'A6' ? 'A6 portrait' : 'A4 portrait'}; 
                        margin: ${paperSize === 'A6' ? '4mm' : '8mm'}; 
                    }
                    body * { 
                        visibility: hidden; 
                    }
                    .print-view-container, .print-view-container * { 
                        visibility: visible; 
                    }
                    .print-view-container { 
                        display: block !important;
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                    }
                }

                .print-page-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5mm;
                    font-family: system-ui, sans-serif;
                }

                .label-row {
                    display: flex;
                    align-items: center;
                    gap: 2mm;
                    page-break-inside: avoid;
                }

                .reference-box {
                    width: 14mm;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    color: #444;
                    border-right: 1px dashed #ccc;
                    padding-right: 1mm;
                    flex-shrink: 0;
                }

                .ref-text-name {
                    font-weight: bold;
                    font-size: 4.5pt;
                    line-height: 1.1;
                    white-space: normal;
                    word-break: break-word;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .ref-text-code {
                    font-family: monospace;
                    font-size: 4pt;
                    line-height: 1;
                    color: #666;
                    word-break: break-word;
                }

                .dumbbell-label {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 50mm;
                    height: 11.4mm;
                    box-sizing: border-box;
                    flex-shrink: 0;
                }

                .cut-guide {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }

                .label-face {
                    position: relative;
                    width: 20mm;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 0.8mm 1mm;
                    box-sizing: border-box;
                }

                .label-front { align-items: flex-start; }
                .label-back { align-items: flex-end; justify-content: space-between; text-align: center; }

                .qr-wrapper { width: 9.8mm; height: 9.8mm; }
                .label-bridge { position: relative; width: 10mm; height: 100%; }

                .code-block {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.3mm;
                    font-family: monospace;
                    font-size: 6pt;
                    font-weight: bold;
                    color: #000;
                    line-height: 1.1;
                }

                .code-line { white-space: nowrap; }

                .price-tag {
                    font-size: 7.5pt;
                    font-weight: 400;
                    color: #000;
                    width: 100%;
                    text-align: right;
                }
            `}</style>
        </div>
    );
};

export default ReporteCodigosQR;