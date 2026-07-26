import React, { useState, useEffect, useMemo } from 'react';
import { produccionDB } from '../../../utils/produccionNeonClient';
import { getLocalDate } from '../../../utils/dateUtils';
import { pedidosDB } from '../../../utils/pedidosNeonClient';
import { productosExternosDB } from '../../../utils/productosExternosNeonClient';
import { dashboardDB } from '../../../utils/dashboardNeonClient';
import { materialesDB } from '../../../utils/materialesNeonClient';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaArrowLeft, FaSave, FaTimes, FaBox, FaMoneyBillWave, FaHammer, FaCheckCircle, FaCamera, FaCheck, FaQrcode, FaExclamationTriangle, FaBan, FaSpinner, FaCalendarAlt } from 'react-icons/fa';
import QRCode from 'react-qr-code';
import { storage } from '../../../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { compressAndResizeImage, validateImageFile } from '../../../utils/imageOptimizer';
import { tiposProductoDB } from '../../../utils/tiposProductoDB';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import Tooltip from '../../../components/ui/Tooltip';
import StockIngressModal from '../components/StockIngressModal';


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
    const [uploadingId, setUploadingId] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [qrData, setQrData] = useState({
        codigo: '',
        nombre: '',
        categoria: ''
    });

    // Nuevo estado para modal "Enviar a Stock" (Lógica Simplificada)
    const [showStockModal, setShowStockModal] = useState(false);
    const [stockFormData, setStockFormData] = useState({
        codigo: '',
        cantidad: '',
        precio: '',
        precioReferencial: '',
        tipo_producto: ''
    });
    const [sendingToStockItem, setSendingToStockItem] = useState(null);
    const [currentPage, setCurrentPage] = useState(1); // Estado para paginación
    const [tiposProducto, setTiposProducto] = useState([]);
    const [metalesDisponibles, setMetalesDisponibles] = useState([]);
    // Modal de ingreso a stock desde producción STOCK
    const [showStockIngressModal, setShowStockIngressModal] = useState(false);
    const [finishedStockItem, setFinishedStockItem] = useState(null);
    const [piezasMes, setPiezasMes] = useState(1);
    
    // Estados para el Modal de Registrar Costos al Finalizar
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
        preview_image_url: ''
    });

    // Bloquear scroll cuando el modal está abierto
    useEffect(() => {
        if (showStockModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showStockModal]);

    const fileInputRef = React.useRef(null);

    // Estado para Confirm Modal
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        icon: null,
        confirmText: '',
        confirmColor: 'blue',
        onConfirm: () => { }
    });

    // Estado inicial del formulario
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
        estado_produccion: 'en_proceso', // Valor por defecto automatico
        observaciones: '',
        imagen_url: '', // Nuevo campo imagen
        codigo_producto: '', // Nuevo campo codigo
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

    // Derivar parámetro de URL de forma reactiva
    const urlPedidoId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get('pedido');
    }, [location.search]);

    const pedidosFiltradosDropdown = useMemo(() => {
        return pedidosPendientes.filter(prod => {
            if (urlPedidoId) {
                // Comparación robusta (ambos a String)
                return String(prod.id_pedido) === String(urlPedidoId);
            }
            return true;
        });
    }, [pedidosPendientes, urlPedidoId]);

    // Efecto para manejar parámetro de URL ?pedido=ID
    useEffect(() => {
        if (urlPedidoId) {
            setFormData(prev => ({
                ...prev,
                tipo_produccion: 'PEDIDO'
            }));
        }
    }, [urlPedidoId, location.search, pedidosFiltradosDropdown.length]); // Dependencia simplificada

    // Parámetro para edición automática (redirigido desde Pedidos)
    const urlEditProdId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get('edit_prod');
    }, [location.search]);

    // Efecto para entrar en modo edición automáticamente si viene de Pedidos
    useEffect(() => {
        if (urlEditProdId && produccion.length > 0) {
            const itemToEdit = produccion.find(p => String(p.id_produccion) === String(urlEditProdId));
            if (itemToEdit) {
                // Pequeño delay para asegurar que el scroll y el estado estén listos
                setTimeout(() => {
                    handleEdit(itemToEdit);
                }, 100);

                // Limpiar el parámetro de la URL para evitar re-ediciones accidentales al recargar
                const newSearchParams = new URLSearchParams(location.search);
                newSearchParams.delete('edit_prod');
                const newSearch = newSearchParams.toString();
                navigate({ search: newSearch ? `?${newSearch}` : '' }, { replace: true });
            }
        }
    }, [urlEditProdId, produccion]);

    // NUEVO: Efecto para detectar cuando un pedido ha sido completamente ingresado
    useEffect(() => {
        // Solo verificamos si ha terminado de cargar pendientes y tenemos un pedido específico
        if (urlPedidoId && pedidosPendientes.length > 0) {
            const hasPendingItems = pedidosPendientes.some(p => String(p.id_pedido) === String(urlPedidoId));

            if (!hasPendingItems) {
                toast.success('🎉 Todos los productos de este pedido ya están en producción.', {
                    duration: 5000,
                    icon: '✅'
                });

                // Limpiar URL
                const newSearchParams = new URLSearchParams(location.search);
                newSearchParams.delete('pedido');
                const newSearch = newSearchParams.toString();
                navigate({ search: newSearch ? `?${newSearch}` : '' }, { replace: true });

                // Regresar a tipo STOCK
                setFormData(prev => ({
                    ...prev,
                    tipo_produccion: 'STOCK'
                }));
            }
        }
    }, [pedidosPendientes, urlPedidoId, navigate, location.search]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleTipoChange = (tipo) => {
        setFormData(prev => ({
            ...prev,
            tipo_produccion: tipo,
            pedido_id: ''
        }));
    };

    const handlePedidoSelect = (e) => {
        const value = e.target.value;
        if (!value) {
            setFormData(prev => ({
                ...prev,
                pedido_id: '',
                nombre_producto: '',
                cantidad: '',
                metal: '',
                tipo_producto: ''
            }));
            return;
        }

        // Parsear formato: "pedidoId-detalleId"
        const [pedidoId, detalleId] = value.split('-');
        const producto = pedidosPendientes.find(p =>
            p.id_pedido == parseInt(pedidoId) && p.id_detalle == parseInt(detalleId)
        );

        if (producto) {
            // CONSTRUCCIÓN DEL DETALLE ENRIQUECIDO REQUERIDO: Si ya tiene el tipo/metal en el nombre, no lo repetimos demasiado
            const detalleBase = producto.nombre_producto || `${producto.tipo_producto} ${producto.metal || ''}`;
            const detalleEnriquecido = `${detalleBase} (Pedido #${producto.id_pedido})`;

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

    // Estados para el flujo de Foto al Terminar
    const [showPhotoPrompt, setShowPhotoPrompt] = useState(false);
    const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
    const [finishedItemForPhoto, setFinishedItemForPhoto] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false); // Estado para Modal Detalle


    const handleEdit = (item) => {
        setEditingId(item.id_produccion);
        setFormData({
            tipo_produccion: item.tipo_produccion || 'STOCK',
            pedido_id: item.pedido_id || '',
            metal: item.metal || 'Plata',
            tipo_producto: item.tipo_producto || 'Anillo',
            nombre_producto: item.nombre_producto || '',
            cantidad: item.cantidad || '',
            costo_materiales: item.costo_materiales || '',
            mano_de_obra: item.mano_de_obra || '',
            costo_herramientas: item.costo_herramientas || '',
            otros_gastos: item.otros_gastos || '',
            costo_insumos_extra: item.costo_insumos_extra || '',
            estado_produccion: item.estado_produccion || 'pendiente',
            observaciones: item.observaciones || '',
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

    const handleAnular = (item) => {
        setConfirmModal({
            isOpen: true,
            title: 'Anular Producción',
            message: `¿Estás seguro de anular esta producción? El registro se marcará como "Anulado" y permanecerá en el historial.`,
            icon: <FaBan />,
            confirmText: 'Sí, anular',
            confirmColor: 'yellow',
            onConfirm: async () => {
                try {
                    await produccionDB.anular(item.id_produccion);
                    toast.success('Producción anulada correctamente');
                    fetchProduccion();
                    fetchStats();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    console.error('Error al anular:', error);
                    toast.error('Error al anular: ' + error.message);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleDelete = (item) => {
        // Verificar restricciones
        if (item.estado_produccion === 'terminado') {
            toast.error('No se puede eliminar un registro terminado. Usa "Anular" en su lugar.');
            return;
        }

        if (item.transferido_inventario) {
            toast.error('No se puede eliminar: el registro ya fue transferido al inventario.');
            return;
        }

        // NUEVA LÓGICA: Si es un pedido y está en proceso, permitir eliminación total
        if (item.pedido_id && item.estado_produccion === 'en_proceso') {
            setConfirmModal({
                isOpen: true,
                title: '⚠️ ¿ELIMINAR PEDIDO COMPLETO?',
                message: 'Esta acción eliminará definitivamente el pedido y toda su información (Pagos, Producción, Detalles). Esta acción no se puede deshacer.',
                icon: <FaExclamationTriangle className="text-red-500" />,
                confirmText: 'SÍ, ELIMINAR TODO',
                confirmColor: 'red',
                onConfirm: async () => {
                    setLoading(true);
                    try {
                        await pedidosDB.eliminarPedidoCompleto(item.pedido_id);
                        toast.success('Pedido y toda su información eliminada correctamente');
                        fetchProduccion();
                        fetchStats();
                        fetchPedidosPendientes();
                    } catch (error) {
                        console.error('Error al eliminar pedido completo:', error);
                        toast.error('Error al eliminar: ' + error.message);
                    } finally {
                        setLoading(false);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }
                }
            });
            return;
        }

        if (item.pedido_id) {
            toast.error('No se puede eliminar: el registro está asociado a un pedido.');
            return;
        }

        // Si es STOCK normal
        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Producción',
            message: '¿Estás seguro? Esta acción no se puede deshacer y el registro será eliminado permanentemente.',
            icon: <FaTrash />,
            confirmText: 'Sí, eliminar',
            confirmColor: 'red',
            onConfirm: async () => {
                try {
                    await produccionDB.delete(item.id_produccion);
                    toast.success('Producción eliminada correctamente');
                    fetchProduccion();
                    fetchStats();
                    fetchPedidosPendientes();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    console.error('Error al eliminar:', error);
                    toast.error('Error al eliminar: ' + error.message);
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
            preview_image_url: item.imagen_url || ''
        });
        setShowCostosModal(true);
    };

    const handleConfirmTerminarWithCostos = async () => {
        if (!itemToFinish) return;

        try {
            setLoading(true);
            let finalImageUrl = itemToFinish.imagen_url || null;

            // Subir imagen si se seleccionó un archivo nuevo en el modal
            if (costosFormData.selected_image_file) {
                const optimizedFile = await compressAndResizeImage(costosFormData.selected_image_file, {
                    maxSizeMB: 0.5,
                    maxWidth: 1024,
                    quality: 0.8
                });
                const fileExtension = optimizedFile.name?.split('.').pop() || 'jpg';
                const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                const fileName = `produccion/${uniqueId}.${fileExtension}`;
                const storageRef = ref(storage, fileName);
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
                // Ingreso Directo de Costo Unitario
                const costoUnitarioDirecto = parseFloat(costosFormData.costo_unitario_directo) || 0;
                costoMaterialTotal = (costoUnitarioDirecto * cantidad);
                if (!precioSugerido && costoUnitarioDirecto > 0) {
                    precioSugerido = costoUnitarioDirecto * 2.0; // Margen comercial objetivo x2
                }
            }

            // 1. Guardar costos reales e imagen en la base de datos
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

            // 2. Marcar estado a terminado
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
            console.error('Error al terminar producción:', error);
            toast.error('Error al guardar y terminar: ' + (error.message || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    };

    // Handlers para el flujo de Foto Post-Terminado
    const handlePhotoPromptConfirm = () => {
        setShowPhotoPrompt(false);
        // Abrir modal de subida real
        setShowPhotoUploadModal(true);
    };

    const handlePhotoPromptCancel = () => {
        setShowPhotoPrompt(false);
        setFinishedItemForPhoto(null);
    };

    const handlePhotoUpload = async (file) => {
        if (!finishedItemForPhoto || !file) return;

        setUploadingImage(true);
        try {
            // Reutilizar lógica de compresión
            const optimizedFile = await compressAndResizeImage(file, {
                maxSizeMB: 0.5,
                maxWidth: 1024,
                quality: 0.8
            });

            const fileExtension = optimizedFile.name?.split('.').pop() || 'jpg';
            const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const fileName = `produccion/${uniqueId}.${fileExtension}`;

            const storageRef = ref(storage, fileName);
            await uploadBytes(storageRef, optimizedFile);
            const downloadURL = await getDownloadURL(storageRef);

            // Actualizar registro en DB
            await produccionDB.update(finishedItemForPhoto.id_produccion, {
                // Recuperamos campos obligatorios del item si es necesario, 
                // o usamos un método patch si lo tuviéramos. 
                // produccionDB.update espera un objeto completo o parcial?
                // Revisando produccionNeonClient.js: update hace UPDATE SET ... todos los campos.
                // ¡CUIDADO! produccionDB.update espera TODOS los campos porque usa `produccionData.metal`, etc.
                // Si paso solo imagen_url, los otros pueden ser undefined/null y borrar datos.
                // Necesito obtener el item actualizado completo o usar un método específico para imagen.

                // SOLUCIÓN: Usaré update pasando los valores existentes del item.
                ...finishedItemForPhoto,
                estado_produccion: 'terminado', // Asegurar
                imagen_url: downloadURL
            });

            toast.success('Foto subida y guardada');
            setShowPhotoUploadModal(false);
            setFinishedItemForPhoto(null);
            fetchProduccion();

        } catch (error) {
            console.error('Error subiendo foto final:', error);
            toast.error('Error al subir foto: ' + error.message);
        } finally {
            setUploadingImage(false);
        }
    };

    // Handlers de Imagen y QR
    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar
        const validation = validateImageFile(file, 5); // Max 5MB
        if (!validation.valid) {
            toast.error(validation.error);
            return;
        }

        setUploadingImage(true);
        try {
            // Comprimir
            const optimizedFile = await compressAndResizeImage(file, {
                maxSizeMB: 0.5,
                maxWidth: 1024,
                quality: 0.8
            });

            // Subir a Firebase con nombre único
            const fileExtension = optimizedFile.name?.split('.').pop() || 'jpg';
            const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const fileName = `produccion/${uniqueId}.${fileExtension}`;

            const storageRef = ref(storage, fileName);
            await uploadBytes(storageRef, optimizedFile);
            const downloadURL = await getDownloadURL(storageRef);

            setFormData(prev => ({
                ...prev,
                imagen_url: downloadURL
            }));
            toast.success('Imagen subida correctamente');

        } catch (error) {
            console.error('Error al subir imagen:', error);
            // Mostrar error más descriptivo
            const errorMsg = error.code === 'storage/unauthorized'
                ? 'Error de permisos en Firebase. Revisa las reglas de Storage.'
                : error.message || 'Error desconocido al subir la imagen';
            toast.error(`Error: ${errorMsg}`);
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({ ...prev, imagen_url: '' }));
    };

    const handleView = (item) => {
        setSelectedItem(item);
        setShowDetailModal(true);
    };

    const handleEditingFromDetail = (item) => {
        handleEdit(item);
    };

    const handleDeleteCompleted = async (id) => {
        if (!window.confirm('⚠️ ADVERTENCIA: Estás eliminando una producción terminada.\n\nEsto puede afectar el inventario.\n\n¿Estás seguro?')) return;

        try {
            await produccionDB.delete(id);
            toast.success('Registro eliminado correctamente');
            fetchProduccion();
            fetchStats();
            fetchPedidosPendientes();
            setMessage(null);
        } catch (error) {
            console.error('Error al eliminar:', error);
            toast.error('Error al eliminar: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            tipo_produccion: urlPedidoId ? 'PEDIDO' : 'STOCK',
            pedido_id: '',
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
        });
        setEditingId(null);
        setShowDatePicker(false);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (editingId) {
                const payload = {
                    metal: formData.metal,
                    tipo_producto: formData.tipo_producto,
                    nombre_producto: formData.nombre_producto,
                    cantidad: parseInt(formData.cantidad),
                    costo_materiales: 0,
                    mano_de_obra: 0,
                    costo_herramientas: 0,
                    otros_gastos: 0,
                    costo_insumos_extra: 0,
                    estado_produccion: formData.estado_produccion,
                    observaciones: formData.observaciones,
                    imagen_url: formData.imagen_url,
                    codigo_producto: formData.codigo_producto,
                    fecha_produccion: formData.fecha_produccion,
                    complejidad: formData.complejidad,
                    precio_sugerido: 0,
                    peso_material_gramos: 0,
                    horas_trabajo_real: 0,
                    sueldo_hora_objetivo: 15.00,
                    es_bisuteria: false,
                    costo_empaque: 0,
                    costo_envio_asumido: 0
                };

                await produccionDB.update(editingId, payload);

                setShowSuccessModal(true);
                setTimeout(() => setShowSuccessModal(false), 3000);
            } else {
                // Extraer solo el id_pedido del valor compuesto "pedidoId-detalleId"
                let pedidoIdToSave = null;
                if (formData.pedido_id) {
                    const parts = String(formData.pedido_id).split('-');
                    pedidoIdToSave = parseInt(parts[0]) || null;
                }

                const payload = {
                    pedido_id: pedidoIdToSave,
                    tipo_produccion: formData.tipo_produccion,
                    metal: formData.metal,
                    tipo_producto: formData.tipo_producto,
                    nombre_producto: formData.nombre_producto,
                    cantidad: parseInt(formData.cantidad),
                    costo_materiales: 0,
                    mano_de_obra: 0,
                    costo_herramientas: 0,
                    otros_gastos: 0,
                    costo_insumos_extra: 0,
                    estado_produccion: formData.estado_produccion,
                    observaciones: formData.observaciones,
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

                setShowSuccessModal(true);
                setTimeout(() => setShowSuccessModal(false), 3000);
            }

            setTimeout(() => {
                resetForm();
                fetchProduccion();
                fetchStats();
                fetchPedidosPendientes();
                setMessage(null);
            }, 1500);

        } catch (error) {
            console.error('Error al guardar:', error);
            setMessage({ type: 'error', text: 'Error al guardar: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

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
        } catch (error) {
            console.error('Error al cargar metales:', error);
        }
    };

    const fetchTiposYMateriales = async () => {
        try {
            const [productos] = await Promise.all([
                tiposProductoDB.getAll()
            ]);
            setTiposProducto(productos || []);
        } catch (error) {
            console.error('Error al cargar tipos:', error);
        }
    };

    const fetchProduccion = async () => {
        try {
            const data = await produccionDB.getAll();
            setProduccion(data || []);
        } catch (error) {
            console.error('Error al cargar producción:', error);
        }
    };

    const fetchPedidosPendientes = async () => {
        try {
            const data = await produccionDB.getPedidosPendientes();
            setPedidosPendientes(data || []);
        } catch (error) {
            console.error('Error al cargar pedidos pendientes:', error);
        }
    };

    const fetchProductosInventario = async () => {
        try {
            const data = await productosExternosDB.getAll();
            setProductosEnInventario(data || []);
        } catch (error) {
            console.error('Error al cargar inventario:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const data = await produccionDB.getStats();
            setStats(data);
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        }
    };

    // Paginación y Filtrado
    useEffect(() => {
        setCurrentPage(1);
    }, [filterType, searchTerm]);

    const filteredProduccion = produccion.filter(p => {
        // Solo mostrar registros activos (en proceso, o terminados pendientes de inventario)
        // Los terminados ingresados al inventario y anulados van al Reporte de Producción (Historial)
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

        const matchesYear = true;

        return matchesType && matchesSearch && matchesYear;
    }).sort((a, b) => {
        const dateA = new Date(a.fecha_produccion || a.created_at);
        const dateB = new Date(b.fecha_produccion || b.created_at);
        return dateB - dateA;
    });

    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredProduccion.length / itemsPerPage);
    const paginatedProduccion = filteredProduccion.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleTerminar = async (item) => {
        if (!window.confirm(`¿Confirmar que la producción de "${item.nombre_producto}" ha finalizado?`)) return;

        try {
            await produccionDB.updateEstado(item.id_produccion, 'terminado');
            toast.success('Producción marcada como terminada');
            resetForm();
            setMessage(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            fetchData();

            // Disparar flujo de subida de fotos AUTOMÁTICAMENTE para pedidos
            if (item.tipo_produccion === 'PEDIDO' && !item.imagen_url) {
                setFinishedItemForPhoto(item);
                setShowPhotoUploadModal(true);
            }
        } catch (error) {
            console.error('Error al terminar producción:', error);
            toast.error('Error al actualizar el estado: ' + error.message);
        }
    };

    // Funciones de QR eliminadas - ahora se manejan en ProductoForm

    // Helper: Verificar si un producto de producción ya está en el inventario
    const isProductInInventory = (produccionItem) => {
        // Verificar por código si existe
        if (produccionItem.codigo_producto) {
            const existePorCodigo = productosEnInventario.some(p => p.codigo_usuario === produccionItem.codigo_producto);
            if (existePorCodigo) return true;
        }

        // Verificar por nombre (normalizado para comparación)
        if (produccionItem.nombre_producto) {
            const nombreProduccion = produccionItem.nombre_producto.toLowerCase().trim();
            const existePorNombre = productosEnInventario.some(p => {
                const nombreInventario = p.nombre?.toLowerCase().trim();
                return nombreInventario === nombreProduccion;
            });
            if (existePorNombre) return true;
        }

        return false;
    };

    const handleSendToInventory = async (item) => {
        let suggestedCode = item.codigo_producto;
        let suggestedLote = '';

        if (!suggestedCode) {
            try {
                const data = await productosExternosDB.getNextLote(item.tipo_producto, item.metal);
                suggestedCode = data.codigoUnico;
                suggestedLote = data.nextLote;
            } catch (err) {
                console.error("Error auto-lote:", err);
                const typePrefix = (item.tipo_producto || 'PROD').substring(0, 3).toUpperCase();
                suggestedCode = `${typePrefix}-ERR`;
            }
        }

        setSendingToStockItem(item);
        setStockFormData({
            codigo: suggestedCode,
            lote: suggestedLote,
            cantidad: item.cantidad || '',
            precio: '',
            precioReferencial: '',
            tipo_producto: item.tipo_producto || '',
            metal: item.metal || ''
        });
        setShowStockModal(true);
    };

    const handleAutoLoteStock = async () => {
        if (!stockFormData.tipo_producto || !stockFormData.metal) {
            toast.error("Falta Tipo de Producto o Metal para generar Lote");
            return;
        }
        try {
            const data = await productosExternosDB.getNextLote(stockFormData.tipo_producto, stockFormData.metal);
            setStockFormData(prev => ({
                ...prev,
                codigo: data.codigoUnico,
                lote: data.nextLote
            }));
        } catch (err) {
            toast.error("Error generando Auto Lote");
        }
    };

    const handleConfirmSendToStock = async (e) => {
        e.preventDefault();
        if (!stockFormData.codigo || !stockFormData.cantidad) {
            toast.error('Código y Cantidad son obligatorios');
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
                costo: parseFloat(sendingToStockItem.costo_total_unitario) || 0, // Pasar el costo calculado
                nombre: sendingToStockItem.nombre_producto || `${stockFormData.tipo_producto} - ${stockFormData.codigo}`,
                material: sendingToStockItem.metal || '', // Nuevo campo
                lote: stockFormData.lote || null,
                imagen_url: sendingToStockItem.imagen_url || null // Pasar imagen si existe
            });

            // Marcar el registro de producción como transferido en la base de datos
            if (result) {
                await produccionDB.markAsTransferred(sendingToStockItem.id_produccion, result.id);
            }

            toast.success('Producto enviado a stock correctamente');
            setShowStockModal(false);
            fetchProduccion();
            fetchProductosInventario();
        } catch (error) {
            console.error('Error al enviar a stock:', error);
            toast.error(error.message || 'Error al procesar el ingreso a stock');
        } finally {
            setLoading(false);
        }
    };

    // Lógica de Cálculo Parametrizado (useMemo)
    const calculosProduccion = useMemo(() => {
        const cantidad = parseInt(formData.cantidad) || 1;
        const metalSeleccionado = metalesDisponibles.find(m => m.nombre === formData.metal);
        const precioGramoMetal = metalSeleccionado ? parseFloat(metalSeleccionado.precio_gramo) : 0;

        // 1. CÁLCULOS TOTALES DEL LOTE (Basado en los inputs)
        const costoMetalTotal = (parseFloat(formData.peso_material_gramos) || 0) * precioGramoMetal;
        
        const factores = { 'Baja': 1.0, 'Media': 1.2, 'Alta': 1.5 };
        const factorComplejidad = factores[formData.complejidad] || 1.2;
        const costoManoObraTotal = (parseFloat(formData.horas_trabajo_real) || 0) * (parseFloat(formData.sueldo_hora_objetivo) || 15) * factorComplejidad;
        
        const costoDesgasteTotal = (costoMetalTotal + costoManoObraTotal) * 0.15;
        const costoInsumosExtraTotal = parseFloat(formData.costo_insumos_extra) || 0;

        const costoTotalProduccion = costoMetalTotal + costoManoObraTotal + costoDesgasteTotal + costoInsumosExtraTotal;

        // 2. CÁLCULOS UNITARIOS (Para 1 sola pieza)
        const costoMetal = costoMetalTotal / cantidad;
        const costoManoObra = costoManoObraTotal / cantidad;
        const costoDesgaste = costoDesgasteTotal / cantidad;
        const costoInsumosExtra = costoInsumosExtraTotal / cantidad;
        const costoTotalUnitario = costoTotalProduccion / cantidad;

        // Estrategia doble margen aplicada a 1 sola pieza
        const precioSugerido = ((costoMetal + costoManoObra + costoDesgaste) * 2.0) + (costoInsumosExtra * 1.5);

        return {
            costoMetal, costoManoObra, costoDesgaste, costoInsumosExtra, costoTotalUnitario, precioSugerido,
            costoMetalTotal, costoManoObraTotal, costoDesgasteTotal, costoInsumosExtraTotal, costoTotalProduccion, cantidad
        };
    }, [formData, metalesDisponibles]);

    const { costoTotalUnitario, precioSugerido, costoTotalProduccion } = calculosProduccion;



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
                    <div>
                        <h2 className="text-2xl md:text-3xl font-medium text-gray-800">
                            {editingId ? 'Editar Producción' : 'Nueva Producción'}
                        </h2>
                    </div>
                    {editingId && (
                        <button onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                            <FaTimes size={14} /> Cancelar
                        </button>
                    )}
                </div>

                {message && (
                    <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text- red-700'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Selector de Tipo */}
                    {!editingId && (
                        <div className="flex flex-col gap-2">
                            {/* Mostrar botón informativo según contexto */}
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

                    {/* Selector de Pedido (si tipo = PEDIDO) */}
                    {formData.tipo_produccion === 'PEDIDO' && !editingId && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Seleccionar Producto del Pedido</label>
                            <select
                                value={formData.pedido_id}
                                onChange={handlePedidoSelect}
                                className="w-full text-xs md:text-sm lg:text-base rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 border p-2"
                                disabled={pedidosFiltradosDropdown.length === 0}
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

                    {/* Datos del Producto */}
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
                            <div className="mb-4 bg-white p-3 rounded-lg border border-purple-200 animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha de Producción (Manual)</label>
                                <input
                                    type="date"
                                    name="fecha_produccion"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 border p-2 text-sm"
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
                                    className={`w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 border p-2 ${formData.tipo_produccion === 'PEDIDO' ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''}`}
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
                                    className={`w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 border p-2 ${formData.tipo_produccion === 'PEDIDO' ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''}`}
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
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 border p-2 bg-white"
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
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 border p-2 text-sm"
                                    placeholder="Ej: Anillo Ariete - plata - talla 8 - grabado simple"
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
                                    className={`w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 border p-2 ${formData.tipo_produccion === 'PEDIDO' ? 'bg-gray-100 cursor-not-allowed text-gray-600 select-none pointer-events-none' : ''}`}
                                    value={formData.cantidad}
                                    onChange={handleChange}
                                    readOnly={formData.tipo_produccion === 'PEDIDO'}
                                    tabIndex={formData.tipo_produccion === 'PEDIDO' ? -1 : 0}
                                    required
                                />
                            </div>

                        </div>
                    </div>

                    {/* Observaciones */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                        <textarea
                            name="observaciones"
                            rows="2"
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            value={formData.observaciones}
                            onChange={handleChange}
                            placeholder="Notas internas del taller"
                        />
                    </div>

                    {/* Sección de imagen eliminada - no es necesaria */}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white ${editingId
                                ? 'bg-amber-600 hover:bg-amber-700'
                                : 'bg-purple-600 hover:bg-purple-700'
                                } ${loading ? 'opacity-50 cursor-not-allowed' : ''} flex justify-center items-center gap-2`}
                        >
                            <FaSave />
                            {loading ? 'Guardando...' : (editingId ? 'Actualizar Producción' : 'Guardar producción')}
                        </button>
                    </div>
                </form>
            </div >

            {/* Lista de Producción */}
            < div className="bg-white shadow-lg rounded-lg p-6 max-w-7xl mx-auto" >
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Registros de Producción</h3>

                {/* Filtros */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setFilterType('pedidos')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filterType === 'pedidos' ? 'bg-amber-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            Pedidos
                        </button>
                        <button
                            onClick={() => setFilterType('stock')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filterType === 'stock' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            Stock
                        </button>
                        <button
                            onClick={() => setFilterType('todos')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filterType === 'todos' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            Todos
                        </button>
                    </div>

                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr className="h-[48px]">
                                <th className="px-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider align-middle">Origen</th>
                                <th className="px-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider align-middle">Nombre</th>
                                <th className="px-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider align-middle min-w-[180px] md:min-w-[220px]">Producto</th>
                                <th className="hidden md:table-cell px-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider align-middle">Cant</th>
                                <th className="px-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider align-middle">Est.</th>
                                <th className="px-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider align-middle">Fecha</th>
                                <th className="px-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider align-middle w-[140px] md:w-[130px]">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {paginatedProduccion.map((item) => (
                                <tr key={item.id_produccion} className="h-[75px] md:h-[64px] hover:bg-gray-50/50 transition-colors group">
                                    {/* 1. Origen - Primera columna */}
                                    <td className="px-3 whitespace-nowrap align-middle">
                                        {item.pedido_id ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-normal bg-amber-50 text-amber-600 border border-amber-100">
                                                Ped #{item.pedido_id}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-normal bg-gray-50 text-gray-500 border border-gray-200">
                                                Stock
                                            </span>
                                        )}
                                    </td>

                                    {/* 1.5 Nombre del Cliente (Solo primer nombre para pedidos) */}
                                    <td className="px-3 whitespace-nowrap align-middle">
                                        <span className="text-[14px] text-gray-500 font-normal capitalize">
                                            {item.pedido_id && item.nombre_cliente ? item.nombre_cliente.trim().split(' ')[0].toLowerCase() : '-'}
                                        </span>
                                    </td>

                                    <td className="px-3 align-middle py-3">
                                        <div className="text-[14px] text-gray-700 font-normal leading-tight whitespace-nowrap">
                                            {item.tipo_producto} – {item.metal}
                                        </div>
                                        {/* Cantidad siempre debajo en responsive (dos filas) */}
                                        <div className="md:hidden text-[12px] text-gray-400 font-medium mt-1.5 flex items-center">
                                            <span>{item.cantidad}u</span>
                                        </div>
                                    </td>

                                    {/* 3. Cant - Desktop */}
                                    <td className="hidden md:table-cell px-3 text-center text-[13px] text-gray-500 font-normal align-middle">
                                        {item.cantidad}u
                                    </td>

                                    {/* 4. Estado - Icono solamente */}
                                    <td className="px-3 text-center align-middle">
                                        <div className="flex justify-center">
                                            {item.estado_produccion === 'terminado' && !item.pendiente_inventario ? (
                                                <div className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-green-50 flex items-center justify-center text-green-500 border border-green-100" title="Terminado">
                                                    <FaCheck size={14} className="md:w-3.5" />
                                                </div>
                                            ) : item.estado_produccion === 'terminado' && item.pendiente_inventario ? (
                                                <div className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-200 shadow-sm" title="Terminado - Pendiente de Stock">
                                                    <FaBox size={12} className="md:w-3" />
                                                </div>
                                            ) : item.estado_produccion === 'anulado' ? (
                                                <div className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100" title="Anulado">
                                                    <FaBan size={14} className="md:w-3.5" />
                                                </div>
                                            ) : (
                                                <div className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100" title="En proceso">
                                                    <span className="text-sm md:text-xs animate-pulse">⏳</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* 5. Fecha - Solo una (Inicio o Fin) */}
                                    <td className="px-3 text-right whitespace-nowrap align-middle">
                                        <div className="text-[12px] md:text-[11px] text-gray-500 font-normal">
                                            {(() => {
                                                const dateStr = item.estado_produccion === 'terminado' ? (item.fecha_produccion || item.created_at) : item.created_at;
                                                if (!dateStr) return '-';
                                                const date = new Date(dateStr.toString().includes('T') ? dateStr : dateStr + 'T20:00:00');
                                                return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
                                            })()}
                                        </div>
                                    </td>

                                    {/* 6. Acciones - Iconos solamente */}
                                    <td className="px-3 text-right whitespace-nowrap align-middle">
                                        <div className="flex justify-end items-center gap-1 md:gap-2">
                                            {/* Terminar Directo - Solo si está en proceso */}
                                            {item.estado_produccion === 'en_proceso' && (
                                                <button
                                                    onClick={() => handleMarkAsComplete(item)}
                                                    className="w-[44px] h-[44px] md:w-[40px] md:h-[40px] flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full transition-all"
                                                    title="Finalizar fabricación y registrar costo/foto"
                                                >
                                                    <FaCheckCircle size={22} className="md:w-5 md:h-5 text-emerald-500 hover:scale-110 transition-transform" />
                                                </button>
                                            )}

                                            {/* Ver Detalle */}
                                            <button
                                                onClick={() => handleView(item)}
                                                className="w-[44px] h-[44px] md:w-[40px] md:h-[40px] flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                                                title="Ver detalle"
                                            >
                                                <span className="text-[26px] md:text-[24px]">👁️</span>
                                            </button>

                                            {/* Anular - Solo si terminado */}
                                            {item.estado_produccion === 'terminado' && (
                                                <button
                                                    onClick={() => handleAnular(item)}
                                                    className="w-[44px] h-[44px] md:w-[40px] md:h-[40px] flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                    title="Anular"
                                                >
                                                    <FaBan size={22} className="md:w-6 md:h-6" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredProduccion.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No se encontraron registros de producción.
                        </div>
                    ) : (
                        /* Paginación */
                        <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 px-4 py-3 border-t border-gray-200 mt-2 rounded-b-lg gap-4">
                            <div className="text-xs text-gray-500 font-medium">
                                Mostrando <span className="text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="text-gray-800">{Math.min(currentPage * itemsPerPage, filteredProduccion.length)}</span> de <span className="text-gray-800 font-bold">{filteredProduccion.length}</span> registros
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-bold hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    Anterior
                                </button>

                                <div className="flex items-center justify-center px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
                                    Página {currentPage} de {totalPages}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-bold hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div >





            {/* Modal de éxito */}
            {
                showSuccessModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg p-8 shadow-2xl max-w-sm w-full mx-4 animate-bounce">
                            <div className="flex flex-col items-center">
                                <FaCheckCircle className="text-green-500 text-6xl mb-4" />
                                <h3 className="text-2xl font-bold text-gray-800 text-center">
                                    PRODUCCIÓN GUARDADA
                                </h3>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Enviar a Stock (Simplificado) */}
            {
                showStockModal && (
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
                                                        className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-mono text-sm"
                                                        placeholder="Ej: AN-ALP-L001"
                                                        value={stockFormData.codigo}
                                                        onChange={(e) => setStockFormData({ ...stockFormData, codigo: e.target.value.toUpperCase() })}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleAutoLoteStock}
                                                    className="px-3 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm whitespace-nowrap whitespace-nowrap flex items-center justify-center gap-1"
                                                >
                                                    Auto Lote
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Lote (Manual / Auto)</label>
                                            <input
                                                type="text"
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-mono text-sm"
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

                                {/* Aviso informativo si el código no existe */}
                                {stockFormData.codigo && !productosEnInventario.some(p => p.codigo_usuario === stockFormData.codigo) && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3 animate-pulse">
                                        <FaExclamationTriangle className="text-amber-500 mt-1 shrink-0" />
                                        <div className="text-xs text-amber-800">
                                            <p className="font-bold uppercase mb-0.5">Nuevo Producto Detectado</p>
                                            <p>El código <strong>{stockFormData.codigo}</strong> no existe. Se creará un nuevo registro en el inventario al confirmar.</p>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cantidad *</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
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
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
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
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
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
                                        className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {loading ? 'PROCESANDO...' : 'CONFIRMAR'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Modal de Confirmación */}
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

            {/* Toast Notifications */}
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                    success: {
                        duration: 3000,
                        iconTheme: {
                            primary: '#10b981',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        duration: 4000,
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                        },
                    },
                }}
            />
            {/* Modal Prompt Foto Terminado */}
            {
                showPhotoPrompt && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                <FaCamera />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Subir foto del producto?</h3>
                            <p className="text-gray-500 mb-6 text-sm">
                                El producto ha sido marcado como <strong>TERMINADO</strong>. <br />
                                ¿Deseas agregar una foto del resultado final ahora?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handlePhotoPromptCancel}
                                    className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition"
                                >
                                    No, gracias
                                </button>
                                <button
                                    onClick={handlePhotoPromptConfirm}
                                    className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                                >
                                    Sí, subir foto
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Subida de Foto Final */}
            {
                showPhotoUploadModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
                            {/* Header con gradiente rojo/naranja */}
                            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 text-white flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <FaCamera /> Agregar Foto
                                    </h3>
                                    <p className="text-xs text-white/80 mt-1 max-w-[250px] truncate">
                                        {finishedItemForPhoto?.nombre_producto || finishedItemForPhoto?.tipo_producto || 'Producto finalizado'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowPhotoUploadModal(false)}
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                {/* Zona de Drop/Click */}
                                <div
                                    className="border-2 border-dashed border-orange-200 bg-orange-50/30 rounded-xl h-48 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-orange-50 transition-colors group relative"
                                    onClick={() => !uploadingImage && document.getElementById('final-photo-input').click()}
                                >
                                    <input
                                        id="final-photo-input"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files[0]) handlePhotoUpload(e.target.files[0]);
                                        }}
                                        disabled={uploadingImage}
                                    />
                                    {uploadingImage ? (
                                        <div className="animate-pulse flex flex-col items-center justify-center w-full h-full bg-white/80 absolute inset-0 z-10">
                                            <FaSpinner className="animate-spin text-orange-500 text-3xl mb-2" />
                                            <span className="text-orange-600 font-bold text-sm">Subiendo foto...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <FaCamera size={24} />
                                            </div>
                                            <span className="text-gray-600 font-medium text-sm">Haz clic para subir imagen</span>
                                            <span className="text-gray-400 text-xs mt-1">JPG, PNG • Máx 5MB</span>
                                        </>
                                    )}
                                </div>

                                {/* Warning Box */}
                                <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-lg p-3 flex gap-3 items-start">
                                    <FaExclamationTriangle className="text-amber-500 mt-0.5 shrink-0" size={14} />
                                    <div className="text-xs text-amber-800">
                                        <span className="font-bold block mb-0.5">Finalización de Proceso</span>
                                        La foto se asociará a este registro y será visible en el detalle del producto terminado.
                                    </div>
                                </div>

                                {/* Botón Cancelar */}
                                <button
                                    onClick={() => setShowPhotoUploadModal(false)}
                                    className="w-full mt-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg text-sm uppercase tracking-wide transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Detalle de Producción - Refinado y Minimalista */}
            {
                showDetailModal && selectedItem && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[340px] overflow-hidden flex flex-col max-h-[85vh] border border-white/20">
                            {/* Header Comprimido */}
                            <div className="px-4 py-3 flex justify-between items-center border-b border-gray-50 bg-white sticky top-0 z-10">
                                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none">Detalle de Registro</h3>
                                <button onClick={() => setShowDetailModal(false)} className="text-gray-300 hover:text-gray-600 p-1 transition-colors">
                                    <FaTimes size={14} />
                                </button>
                            </div>

                            {/* Contenido con Scroll Slim */}
                            <div className="overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {/* Imagen si existe */}
                                {selectedItem.imagen_url && (
                                    <div className="relative group rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                        <img
                                            src={selectedItem.imagen_url}
                                            alt="Producto"
                                            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-[8px] rounded-md font-bold uppercase tracking-wider backdrop-blur-sm">
                                            Referencia
                                        </div>
                                    </div>
                                )}

                                {/* Estado con Badge Slim */}
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Estado</span>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${selectedItem.estado_produccion === 'terminado' && !selectedItem.pendiente_inventario ? 'bg-green-50 text-green-700 border border-green-100' :
                                        selectedItem.estado_produccion === 'terminado' && selectedItem.pendiente_inventario ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                            selectedItem.estado_produccion === 'en_proceso' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                'bg-gray-50 text-gray-600 border border-gray-200'
                                        }`}>
                                        {selectedItem.estado_produccion === 'terminado' && selectedItem.pendiente_inventario ? 'TERMINADO - PEND. STOCK' : selectedItem.estado_produccion.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Información Principal Refinada */}
                                <div className="space-y-3">
                                    <div className="border-l-2 border-blue-500 pl-3">
                                        <h4 className="text-[14px] font-bold text-gray-900 leading-tight">
                                            {selectedItem.nombre_producto || `${selectedItem.tipo_producto} ${selectedItem.metal}`}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">{selectedItem.tipo_producto}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">{selectedItem.metal}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-1.5 font-bold bg-gray-100/50 w-fit px-2 py-0.5 rounded">
                                            {selectedItem.cantidad} {selectedItem.cantidad === 1 ? 'UNIDAD' : 'UNIDADES'}
                                        </p>
                                    </div>

                                    {/* Origen del Pedido - Muy Slim */}
                                    {selectedItem.pedido_id && (
                                        <div className="bg-blue-50/40 rounded-xl p-3 flex items-center justify-between border border-blue-100/30">
                                            <div className="flex flex-col">
                                                <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest">Pedido Origen</span>
                                                <span className="text-[12px] font-bold text-gray-800 leading-tight mt-0.5">{selectedItem.nombre_cliente}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[11px] font-black text-blue-600">#{selectedItem.pedido_id}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Resumen Económico Comprimido */}
                                <div className="bg-gray-50/50 rounded-xl p-3 space-y-2 border border-gray-100">
                                    <div className="flex justify-between text-[10px] text-gray-500 font-medium tracking-tight">
                                        <span>COSTO UNITARIO</span>
                                        <span className="text-gray-900 font-bold">S/ {parseFloat(selectedItem.costo_total_unitario || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline border-t border-gray-200/50 pt-2 shadow-sm shadow-white">
                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.15em]">Inversión Total</span>
                                        <span className="text-[17px] font-black text-blue-700 tracking-tighter">
                                            S/ {parseFloat(selectedItem.costo_total_produccion || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Notas Compactas */}
                                {selectedItem.observaciones && (
                                    <div className="bg-amber-50/30 rounded-lg p-2.5 border border-amber-100/20">
                                        <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest block mb-1">Observaciones</span>
                                        <p className="text-[10px] text-amber-900/80 leading-relaxed font-medium italic">
                                            "{selectedItem.observaciones}"
                                        </p>
                                    </div>
                                )}

                                <div className="text-center pt-1">
                                    <span className="text-[8px] font-bold text-gray-300 uppercase tracking-[0.2em]">
                                        REGISTRO: {new Date(selectedItem.created_at).toLocaleDateString('es-ES')}
                                    </span>
                                </div>
                            </div>

                            {/* Footer Rediseñado y Mini */}
                            <div className="p-3 bg-white border-t border-gray-50 grid grid-cols-5 gap-2">
                                {selectedItem.estado_produccion === 'en_proceso' && (
                                    <button
                                        onClick={() => { setShowDetailModal(false); handleMarkAsComplete(selectedItem); }}
                                        className="col-span-2 h-9 bg-green-600 hover:bg-green-700 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-all shadow-md shadow-green-100 flex items-center justify-center gap-1.5 active:scale-95"
                                    >
                                        <FaCheck className="w-2.5 h-2.5" /> Terminar
                                    </button>
                                )}

                                <button
                                    onClick={() => { setShowDetailModal(false); handleEditingFromDetail(selectedItem); }}
                                    className={`${selectedItem.estado_produccion === 'en_proceso' ? 'col-span-2' : 'col-span-4'} h-9 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-95`}
                                >
                                    <FaEdit className="w-2.5 h-2.5" /> <span className="text-[9px] font-black uppercase tracking-wider">Editar</span>
                                </button>

                                {selectedItem.estado_produccion !== 'terminado' ? (
                                    <button
                                        onClick={() => { setShowDetailModal(false); handleDelete(selectedItem); }}
                                        className="col-span-1 h-9 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors border border-red-100 active:scale-95"
                                        title="Eliminar"
                                    >
                                        <FaTrash className="w-2.5 h-2.5" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowDetailModal(false)}
                                        className="col-span-1 h-9 bg-gray-900 text-white rounded-lg flex items-center justify-center active:scale-95 shadow-sm"
                                    >
                                        <FaTimes size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ──────────────────────────────────────────────────────
                Modal Unificado: Finalizar Fabricación
                - Costo unitario directo (BISUTERIA y metales)
                - Foto del producto terminado integrada
                - Modo avanzado: peso + horas (opcional)
            ─────────────────────────────────────────────────────── */}
            {showCostosModal && itemToFinish && (() => {
                const cantidad = parseInt(itemToFinish.cantidad) || 1;
                const costoUnitario = parseFloat(costosFormData.costo_unitario_directo) || 0;
                const insumosExtra = parseFloat(costosFormData.costo_insumos_extra) || 0;
                const costoTotalEstimado = (costoUnitario * cantidad) + insumosExtra;
                const precioVenta = parseFloat(costosFormData.precio_venta_sugerido) || (costoUnitario > 0 ? costoUnitario * 2 : 0);
                const esBisuteria = itemToFinish.metal === 'BISUTERIA';
                const nombreProducto = itemToFinish.nombre_producto || `${itemToFinish.tipo_producto} · ${itemToFinish.metal}`;

                return (
                    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-[420px] max-h-[95vh] overflow-hidden flex flex-col border border-gray-100">

                            {/* ── Header ── */}
                            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 text-white flex justify-between items-start flex-shrink-0">
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <FaCheckCircle className="text-emerald-400" size={14} />
                                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.15em]">Finalizar Fabricación</span>
                                    </div>
                                    <h3 className="text-sm font-bold tracking-wide leading-snug">{nombreProducto}</h3>
                                    <div className="flex gap-2 mt-1.5 flex-wrap">
                                        <span className="px-2 py-0.5 bg-white/10 rounded-md text-[10px] font-semibold uppercase tracking-wide">{itemToFinish.metal}</span>
                                        <span className="px-2 py-0.5 bg-white/10 rounded-md text-[10px] font-semibold">{cantidad} {cantidad > 1 ? 'piezas' : 'pieza'}</span>
                                        {itemToFinish.complejidad && (
                                            <span className="px-2 py-0.5 bg-amber-500/30 text-amber-200 rounded-md text-[10px] font-semibold uppercase">{itemToFinish.complejidad}</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowCostosModal(false); setItemToFinish(null); }}
                                    className="text-gray-400 hover:text-white transition mt-1 flex-shrink-0"
                                >
                                    <FaTimes size={16} />
                                </button>
                            </div>

                            {/* ── Contenido con scroll ── */}
                            <div className="p-4 space-y-4 overflow-y-auto flex-1">

                                {/* Sección 1: Foto del producto terminado */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <FaCamera size={10} /> Foto del producto terminado
                                        <span className="text-gray-300 font-normal normal-case tracking-normal">(opcional)</span>
                                    </label>

                                    {/* Área de subida */}
                                    <label className="block cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                if (!validateImageFile(file)) {
                                                    toast.error('Formato de imagen no válido');
                                                    return;
                                                }
                                                const previewUrl = URL.createObjectURL(file);
                                                setCostosFormData(prev => ({
                                                    ...prev,
                                                    selected_image_file: file,
                                                    preview_image_url: previewUrl
                                                }));
                                            }}
                                        />
                                        {costosFormData.preview_image_url ? (
                                            <div className="relative rounded-2xl overflow-hidden bg-gray-50 border border-gray-200">
                                                <img
                                                    src={costosFormData.preview_image_url}
                                                    alt="Vista previa"
                                                    className="w-full h-36 object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                    <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full">Cambiar foto</span>
                                                </div>
                                                {costosFormData.selected_image_file && (
                                                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                                        Nueva foto ✓
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all flex flex-col items-center justify-center py-5 gap-2">
                                                <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                                                    <FaCamera className="text-gray-400" size={16} />
                                                </div>
                                                <span className="text-xs text-gray-400 font-medium">Toca para subir o tomar foto</span>
                                            </div>
                                        )}
                                    </label>
                                </div>

                                {/* Separador */}
                                <div className="border-t border-gray-100" />

                                {/* Sección 2: Costo de producción */}
                                <div className="space-y-3">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <FaMoneyBillWave size={10} /> Costo de producción
                                    </label>

                                    {/* Costo Unitario Directo (siempre visible) */}
                                    <div>
                                        <label className="block text-[11px] text-gray-600 font-semibold mb-1">
                                            {cantidad > 1 ? `Costo unitario por pieza (S/)` : `Costo unitario (S/)`}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">S/</span>
                                            <input
                                                type="number"
                                                step="0.50"
                                                min="0"
                                                placeholder="0.00"
                                                value={costosFormData.costo_unitario_directo}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const precio = parseFloat(val) > 0 ? (parseFloat(val) * 2).toFixed(2) : '';
                                                    setCostosFormData(prev => ({
                                                        ...prev,
                                                        costo_unitario_directo: val,
                                                        precio_venta_sugerido: prev.precio_venta_sugerido || precio
                                                    }));
                                                }}
                                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white text-sm font-bold text-gray-800"
                                                autoFocus
                                            />
                                        </div>
                                        {cantidad > 1 && costoUnitario > 0 && (
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                Total lote: <span className="font-bold text-gray-600">S/ {(costoUnitario * cantidad).toFixed(2)}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Insumos Extra */}
                                    <div>
                                        <label className="block text-[11px] text-gray-600 font-semibold mb-1">
                                            Insumos extra — piedras, gemas, etc. (S/)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">S/</span>
                                            <input
                                                type="number"
                                                step="0.50"
                                                min="0"
                                                placeholder="0.00"
                                                value={costosFormData.costo_insumos_extra}
                                                onChange={(e) => setCostosFormData(prev => ({ ...prev, costo_insumos_extra: e.target.value }))}
                                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Toggle cálculo avanzado (solo si no es bisutería o siempre) */}
                                    {!esBisuteria && (
                                        <button
                                            type="button"
                                            onClick={() => setCostosFormData(prev => ({ ...prev, usar_calculo_detallado: !prev.usar_calculo_detallado }))}
                                            className="flex items-center gap-2 text-[11px] text-indigo-600 font-semibold hover:underline transition"
                                        >
                                            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${costosFormData.usar_calculo_detallado ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                                {costosFormData.usar_calculo_detallado && <FaCheck size={7} className="text-white" />}
                                            </span>
                                            Calcular por peso y horas de trabajo (metal)
                                        </button>
                                    )}

                                    {/* Campos avanzados: solo si toggle está activo */}
                                    {costosFormData.usar_calculo_detallado && !esBisuteria && (
                                        <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100 space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-[10px] text-indigo-700 font-bold mb-1 uppercase tracking-wide">
                                                        {cantidad > 1 ? 'Peso total lote (g)' : 'Peso (gramos)'}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={costosFormData.peso_material_gramos}
                                                        onChange={(e) => setCostosFormData(prev => ({ ...prev, peso_material_gramos: e.target.value }))}
                                                        className="w-full px-3 py-2 rounded-lg border border-indigo-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-indigo-700 font-bold mb-1 uppercase tracking-wide">
                                                        {cantidad > 1 ? 'Tiempo total (h)' : 'Tiempo (horas)'}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        placeholder="0.0"
                                                        value={costosFormData.horas_trabajo_real}
                                                        onChange={(e) => setCostosFormData(prev => ({ ...prev, horas_trabajo_real: e.target.value }))}
                                                        className="w-full px-3 py-2 rounded-lg border border-indigo-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-indigo-500">El costo unitario calculado sobreescribirá el valor ingresado arriba.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Separador */}
                                <div className="border-t border-gray-100" />

                                {/* Sección 3: Precio de venta */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        🏷️ Precio de venta
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-bold text-sm">S/</span>
                                        <input
                                            type="number"
                                            step="0.50"
                                            min="0"
                                            placeholder="0.00"
                                            value={costosFormData.precio_venta_sugerido}
                                            onChange={(e) => setCostosFormData(prev => ({ ...prev, precio_venta_sugerido: e.target.value }))}
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50 text-sm font-bold text-amber-800"
                                        />
                                    </div>
                                    {costoUnitario > 0 && precioVenta > 0 && (
                                        <div className="mt-1.5 flex items-center justify-between text-[10px]">
                                            <span className="text-gray-400">Costo total estimado:</span>
                                            <span className="font-bold text-gray-600">S/ {costoTotalEstimado.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Footer ── */}
                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 flex-shrink-0">
                                <button
                                    onClick={() => { setShowCostosModal(false); setItemToFinish(null); }}
                                    className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmTerminarWithCostos}
                                    disabled={loading}
                                    className={`flex-[2] py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-2 shadow-md ${loading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'}`}
                                >
                                    {loading ? (
                                        <><FaSpinner className="animate-spin" size={14} /> Guardando...</>
                                    ) : (
                                        <><FaCheckCircle size={14} /> Confirmar y Finalizar</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}


            {/* Modal de Ingreso a Stock — DESACTIVADO: ahora se gestiona desde el módulo Inventario */}
            {/* {showStockIngressModal && finishedStockItem && (
            <StockIngressModal
                item={finishedStockItem}
                onSuccess={() => {
                    setShowStockIngressModal(false);
                    setFinishedStockItem(null);
                    fetchProduccion();
                    fetchStats();
                }}
                onCancel={() => {
                    setShowStockIngressModal(false);
                    setFinishedStockItem(null);
                }}
            /> */}

        </div >
    );
};

export default Produccion;
