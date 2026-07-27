import React, { useState, useEffect, useMemo } from 'react';
import { produccionDB } from '../../../utils/produccionNeonClient';
import { getLocalDate } from '../../../utils/dateUtils';
import { pedidosDB } from '../../../utils/pedidosNeonClient';
import { productosExternosDB } from '../../../utils/productosExternosNeonClient';
import { dashboardDB } from '../../../utils/dashboardNeonClient';
import { materialesDB } from '../../../utils/materialesNeonClient';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaArrowLeft, FaSave, FaTimes, FaBox, FaMoneyBillWave, FaHammer, FaCheckCircle, FaCamera, FaCheck, FaQrcode, FaExclamationTriangle, FaBan, FaSpinner, FaCalendarAlt, FaCalculator } from 'react-icons/fa';
import QRCode from 'react-qr-code';
import { storage } from '../../../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressAndResizeImage, validateImageFile } from '../../../utils/imageOptimizer';
import { tiposProductoDB } from '../../../utils/tiposProductoDB';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../../components/ui/ConfirmModal';

const Produccion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [produccion, setProduccion] = useState([]);
    const [pedidosPendientes, setPedidosPendientes] = useState([]);
    const [productosEnInventario, setProductosEnInventario] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [filterType, setFilterType] = useState('pedidos');
    const [searchTerm, setSearchTerm] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [stats, setStats] = useState({
        total_registros: 0,
        pendientes: 0,
        en_proceso: 0,
        terminados: 0
    });
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Modal Anulación con Motivo
    const [showAnularModal, setShowAnularModal] = useState(false);
    const [itemToAnular, setItemToAnular] = useState(null);
    const [motivoAnulacion, setMotivoAnulacion] = useState('');

    // Modal Enviar a Stock
    const [showStockModal, setShowStockModal] = useState(false);
    const [stockFormData, setStockFormData] = useState({
        codigo: '',
        lote: '',
        cantidad: '',
        precio: '',
        precioReferencial: '',
        tipo_producto: '',
        metal: ''
    });
    const [sendingToStockItem, setSendingToStockItem] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [tiposProducto, setTiposProducto] = useState([]);
    const [metalesDisponibles, setMetalesDisponibles] = useState([]);
    const [piezasMes, setPiezasMes] = useState(1);

    // Modal Registrar Costos al Finalizar
    const [showCostosModal, setShowCostosModal] = useState(false);
    const [itemToFinish, setItemToFinish] = useState(null);
    const [costosFormData, setCostosFormData] = useState({
        costo_unitario_directo: '',
        costo_insumos_extra: '',
        precio_venta_sugerido: '',
        peso_material_gramos: '',
        horas_trabajo_real: '',
        sueldo_hora_objetivo: '15.00',
        usar_calculo_detallado: false,
        selected_image_file: null,
        preview_image_url: '',
        isPrecioEditadoManualmente: false
    });

    // Estados para el flujo de Foto al Terminar
    const [showPhotoPrompt, setShowPhotoPrompt] = useState(false);
    const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
    const [finishedItemForPhoto, setFinishedItemForPhoto] = useState(null);

    useEffect(() => {
        if (showStockModal || showCostosModal || showDetailModal || showAnularModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showStockModal, showCostosModal, showDetailModal, showAnularModal]);

    const fileInputRef = React.useRef(null);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        icon: null,
        confirmText: '',
        confirmColor: 'blue',
        onConfirm: () => { }
    });

    const initialFormState = {
        tipo_produccion: 'STOCK',
        pedido_id: null,
        metal: '',
        tipo_producto: '',
        nombre_producto: '',
        cantidad: '',
        costo_materiales: '',
        mano_de_obra: '',
        costo_herramientas: '',
        otros_gastos: '',
        costo_insumos_extra: '',
        estado_produccion: 'en_proceso',
        observaciones: '',
        imagen_url: '',
        codigo_producto: '',
        fecha_produccion: getLocalDate(),
        complejidad: 'Media',
        peso_material_gramos: '',
        horas_trabajo_real: '',
        sueldo_hora_objetivo: '15.00',
        es_bisuteria: false,
        costo_empaque: '',
        costo_envio_asumido: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const urlPedidoId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get('pedido');
    }, [location.search]);

    const pedidosFiltradosDropdown = useMemo(() => {
        return pedidosPendientes.filter(prod => {
            if (urlPedidoId) {
                return String(prod.id_pedido) === String(urlPedidoId);
            }
            return true;
        });
    }, [pedidosPendientes, urlPedidoId]);

    useEffect(() => {
        if (urlPedidoId) {
            setFormData(prev => ({ ...prev, tipo_produccion: 'PEDIDO' }));
        }
    }, [urlPedidoId]);

    const urlEditProdId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get('edit_prod');
    }, [location.search]);

    useEffect(() => {
        if (urlEditProdId && produccion.length > 0) {
            const itemToEdit = produccion.find(p => String(p.id_produccion) === String(urlEditProdId));
            if (itemToEdit) {
                setTimeout(() => { handleEdit(itemToEdit); }, 100);
                const newSearchParams = new URLSearchParams(location.search);
                newSearchParams.delete('edit_prod');
                const newSearch = newSearchParams.toString();
                navigate({ search: newSearch ? `?${newSearch}` : '' }, { replace: true });
            }
        }
    }, [urlEditProdId, produccion]);

    useEffect(() => {
        if (urlPedidoId && pedidosPendientes.length > 0) {
            const hasPendingItems = pedidosPendientes.some(p => String(p.id_pedido) === String(urlPedidoId));
            if (!hasPendingItems) {
                toast.success('🎉 Todos los productos de este pedido ya están en producción.');
                const newSearchParams = new URLSearchParams(location.search);
                newSearchParams.delete('pedido');
                const newSearch = newSearchParams.toString();
                navigate({ search: newSearch ? `?${newSearch}` : '' }, { replace: true });
                setFormData(prev => ({ ...prev, tipo_produccion: 'STOCK' }));
            }
        }
    }, [pedidosPendientes, urlPedidoId, navigate, location.search]);

    useEffect(() => {
        fetchProduccion();
        fetchPedidosPendientes();
        fetchStats();
        fetchProductosInventario();
        fetchTiposYMateriales();
        fetchMetales();
        dashboardDB.getPiezasMes().then(setPiezasMes).catch(console.error);
    }, []);

    const fetchMetales = async () => {
        try {
            const data = await materialesDB.getMetales();
            setMetalesDisponibles(data || []);
        } catch (error) { console.error('Error metales:', error); }
    };

    const fetchTiposYMateriales = async () => {
        try {
            const productos = await tiposProductoDB.getAll();
            setTiposProducto(productos || []);
        } catch (error) { console.error('Error tipos:', error); }
    };

    const fetchProduccion = async () => {
        try {
            const data = await produccionDB.getAll();
            setProduccion(data || []);
        } catch (error) { console.error('Error produccion:', error); }
    };

    const fetchPedidosPendientes = async () => {
        try {
            const data = await produccionDB.getPedidosPendientes();
            setPedidosPendientes(data || []);
        } catch (error) { console.error('Error pedidos:', error); }
    };

    const fetchProductosInventario = async () => {
        try {
            const data = await productosExternosDB.getAll();
            setProductosEnInventario(data || []);
        } catch (error) { console.error('Error inventario:', error); }
    };

    const fetchStats = async () => {
        try {
            const data = await produccionDB.getStats();
            setStats(data);
        } catch (error) { console.error('Error stats:', error); }
    };

    // 🔠 AUTOMATIZACIÓN: FORZAR MAYÚSCULAS EN ENTRADA
    const handleChange = (e) => {
        const { name, value } = e.target;
        const camposMayusculas = ['nombre_producto', 'observaciones', 'codigo_producto'];
        const valFinal = camposMayusculas.includes(name) ? value.toUpperCase() : value;

        setFormData(prev => ({
            ...prev,
            [name]: valFinal
        }));
    };

    const handlePedidoSelect = (e) => {
        const value = e.target.value;
        if (!value) {
            setFormData(prev => ({ ...prev, pedido_id: '', nombre_producto: '', cantidad: '', metal: '', tipo_producto: '' }));
            return;
        }

        const [pedidoId, detalleId] = value.split('-');
        const producto = pedidosPendientes.find(p => p.id_pedido == parseInt(pedidoId) && p.id_detalle == parseInt(detalleId));

        if (producto) {
            const detalleBase = producto.nombre_producto || `${producto.tipo_producto} ${producto.metal || ''}`;
            const detalleEnriquecido = `${detalleBase} (Pedido #${producto.id_pedido})`.toUpperCase();

            setFormData(prev => ({
                ...prev,
                pedido_id: value,
                metal: producto.metal || '',
                tipo_producto: producto.tipo_producto || '',
                nombre_producto: detalleEnriquecido,
                cantidad: producto.cantidad
            }));
        }
    };

    const handleEdit = (item) => {
        setEditingId(item.id_produccion);
        setFormData({
            tipo_produccion: item.tipo_produccion || 'STOCK',
            pedido_id: item.pedido_id || '',
            metal: item.metal || 'Plata',
            tipo_producto: item.tipo_producto || 'Anillo',
            nombre_producto: (item.nombre_producto || '').toUpperCase(),
            cantidad: item.cantidad || '',
            costo_materiales: item.costo_materiales || 0,
            mano_de_obra: item.mano_de_obra || 0,
            costo_herramientas: item.costo_herramientas || 0,
            otros_gastos: item.otros_gastos || 0,
            costo_insumos_extra: item.costo_insumos_extra || 0,
            estado_produccion: item.estado_produccion || 'en_proceso',
            observaciones: (item.observaciones || '').toUpperCase(),
            imagen_url: item.imagen_url || '',
            codigo_producto: item.codigo_producto || '',
            fecha_produccion: item.fecha_produccion || getLocalDate(),
            complejidad: item.complejidad || 'Media',
            peso_material_gramos: item.peso_material_gramos || '',
            horas_trabajo_real: item.horas_trabajo_real || '',
            sueldo_hora_objetivo: item.sueldo_hora_objetivo || '15.00',
            es_bisuteria: item.es_bisuteria || false,
            costo_empaque: item.costo_empaque || '',
            costo_envio_asumido: item.costo_envio_asumido || ''
        });
        setShowDatePicker(!!item.fecha_produccion);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleOpenAnularModal = (item) => {
        setItemToAnular(item);
        setMotivoAnulacion('');
        setShowAnularModal(true);
    };

    const handleConfirmAnular = async () => {
        if (!motivoAnulacion.trim()) {
            toast.error('El motivo de anulación es obligatorio');
            return;
        }

        try {
            setLoading(true);
            await produccionDB.anular(itemToAnular.id_produccion, motivoAnulacion.trim().toUpperCase());
            toast.success('Producción anulada correctamente');
            setShowAnularModal(false);
            setItemToAnular(null);
            fetchProduccion();
            fetchStats();
        } catch (error) {
            toast.error('Error al anular: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (item) => {
        if (item.estado_produccion === 'terminado') {
            toast.error('No se puede eliminar un registro terminado. Usa "Anular".');
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: '¿Eliminar Producción en Proceso?',
            message: `¿Estás seguro de eliminar "${item.nombre_producto || item.tipo_producto}"? Esta acción no se puede deshacer.`,
            icon: <FaTrash className="text-red-500" />,
            confirmText: 'Sí, eliminar',
            confirmColor: 'red',
            onConfirm: async () => {
                try {
                    await produccionDB.delete(item.id_produccion);
                    toast.success('Producción eliminada correctamente');
                    fetchProduccion();
                    fetchStats();
                    fetchPedidosPendientes();
                } catch (error) {
                    toast.error('Error al eliminar: ' + error.message);
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleMarkAsComplete = (item) => {
        setItemToFinish(item);
        const cant = parseInt(item.cantidad) || 1;
        const costoUnitActual = item.costo_materiales > 0
            ? (parseFloat(item.costo_materiales) / cant).toFixed(2)
            : '';

        setCostosFormData({
            costo_unitario_directo: costoUnitActual,
            costo_insumos_extra: item.costo_insumos_extra ? String(item.costo_insumos_extra) : '',
            precio_venta_sugerido: item.precio_sugerido ? parseFloat(item.precio_sugerido).toFixed(2) : '',
            peso_material_gramos: item.peso_material_gramos ? String(item.peso_material_gramos) : '',
            horas_trabajo_real: item.horas_trabajo_real ? String(item.horas_trabajo_real) : '',
            sueldo_hora_objetivo: '15.00',
            usar_calculo_detallado: false,
            selected_image_file: null,
            preview_image_url: item.imagen_url || '',
            isPrecioEditadoManualmente: Boolean(item.precio_sugerido)
        });
        setShowCostosModal(true);
    };

    const handleConfirmTerminarWithCostos = async () => {
        if (!itemToFinish) return;

        try {
            setLoading(true);
            let finalImageUrl = itemToFinish.imagen_url || null;

            if (costosFormData.selected_image_file) {
                const optimizedFile = await compressAndResizeImage(costosFormData.selected_image_file, { maxSizeMB: 0.5, maxWidth: 1024, quality: 0.8 });
                const fileExtension = optimizedFile.name?.split('.').pop() || 'jpg';
                const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                const storageRef = ref(storage, `produccion/${uniqueId}.${fileExtension}`);
                await uploadBytes(storageRef, optimizedFile);
                finalImageUrl = await getDownloadURL(storageRef);
            }

            const cantidad = parseInt(itemToFinish.cantidad) || 1;
            let costoMaterialTotal = 0;
            let costoManoObraTotal = 0;
            let costoDesgasteTotal = 0;
            let insumosExtra = parseFloat(costosFormData.costo_insumos_extra) || 0;
            let precioSugerido = parseFloat(costosFormData.precio_venta_sugerido) || 0;

            if (costosFormData.usar_calculo_detallado) {
                const metalSeleccionado = metalesDisponibles.find(m => m.nombre === itemToFinish.metal);
                const precioGramoMetal = metalSeleccionado ? parseFloat(metalSeleccionado.precio_gramo) : 0;
                const peso = parseFloat(costosFormData.peso_material_gramos) || 0;
                const horas = parseFloat(costosFormData.horas_trabajo_real) || 0;
                const sueldoHora = parseFloat(costosFormData.sueldo_hora_objetivo) || 15.00;
                const factores = { 'Baja': 1.0, 'Media': 1.2, 'Alta': 1.5 };
                const factorComplejidad = factores[itemToFinish.complejidad] || 1.2;

                costoMaterialTotal = peso * precioGramoMetal;
                costoManoObraTotal = horas * sueldoHora * factorComplejidad;
                costoDesgasteTotal = (costoMaterialTotal + costoManoObraTotal) * 0.15;
                if (!precioSugerido) {
                    precioSugerido = (((costoMaterialTotal + costoManoObraTotal + costoDesgasteTotal) * 2.0) + (insumosExtra * 1.5)) / cantidad;
                }
            } else {
                const costoUnitarioDirecto = parseFloat(costosFormData.costo_unitario_directo) || 0;
                costoMaterialTotal = (costoUnitarioDirecto * cantidad);
                if (!precioSugerido && costoUnitarioDirecto > 0) {
                    precioSugerido = costoUnitarioDirecto * 2.0;
                }
            }

            await produccionDB.updateCostosReales(itemToFinish.id_produccion, {
                peso_material_gramos: parseFloat(costosFormData.peso_material_gramos) || 0,
                horas_trabajo_real: parseFloat(costosFormData.horas_trabajo_real) || 0,
                costo_insumos_extra: insumosExtra,
                costo_materiales: costoMaterialTotal,
                mano_de_obra: costoManoObraTotal,
                costo_herramientas: costoDesgasteTotal,
                precio_sugerido: precioSugerido,
                imagen_url: finalImageUrl
            });

            await produccionDB.updateEstado(itemToFinish.id_produccion, 'terminado');

            if (itemToFinish.tipo_produccion === 'STOCK') {
                await produccionDB.marcarPendienteInventario(itemToFinish.id_produccion);
                toast.success('✅ Producción terminada. Quedó lista para ingreso en Inventario.');
            } else {
                toast.success('✅ Producción de pedido terminada correctamente.');
            }

            fetchProduccion();
            fetchStats();
            setShowCostosModal(false);
            setItemToFinish(null);
        } catch (error) {
            toast.error('Error al terminar producción: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (item) => {
        setSelectedItem(item);
        setShowDetailModal(true);
    };

    const resetForm = () => {
        setFormData({ ...initialFormState, tipo_produccion: urlPedidoId ? 'PEDIDO' : 'STOCK' });
        setEditingId(null);
        setShowDatePicker(false);
    };

    // 🛠️ SUBMIT CORREGIDO
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingId) {
                const payload = {
                    metal: formData.metal,
                    tipo_producto: formData.tipo_producto,
                    nombre_producto: formData.nombre_producto.toUpperCase(),
                    cantidad: parseInt(formData.cantidad),
                    costo_materiales: parseFloat(formData.costo_materiales) || 0,
                    mano_de_obra: parseFloat(formData.mano_de_obra) || 0,
                    costo_herramientas: parseFloat(formData.costo_herramientas) || 0,
                    otros_gastos: parseFloat(formData.otros_gastos) || 0,
                    costo_insumos_extra: parseFloat(formData.costo_insumos_extra) || 0,
                    estado_produccion: formData.estado_produccion,
                    observaciones: (formData.observaciones || '').toUpperCase(),
                    imagen_url: formData.imagen_url,
                    codigo_producto: formData.codigo_producto,
                    fecha_produccion: formData.fecha_produccion,
                    complejidad: formData.complejidad,
                    precio_sugerido: parseFloat(formData.precio_sugerido) || 0,
                    peso_material_gramos: parseFloat(formData.peso_material_gramos) || 0,
                    horas_trabajo_real: parseFloat(formData.horas_trabajo_real) || 0,
                    sueldo_hora_objetivo: parseFloat(formData.sueldo_hora_objetivo) || 15.00
                };

                await produccionDB.update(editingId, payload);
                toast.success('Producción actualizada correctamente');
            } else {
                let pedidoIdToSave = formData.pedido_id ? parseInt(String(formData.pedido_id).split('-')[0]) : null;

                const payload = {
                    pedido_id: pedidoIdToSave,
                    tipo_produccion: formData.tipo_produccion,
                    metal: formData.metal,
                    tipo_producto: formData.tipo_producto,
                    nombre_producto: formData.nombre_producto.toUpperCase(),
                    cantidad: parseInt(formData.cantidad),
                    costo_materiales: 0,
                    mano_de_obra: 0,
                    costo_herramientas: 0,
                    otros_gastos: 0,
                    costo_insumos_extra: 0,
                    estado_produccion: formData.estado_produccion,
                    observaciones: (formData.observaciones || '').toUpperCase(),
                    imagen_url: formData.imagen_url,
                    codigo_producto: formData.codigo_producto,
                    fecha_produccion: formData.fecha_produccion,
                    complejidad: formData.complejidad,
                    precio_sugerido: 0,
                    peso_material_gramos: 0,
                    horas_trabajo_real: 0,
                    sueldo_hora_objetivo: 15.00
                };

                await produccionDB.create(payload);
                toast.success('Producción guardada correctamente');
            }

            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 2000);

            resetForm();
            fetchProduccion();
            fetchStats();
            fetchPedidosPendientes();

        } catch (error) {
            toast.error('Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoLoteStock = async () => {
        if (!stockFormData.tipo_producto || !stockFormData.metal) {
            toast.error("Falta Tipo de Producto o Metal");
            return;
        }
        try {
            const data = await productosExternosDB.getNextLote(stockFormData.tipo_producto, stockFormData.metal);
            setStockFormData(prev => ({ ...prev, codigo: data.codigoUnico, lote: data.nextLote }));
        } catch (err) {
            toast.error("Error generando Auto Lote");
        }
    };

    const handleConfirmSendToStock = async (e) => {
        e.preventDefault();
        if (!stockFormData.codigo || !stockFormData.cantidad) {
            toast.error('Código y Cantidad obligatorios');
            return;
        }

        setLoading(true);
        try {
            const result = await productosExternosDB.enviarAStock({
                codigo: stockFormData.codigo,
                cantidad: parseInt(stockFormData.cantidad),
                precio: stockFormData.precio ? parseFloat(stockFormData.precio) : null,
                precioReferencial: stockFormData.precioReferencial ? parseFloat(stockFormData.precioReferencial) : null,
                produccionId: sendingToStockItem.id_produccion,
                codigo_produccion: sendingToStockItem.codigo_correlativo || `PR-${String(sendingToStockItem.id_produccion).padStart(4, '0')}`,
                tipo_producto: stockFormData.tipo_producto,
                costo: parseFloat(sendingToStockItem.costo_total_unitario) || 0,
                nombre: (sendingToStockItem.nombre_producto || `${stockFormData.tipo_producto} - ${stockFormData.codigo}`).toUpperCase(),
                material: sendingToStockItem.metal || '',
                lote: stockFormData.lote || null,
                imagen_url: sendingToStockItem.imagen_url || null
            });

            if (result) {
                await produccionDB.markAsTransferred(sendingToStockItem.id_produccion, result.id);
            }

            toast.success('Producto enviado a stock correctamente');
            setShowStockModal(false);
            fetchProduccion();
            fetchProductosInventario();
        } catch (error) {
            toast.error('Error al ingresar stock: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [filterType, searchTerm]);

    const filteredProduccion = produccion.filter(p => {
        const isActive = p.estado_produccion !== 'anulado' && (p.estado_produccion !== 'terminado' || p.pendiente_inventario);
        if (!isActive) return false;

        let matchesType = true;
        if (filterType === 'stock') matchesType = p.tipo_produccion === 'STOCK';
        if (filterType === 'pedidos') matchesType = p.tipo_produccion === 'PEDIDO';

        let matchesSearch = true;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            matchesSearch =
                p.nombre_producto?.toLowerCase().includes(term) ||
                p.metal?.toLowerCase().includes(term) ||
                p.tipo_producto?.toLowerCase().includes(term) ||
                p.nombre_cliente?.toLowerCase().includes(term);
        }
        return matchesType && matchesSearch;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredProduccion.length / itemsPerPage);
    const paginatedProduccion = filteredProduccion.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const calculoAvanzadoLive = useMemo(() => {
        if (!itemToFinish) return { costoTotalCalculado: 0, costoUnitarioCalculado: 0, costoMetal: 0, costoManoObra: 0, costoDesgaste: 0 };
        const cantidad = parseInt(itemToFinish.cantidad) || 1;
        const metalSeleccionado = metalesDisponibles.find(m => m.nombre === itemToFinish.metal);
        const precioGramo = metalSeleccionado ? parseFloat(metalSeleccionado.precio_gramo) : 0;
        const peso = parseFloat(costosFormData.peso_material_gramos) || 0;
        const horas = parseFloat(costosFormData.horas_trabajo_real) || 0;
        const sueldoHora = parseFloat(costosFormData.sueldo_hora_objetivo) || 15.00;
        const factores = { 'Baja': 1.0, 'Media': 1.2, 'Alta': 1.5 };
        const factorComplejidad = factores[itemToFinish.complejidad] || 1.2;

        const costoMetal = peso * precioGramo;
        const costoManoObra = horas * sueldoHora * factorComplejidad;
        const costoDesgaste = (costoMetal + costoManoObra) * 0.15;
        const costoTotalCalculado = costoMetal + costoManoObra + costoDesgaste;
        const costoUnitarioCalculado = costoTotalCalculado / cantidad;

        return { costoMetal, costoManoObra, costoDesgaste, costoTotalCalculado, costoUnitarioCalculado };
    }, [itemToFinish, costosFormData.peso_material_gramos, costosFormData.horas_trabajo_real, costosFormData.sueldo_hora_objetivo, metalesDisponibles]);

    return (
        <div className="container mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <Link to="/inventario-home" className="flex items-center text-gray-600 hover:text-blue-600 transition-colors w-fit">
                    <FaArrowLeft className="mr-2" />
                    <span className="font-medium">Enigma Sistema ERP</span>
                </Link>
            </div>

            {/* Formulario */}
            <div className="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8 max-w-4xl mx-auto">
                <div className="flex justify-between items-center border-b pb-4 mb-6">
                    <h2 className="text-2xl md:text-3xl font-medium text-gray-800">
                        {editingId ? 'Editar Producción' : 'Nueva Producción'}
                    </h2>
                    {editingId && (
                        <button onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                            <FaTimes size={14} /> Cancelar
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!editingId && (
                        <div className="flex flex-col gap-2">
                            {urlPedidoId ? (
                                <div className="w-full py-3 px-4 rounded-lg bg-amber-500 text-white font-semibold text-center cursor-not-allowed opacity-90">
                                    📋 Producción para Pedido
                                </div>
                            ) : (
                                <div className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold text-center">
                                    📦 Producción
                                </div>
                            )}
                        </div>
                    )}

                    {formData.tipo_produccion === 'PEDIDO' && !editingId && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Seleccionar Producto del Pedido</label>
                            <select
                                value={formData.pedido_id || ''}
                                onChange={handlePedidoSelect}
                                className="w-full text-xs md:text-sm rounded-md border-gray-300 shadow-sm border p-2"
                                required
                            >
                                <option value="">-- Selecciona un producto --</option>
                                {pedidosFiltradosDropdown.map(prod => (
                                    <option key={`${prod.id_pedido}-${prod.id_detalle}`} value={`${prod.id_pedido}-${prod.id_detalle}`}>
                                        #{prod.id_pedido} - {prod.nombre_cliente} - {prod.nombre_producto} (Cant: {prod.cantidad})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FaBox className="text-purple-600" />
                                Producto a fabricar
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className={`p-1.5 rounded-full transition-colors ${showDatePicker ? 'bg-purple-600 text-white' : 'text-purple-600 hover:bg-purple-100'}`}
                                title="Cambiar fecha de producción"
                            >
                                <FaCalendarAlt size={14} />
                            </button>
                        </h3>

                        {showDatePicker && (
                            <div className="mb-4 bg-white p-3 rounded-lg border border-purple-200 animate-in fade-in">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha de Producción (Manual)</label>
                                <input
                                    type="date"
                                    name="fecha_produccion"
                                    className="w-full rounded-md border-gray-300 border p-2 text-sm"
                                    value={formData.fecha_produccion}
                                    onChange={handleChange}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Producto *</label>
                                <select
                                    name="tipo_producto"
                                    className="w-full rounded-md border-gray-300 border p-2 text-sm bg-white"
                                    value={formData.tipo_producto}
                                    onChange={handleChange}
                                    disabled={formData.tipo_produccion === 'PEDIDO'}
                                    required
                                >
                                    <option value="">-- Selecciona producto --</option>
                                    {tiposProducto.map(t => <option key={t.id || t.nombre} value={t.nombre}>{t.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Metal *</label>
                                <select
                                    name="metal"
                                    className="w-full rounded-md border-gray-300 border p-2 text-sm bg-white"
                                    value={formData.metal}
                                    onChange={handleChange}
                                    disabled={formData.tipo_produccion === 'PEDIDO'}
                                    required
                                >
                                    <option value="">-- Selecciona metal --</option>
                                    {metalesDisponibles.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Complejidad *</label>
                                <select
                                    name="complejidad"
                                    className="w-full rounded-md border-gray-300 border p-2 text-sm bg-white"
                                    value={formData.complejidad}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="Media">Media (Estándar)</option>
                                    <option value="Alta">Alta (+20% Tiempo)</option>
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    {formData.tipo_produccion === 'PEDIDO' ? 'Detalle (Generado Automáticamente)' : 'Detalle para taller *'}
                                </label>
                                <textarea
                                    name="nombre_producto"
                                    rows="2"
                                    className="w-full rounded-md border-gray-300 border p-2 text-sm uppercase font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="EJ: ANILLO ARIETE - PLATA - TALLA 8"
                                    value={formData.nombre_producto}
                                    onChange={handleChange}
                                    required={formData.tipo_produccion === 'STOCK'}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad *</label>
                                <input
                                    type="number"
                                    name="cantidad"
                                    min="1"
                                    className="w-full rounded-md border-gray-300 border p-2 text-sm"
                                    value={formData.cantidad}
                                    onChange={handleChange}
                                    readOnly={formData.tipo_produccion === 'PEDIDO'}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                        <textarea
                            name="observaciones"
                            rows="2"
                            className="w-full rounded-md border-gray-300 border p-2 text-sm uppercase"
                            value={formData.observaciones}
                            onChange={handleChange}
                            placeholder="Notas internas del taller"
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'} flex justify-center items-center gap-2`}
                        >
                            <FaSave />
                            {loading ? 'Guardando...' : (editingId ? 'Actualizar Producción' : 'Guardar producción')}
                        </button>
                    </div>
                </form>
            </div>

            {/* Tabla de Registros */}
            <div className="bg-white shadow-lg rounded-lg p-6 max-w-7xl mx-auto">
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Registros de Producción</h3>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="flex space-x-2">
                        <button onClick={() => setFilterType('pedidos')} className={`px-4 py-2 rounded-md text-sm font-medium ${filterType === 'pedidos' ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Pedidos</button>
                        <button onClick={() => setFilterType('stock')} className={`px-4 py-2 rounded-md text-sm font-medium ${filterType === 'stock' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Stock</button>
                        <button onClick={() => setFilterType('todos')} className={`px-4 py-2 rounded-md text-sm font-medium ${filterType === 'todos' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Todos</button>
                    </div>

                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-64 rounded-md border-gray-300 border p-2 text-sm"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr className="h-[48px]">
                                <th className="px-3 text-left text-[11px] font-semibold text-gray-400 uppercase">Origen</th>
                                <th className="px-3 text-left text-[11px] font-semibold text-gray-400 uppercase">Cliente</th>
                                <th className="px-3 text-left text-[11px] font-semibold text-gray-400 uppercase">Producto</th>
                                <th className="hidden md:table-cell px-3 text-center text-[11px] font-semibold text-gray-400 uppercase">Cant</th>
                                <th className="px-3 text-center text-[11px] font-semibold text-gray-400 uppercase">Est.</th>
                                <th className="px-3 text-right text-[11px] font-semibold text-gray-400 uppercase">Fecha</th>
                                <th className="px-3 text-right text-[11px] font-semibold text-gray-400 uppercase w-[140px]">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {paginatedProduccion.map((item) => (
                                <tr key={item.id_produccion} className="h-[64px] hover:bg-gray-50/50 transition-colors">
                                    <td className="px-3 whitespace-nowrap">
                                        {item.pedido_id ? (
                                            <span className="px-2 py-0.5 rounded text-[11px] bg-amber-50 text-amber-600 border border-amber-100">Ped #{item.pedido_id}</span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-[11px] bg-gray-50 text-gray-500 border border-gray-200">Stock</span>
                                        )}
                                    </td>

                                    <td className="px-3 whitespace-nowrap text-sm text-gray-600">
                                        {item.nombre_cliente ? item.nombre_cliente.split(' ')[0] : '-'}
                                    </td>

                                    <td className="px-3 py-2 text-sm text-gray-800 font-bold uppercase">
                                        {item.nombre_producto || `${item.tipo_producto} – ${item.metal}`}
                                    </td>

                                    <td className="hidden md:table-cell px-3 text-center text-sm text-gray-600">{item.cantidad}u</td>

                                    <td className="px-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.estado_produccion === 'terminado' ? 'bg-green-100 text-green-700' :
                                            item.estado_produccion === 'anulado' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                            {item.estado_produccion.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </td>

                                    <td className="px-3 text-right text-xs text-gray-500">
                                        {new Date(item.fecha_produccion || item.created_at).toLocaleDateString('es-PE')}
                                    </td>

                                    <td className="px-3 text-right whitespace-nowrap">
                                        <div className="flex justify-end items-center gap-1">
                                            {item.estado_produccion === 'en_proceso' && (
                                                <>
                                                    <button
                                                        onClick={() => handleMarkAsComplete(item)}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full"
                                                        title="Finalizar fabricación"
                                                    >
                                                        <FaCheckCircle size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"
                                                        title="Editar registro"
                                                    >
                                                        <FaEdit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        className="p-2 text-red-400 hover:bg-red-50 rounded-full"
                                                        title="Eliminar registro"
                                                    >
                                                        <FaTrash size={14} />
                                                    </button>
                                                </>
                                            )}

                                            {item.estado_produccion === 'terminado' && (
                                                <>
                                                    <button onClick={() => handleView(item)} className="p-2 text-gray-400 hover:text-blue-600 rounded-full" title="Ver detalle">
                                                        <span className="text-xl">👁️</span>
                                                    </button>
                                                    <button onClick={() => handleOpenAnularModal(item)} className="p-2 text-gray-400 hover:text-amber-600 rounded-full" title="Anular">
                                                        <FaBan size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Anular */}
            {showAnularModal && itemToAnular && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
                        <div className="bg-amber-500 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2 text-base"><FaBan /> Anular Producción</h3>
                            <button onClick={() => setShowAnularModal(false)} className="text-white/80 hover:text-white"><FaTimes size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-gray-600">
                                Vas a marcar como <strong>ANULADO</strong> el registro: <br />
                                <span className="font-bold text-gray-800">{itemToAnular.nombre_producto || itemToAnular.tipo_producto}</span>.
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Motivo de anulación *</label>
                                <textarea
                                    rows="3" required
                                    placeholder="EJ: CANCELADO POR CLIENTE / ERROR EN TALLER"
                                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs uppercase focus:ring-2 focus:ring-amber-500 outline-none"
                                    value={motivoAnulacion}
                                    onChange={(e) => setMotivoAnulacion(e.target.value.toUpperCase())}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowAnularModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs">Cancelar</button>
                                <button type="button" onClick={handleConfirmAnular} disabled={loading} className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-xs">{loading ? 'Procesando...' : 'Confirmar Anulación'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Enviar a Stock */}
            {showStockModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <FaBox /> Enviar a Stock
                            </h3>
                            <p className="text-blue-100 text-sm mt-1">
                                Incrementa el stock de un producto existente en el inventario.
                            </p>
                        </div>

                        <div className="bg-blue-50 px-6 py-2 border-b border-blue-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Producto:</span>
                            <span className="text-sm font-semibold text-blue-900">{stockFormData.tipo_producto}</span>
                        </div>

                        <form onSubmit={handleConfirmSendToStock} className="p-6 space-y-4">
                            <div className="flex gap-4 items-start">
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Código QR / Único *</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <FaQrcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                                    placeholder="Ej: AN-ALP-L001"
                                                    value={stockFormData.codigo}
                                                    onChange={(e) => setStockFormData({ ...stockFormData, codigo: e.target.value.toUpperCase() })}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAutoLoteStock}
                                                className="px-3 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center justify-center gap-1"
                                            >
                                                Auto Lote
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Lote (Manual / Auto)</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm uppercase"
                                            placeholder="Ej: L001"
                                            value={stockFormData.lote || ''}
                                            onChange={(e) => setStockFormData({ ...stockFormData, lote: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                </div>
                                <div className="w-24 h-24 bg-white p-2 border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                    {stockFormData.codigo ? (
                                        <QRCode value={stockFormData.codigo} size={80} className="w-full h-full" />
                                    ) : (
                                        <div className="text-[10px] text-gray-400 text-center">Sin código</div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cantidad *</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                    value={stockFormData.cantidad}
                                    onChange={(e) => setStockFormData({ ...stockFormData, cantidad: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Precio de Venta</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                        placeholder="0.00"
                                        value={stockFormData.precio}
                                        onChange={(e) => setStockFormData({ ...stockFormData, precio: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Precio Opcional</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="0.00"
                                        value={stockFormData.precioReferencial}
                                        onChange={(e) => setStockFormData({ ...stockFormData, precioReferencial: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowStockModal(false)}
                                    className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                                >
                                    {loading ? 'PROCESANDO...' : 'CONFIRMAR'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Registrar Costos al Finalizar */}
            {showCostosModal && itemToFinish && (() => {
                const cantidad = parseInt(itemToFinish.cantidad) || 1;
                const costoUnitario = parseFloat(costosFormData.costo_unitario_directo) || 0;
                const nombreProducto = (itemToFinish.nombre_producto || `${itemToFinish.tipo_producto} · ${itemToFinish.metal}`).toUpperCase();

                return (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] max-h-[92vh] overflow-hidden flex flex-col border border-gray-100">
                            <div className="bg-slate-900 px-5 py-4 text-white flex justify-between items-start flex-shrink-0">
                                <div>
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-0.5">Finalizar Fabricación</span>
                                    <h3 className="text-sm font-bold tracking-wide">{nombreProducto}</h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] uppercase">{itemToFinish.metal}</span>
                                        <span className="px-2 py-0.5 bg-white/10 rounded text-[10px]">{cantidad} pieza(s)</span>
                                    </div>
                                </div>
                                <button onClick={() => { setShowCostosModal(false); setItemToFinish(null); }} className="text-gray-400 hover:text-white"><FaTimes size={16} /></button>
                            </div>

                            <div className="p-4 space-y-4 overflow-y-auto flex-1">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><FaCamera size={10} /> Foto del producto terminado</label>
                                    <label className="block cursor-pointer">
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setCostosFormData(prev => ({ ...prev, selected_image_file: file, preview_image_url: URL.createObjectURL(file) }));
                                        }} />
                                        {costosFormData.preview_image_url ? (
                                            <div className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-200 h-32">
                                                <img src={costosFormData.preview_image_url} alt="Vista Previa" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition py-4 flex flex-col items-center justify-center gap-1">
                                                <FaCamera className="text-gray-400" size={16} />
                                                <span className="text-xs text-gray-400 font-medium">Subir foto del terminado</span>
                                            </div>
                                        )}
                                    </label>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[11px] text-gray-700 font-semibold mb-1">Costo Unitario por Pieza (S/)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">S/</span>
                                            <input
                                                type="number" step="0.50" min="0" placeholder="0.00"
                                                value={costosFormData.costo_unitario_directo}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const numVal = parseFloat(val) || 0;
                                                    setCostosFormData(prev => ({
                                                        ...prev,
                                                        costo_unitario_directo: val,
                                                        precio_venta_sugerido: !prev.isPrecioEditadoManualmente && numVal > 0 ? (numVal * 2).toFixed(2) : prev.precio_venta_sugerido
                                                    }));
                                                }}
                                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-800 text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] text-gray-600 font-semibold mb-1">Insumos Extra / Piedras (S/)</label>
                                        <input
                                            type="number" step="0.50" placeholder="0.00"
                                            value={costosFormData.costo_insumos_extra}
                                            onChange={(e) => setCostosFormData(prev => ({ ...prev, costo_insumos_extra: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setCostosFormData(prev => ({ ...prev, usar_calculo_detallado: !prev.usar_calculo_detallado }))}
                                        className="flex items-center gap-2 text-[11px] text-indigo-600 font-bold hover:underline pt-1"
                                    >
                                        <FaCalculator /> Calcular por Peso (g) y Horas de Trabajo
                                    </button>

                                    {costosFormData.usar_calculo_detallado && (
                                        <div className="bg-indigo-50/70 rounded-xl p-3 border border-indigo-100 space-y-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-[10px] text-indigo-800 font-bold mb-1">Peso (g)</label>
                                                    <input
                                                        type="number" step="0.01" placeholder="0.00"
                                                        value={costosFormData.peso_material_gramos}
                                                        onChange={(e) => setCostosFormData(prev => ({ ...prev, peso_material_gramos: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs bg-white font-bold"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-indigo-800 font-bold mb-1">Tiempo (Horas)</label>
                                                    <input
                                                        type="number" step="0.5" placeholder="0.0"
                                                        value={costosFormData.horas_trabajo_real}
                                                        onChange={(e) => setCostosFormData(prev => ({ ...prev, horas_trabajo_real: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs bg-white font-bold"
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-lg p-2.5 border border-indigo-100 text-[10px] space-y-1">
                                                <div className="flex justify-between text-gray-500">
                                                    <span>Metal ({itemToFinish.metal}):</span>
                                                    <span className="font-semibold">S/ {calculoAvanzadoLive.costoMetal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-500">
                                                    <span>Mano de Obra + Desgaste:</span>
                                                    <span className="font-semibold">S/ {(calculoAvanzadoLive.costoManoObra + calculoAvanzadoLive.costoDesgaste).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-indigo-900 font-bold border-t pt-1">
                                                    <span>Costo Unitario Resultante:</span>
                                                    <span className="text-xs">S/ {calculoAvanzadoLive.costoUnitarioCalculado.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const res = calculoAvanzadoLive.costoUnitarioCalculado.toFixed(2);
                                                    setCostosFormData(prev => ({
                                                        ...prev,
                                                        costo_unitario_directo: res,
                                                        precio_venta_sugerido: !prev.isPrecioEditadoManualmente ? (parseFloat(res) * 2).toFixed(2) : prev.precio_venta_sugerido
                                                    }));
                                                    toast.success('Costo aplicado al registro');
                                                }}
                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] tracking-wider uppercase"
                                            >
                                                Aplicar costo al registro
                                            </button>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Precio de Venta Sugerido (S/)</label>
                                        <input
                                            type="number" step="0.50" placeholder="0.00"
                                            value={costosFormData.precio_venta_sugerido}
                                            onChange={(e) => setCostosFormData(prev => ({
                                                ...prev,
                                                precio_venta_sugerido: e.target.value,
                                                isPrecioEditadoManualmente: true
                                            }))}
                                            className="w-full px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50/50 font-bold text-amber-900 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* FOOTER BOTÓN VERDE CORREGIDO */}
                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => { setShowCostosModal(false); setItemToFinish(null); }}
                                    className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={handleConfirmTerminarWithCostos}
                                    disabled={loading}
                                    className="flex-[2] py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <FaSpinner className="animate-spin text-white" size={14} />
                                            <span className="text-white font-bold">Procesando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaCheck className="text-white" size={16} />
                                            <span className="text-white font-extrabold drop-shadow-sm">Confirmar y Finalizar</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal Detalle Histórico */}
            {showDetailModal && selectedItem && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[340px] overflow-hidden flex flex-col border border-gray-100">
                        <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase">Detalle Histórico</h3>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes size={14} />
                            </button>
                        </div>

                        <div className="p-4 space-y-3 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 font-bold uppercase">Estado</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedItem.estado_produccion === 'terminado' ? 'bg-green-100 text-green-700' :
                                        selectedItem.estado_produccion === 'anulado' ? 'bg-red-100 text-red-700' :
                                            'bg-amber-100 text-amber-700'
                                    }`}>
                                    {selectedItem.estado_produccion.toUpperCase()}
                                </span>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-gray-900 uppercase">{selectedItem.nombre_producto || selectedItem.tipo_producto}</h4>
                                <p className="text-gray-500 uppercase">{selectedItem.metal} · {selectedItem.cantidad} unidades</p>
                            </div>

                            {selectedItem.estado_produccion === 'anulado' && selectedItem.motivo_anulacion && (
                                <div className="bg-red-50 p-2.5 rounded-lg border border-red-100">
                                    <span className="font-bold text-red-700 block text-[10px] uppercase mb-0.5">Motivo de Anulación:</span>
                                    <p className="text-red-900 italic text-xs uppercase">"{selectedItem.motivo_anulacion}"</p>
                                </div>
                            )}

                            <div className="bg-gray-50 p-2.5 rounded-lg space-y-1">
                                <div className="flex justify-between">
                                    <span>Costo Unitario:</span>
                                    <span className="font-bold">S/ {parseFloat(selectedItem.costo_total_unitario || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Costo Total Lote:</span>
                                    <span className="font-bold text-blue-600">S/ {parseFloat(selectedItem.costo_total_produccion || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-gray-50 border-t flex justify-end">
                            <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-gray-800 text-white font-bold rounded-lg text-xs uppercase">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                confirmColor={confirmModal.confirmColor}
                icon={confirmModal.icon}
            />

            <Toaster position="top-right" />
        </div>
    );
};

export default Produccion;