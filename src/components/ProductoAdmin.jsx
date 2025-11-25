import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ImageUploader from './ImageUploader';
import { generateSlug } from '../utils';
import { FaEdit, FaTrash, FaSearch, FaPlus, FaFilter, FaCheck, FaTimes, FaStar } from 'react-icons/fa';

const ProductoAdmin = () => {
    const { user } = useAuth();
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingProducto, setEditingProducto] = useState(null);
    const [categorias, setCategorias] = useState([]);
    const [materiales, setMateriales] = useState([]);
    const [successMessage, setSuccessMessage] = useState('');

    // Estados para filtros y búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterMaterial, setFilterMaterial] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive

    // Estados para paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // Estados para ordenamiento
    const [sortBy, setSortBy] = useState('orden');
    const [sortOrder, setSortOrder] = useState('asc');

    // Estados del formulario
    const [formData, setFormData] = useState({
        categoria_id: '',
        material_id: '',
        titulo: '',
        descripcion: '',
        imagen_principal_url: '',
        imagen2_url: '',
        imagen3_url: '',
        precio: '',
        slug: '',
        orden: 0,
        activo: true,
        is_novedoso: false,
        meta_descripcion: '',
        palabras_clave: '',
        moneda: 'USD'
    });

    if (!user) {
        return (
            <div className="p-8 text-center text-gray-700">
                <h2 className="text-2xl font-bold mb-4">Acceso restringido</h2>
                <p>Debes iniciar sesión para administrar los productos.</p>
            </div>
        );
    }

    useEffect(() => {
        fetchProductos();
        fetchCategorias();
        fetchMateriales();
    }, []);

    const fetchProductos = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('productos')
                .select('*, categorias(nombre), producto_material(material_id)')
                .order('orden', { ascending: true });

            if (error) throw error;
            setProductos(data || []);
            setError(null);
        } catch (err) {
            setError('Error al cargar los productos.');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategorias = async () => {
        try {
            const { data, error } = await supabase.from('categorias').select('*');
            if (error) throw error;
            setCategorias(data || []);
        } catch (err) {
            console.error('Error al cargar categorías:', err);
        }
    };

    const fetchMateriales = async () => {
        try {
            const { data, error } = await supabase.from('materiales').select('*');
            if (error) throw error;
            setMateriales(data || []);
        } catch (err) {
            console.error('Error al cargar materiales:', err);
        }
    };

    // Función para toggle rápido de estado activo/inactivo
    const handleToggleActivo = async (producto) => {
        try {
            const nuevoEstado = !producto.activo;
            const { error } = await supabase
                .from('productos')
                .update({ activo: nuevoEstado })
                .eq('id', producto.id);

            if (error) throw error;

            setSuccessMessage(`Producto ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`);
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchProductos();
        } catch (err) {
            setError(`Error al actualizar el estado: ${err.message}`);
        }
    };

    // Función para obtener el nombre del material principal
    const getMaterialNombre = (producto) => {
        if (!producto.producto_material || producto.producto_material.length === 0) {
            return 'Sin material';
        }
        const materialId = producto.producto_material[0].material_id;
        const material = materiales.find(m => m.id === materialId);
        return material ? material.nombre : 'Sin material';
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            // Extraer material_id y preparar datos del producto
            // También excluimos campos que vienen de joins (categorias, producto_material) para evitar errores en el update
            const { material_id, categorias, producto_material, ...productData } = formData;

            // Generar slug si no existe
            let slug = formData.slug;
            if (!slug || slug.trim() === '') {
                // Usar timestamp para garantizar unicidad absoluta
                const timestamp = Date.now();
                slug = generateSlug(formData.titulo) + '-' + timestamp;
            }

            console.log('Enviando producto con slug:', slug); // Debug logging

            const formDataToSend = {
                ...productData,
                slug: slug,
                precio: formData.precio !== '' ? parseFloat(formData.precio) : null
            };

            let productId;

            if (editingProducto) {
                productId = editingProducto.id;
                const { error } = await supabase
                    .from('productos')
                    .update(formDataToSend)
                    .eq('id', productId);

                if (error) throw error;
                setEditingProducto(null);
            } else {
                const { data, error } = await supabase
                    .from('productos')
                    .insert([formDataToSend])
                    .select();

                if (error) throw error;
                productId = data[0].id;
            }

            // Manejar la relación con materiales
            if (material_id) {
                // Primero eliminar relaciones existentes
                const { error: deleteError } = await supabase
                    .from('producto_material')
                    .delete()
                    .eq('producto_id', productId);

                if (deleteError) throw deleteError;

                // Insertar la nueva relación
                const { error: insertError } = await supabase
                    .from('producto_material')
                    .insert([{
                        producto_id: productId,
                        material_id: parseInt(material_id)
                    }]);

                if (insertError) throw insertError;
            }

            setSuccessMessage(`Producto ${editingProducto ? 'actualizado' : 'creado'} correctamente`);
            setTimeout(() => setSuccessMessage(''), 3000);
            resetForm();
            fetchProductos();
        } catch (err) {
            setError(`Error al ${editingProducto ? 'actualizar' : 'crear'} el producto: ${err.message}`);
        }
    };

    const handleEdit = (producto) => {
        setEditingProducto(producto);

        // Obtener el ID del material si existe
        let materialId = '';
        if (producto.producto_material && producto.producto_material.length > 0) {
            materialId = producto.producto_material[0].material_id;
        }

        setFormData({
            ...producto,
            material_id: materialId
        });
        setError(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) return;

        try {
            const { error } = await supabase.from('productos').delete().eq('id', id);
            if (error) throw error;
            fetchProductos();
        } catch (err) {
            setError(`Error al eliminar el producto: ${err.message}`);
        }
    };

    const resetForm = () => {
        setFormData({
            categoria_id: '',
            titulo: '',
            descripcion: '',
            imagen_principal_url: '',
            imagen2_url: '',
            imagen3_url: '',
            precio: '',
            slug: '',
            orden: 0,
            activo: true,
            is_novedoso: false,
            meta_descripcion: '',
            palabras_clave: '',
            moneda: 'USD',
            material_id: ''
        });
        setEditingProducto(null);
        setError(null);
    };

    const handleImageUpload = (field, url) => {
        setFormData(prev => ({
            ...prev,
            [field]: url
        }));
    };

    // Lógica de filtrado
    const filteredProducts = productos.filter(producto => {
        const matchesSearch = producto.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (producto.slug && producto.slug.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = filterCategory ? producto.categoria_id === parseInt(filterCategory) : true;
        const matchesMaterial = filterMaterial ?
            producto.producto_material?.some(pm => pm.material_id === parseInt(filterMaterial)) : true;
        const matchesStatus = filterStatus === 'all' ? true :
            filterStatus === 'active' ? producto.activo :
                !producto.activo;

        return matchesSearch && matchesCategory && matchesMaterial && matchesStatus;
    });

    // Ordenamiento
    const sortedProducts = [...filteredProducts].sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
            case 'titulo':
                aValue = a.titulo.toLowerCase();
                bValue = b.titulo.toLowerCase();
                break;
            case 'precio':
                aValue = a.precio || 0;
                bValue = b.precio || 0;
                break;
            case 'orden':
            default:
                aValue = a.orden || 0;
                bValue = b.orden || 0;
                break;
        }

        if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });

    // Paginación
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentProducts = sortedProducts.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

    // Resetear a página 1 cuando cambian los filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterCategory, filterMaterial, filterStatus]);

    if (loading) {
        return <div className="p-4 text-center">Cargando productos...</div>;
    }

    return (
        <div className="container mx-auto p-4 max-w-7xl mt-8">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    {editingProducto && (
                        <button onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700 underline">
                            Cancelar Edición
                        </button>
                    )}
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold mb-1 text-gray-600">Categoría</label>
                                <select
                                    name="categoria_id"
                                    value={formData.categoria_id}
                                    onChange={handleInputChange}
                                    className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Seleccione...</option>
                                    {categorias.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-1 text-gray-600">Material</label>
                                <select
                                    name="material_id"
                                    value={formData.material_id}
                                    onChange={handleInputChange}
                                    className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Seleccione...</option>
                                    {materiales.map(mat => (
                                        <option key={mat.id} value={mat.id}>{mat.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold mb-1 text-gray-600">Título</label>
                                <input
                                    type="text"
                                    name="titulo"
                                    value={formData.titulo}
                                    onChange={handleInputChange}
                                    className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold mb-1 text-gray-600">Slug (URL amigable)</label>
                                <input
                                    type="text"
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleInputChange}
                                    className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                    placeholder="Se generará automáticamente si se deja vacío"
                                />
                                <p className="text-xs text-gray-500 mt-1">Identificador único para la URL del producto.</p>
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold mb-1 text-gray-600">Descripción</label>
                                <textarea
                                    name="descripcion"
                                    value={formData.descripcion}
                                    onChange={handleInputChange}
                                    rows="2"
                                    className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-1 text-gray-600">Precio</label>
                                <input
                                    type="number"
                                    name="precio"
                                    value={formData.precio}
                                    onChange={handleInputChange}
                                    className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div className="flex items-center gap-6 mt-6">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="activo"
                                        checked={formData.activo}
                                        onChange={handleInputChange}
                                        className="mr-2 h-4 w-4 text-blue-600"
                                    />
                                    <label className="text-sm font-bold text-gray-700">Producto Activo</label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="is_novedoso"
                                        checked={formData.is_novedoso}
                                        onChange={handleInputChange}
                                        className="mr-2 h-4 w-4 text-yellow-500"
                                    />
                                    <label className="text-sm font-bold text-gray-700">Es Novedoso</label>
                                </div>
                            </div>
                        </div>

                        {/* Imágenes Compactas */}
                        <div className="mt-4 border-t pt-4">
                            <h4 className="text-sm font-semibold mb-2 text-gray-600">Imágenes</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {['imagen_principal_url', 'imagen2_url', 'imagen3_url'].map((field, idx) => (
                                    <div key={field} className="flex items-center gap-2">
                                        <div className="flex-grow">
                                            <ImageUploader
                                                bucketName="producto-images"
                                                onUploadSuccess={(url) => handleImageUpload(field, url)}
                                            />
                                        </div>
                                        {formData[field] && (
                                            <img src={formData[field]} alt={`Img ${idx + 1}`} className="w-10 h-10 object-cover rounded border" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                type="submit"
                                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow-md transition-colors flex items-center justify-center gap-2"
                            >
                                {editingProducto ? <FaEdit /> : <FaPlus />}
                                {editingProducto ? 'Actualizar Producto' : 'Crear Producto'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* MENSAJE DE ÉXITO */}
            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
                    <FaCheck className="text-green-600" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* BARRA DE FILTROS SUPERIOR - GRIS OSCURO */}
            <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg mb-4">
                <div className="flex flex-col lg:flex-row gap-3 items-center">
                    {/* Búsqueda */}
                    <div className="relative w-full lg:w-1/4">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            className="pl-10 w-full p-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filtros */}
                    <div className="flex gap-2 w-full lg:w-auto flex-wrap">
                        <select
                            className="p-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="">Todas las Categorías</option>
                            {categorias.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                            ))}
                        </select>

                        <select
                            className="p-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            value={filterMaterial}
                            onChange={(e) => setFilterMaterial(e.target.value)}
                        >
                            <option value="">Todos los Materiales</option>
                            {materiales.map(mat => (
                                <option key={mat.id} value={mat.id}>{mat.nombre}</option>
                            ))}
                        </select>

                        <select
                            className="p-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">Todos los Estados</option>
                            <option value="active">Activos</option>
                            <option value="inactive">Inactivos</option>
                        </select>

                        <select
                            className="p-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="orden">Ordenar por: Orden</option>
                            <option value="titulo">Ordenar por: Título</option>
                            <option value="precio">Ordenar por: Precio</option>
                        </select>
                    </div>

                    {/* Contador de resultados */}
                    <div className="text-sm text-gray-300 ml-auto">
                        Mostrando {currentProducts.length} de {sortedProducts.length} productos
                    </div>
                </div>
            </div>

            {/* TABLA MEJORADA DE PRODUCTOS */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-20">Imagen</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Título</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider hidden md:table-cell">Material</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Categoría</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Precio</th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-20">Novedoso</th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Estado</th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentProducts.length > 0 ? (
                                currentProducts.map((producto) => (
                                    <tr key={producto.id} className="hover:bg-gray-50 transition-colors">
                                        {/* Imagen Thumbnail */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex-shrink-0 h-12 w-12">
                                                {producto.imagen_principal_url ? (
                                                    <img
                                                        className="h-12 w-12 rounded object-cover border-2 border-gray-200"
                                                        src={producto.imagen_principal_url}
                                                        alt={producto.titulo}
                                                    />
                                                ) : (
                                                    <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs border-2 border-gray-300">
                                                        Sin img
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Título */}
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={producto.titulo}>
                                                {producto.titulo}
                                            </div>
                                        </td>

                                        {/* Material */}
                                        <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                                {getMaterialNombre(producto)}
                                            </span>
                                        </td>

                                        {/* Categoría */}
                                        <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {producto.categorias?.nombre || 'Sin Cat.'}
                                            </span>
                                        </td>

                                        {/* Precio */}
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-700">
                                            {producto.precio ? `S/ ${producto.precio.toFixed(2)}` : <span className="text-gray-400 italic text-xs">A pedido</span>}
                                        </td>

                                        {/* Novedoso - Estrella */}
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                            {producto.is_novedoso ? (
                                                <FaStar className="inline text-yellow-500 text-lg" title="Producto Novedoso" />
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </td>

                                        {/* Estado - Toggle Switch */}
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => handleToggleActivo(producto)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${producto.activo ? 'bg-green-500 focus:ring-green-500' : 'bg-gray-300 focus:ring-gray-400'
                                                    }`}
                                                title={producto.activo ? 'Activo - Clic para desactivar' : 'Inactivo - Clic para activar'}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${producto.activo ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </td>

                                        {/* Acciones - Iconos */}
                                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                                            <div className="flex justify-center gap-3">
                                                <button
                                                    onClick={() => handleEdit(producto)}
                                                    className="text-indigo-600 hover:text-indigo-900 transition-colors p-1 hover:bg-indigo-50 rounded"
                                                    title="Editar producto"
                                                >
                                                    <FaEdit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(producto.id)}
                                                    className="text-red-600 hover:text-red-900 transition-colors p-1 hover:bg-red-50 rounded"
                                                    title="Eliminar producto"
                                                >
                                                    <FaTrash size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="px-6 py-10 text-center text-gray-500 text-sm">
                                        No se encontraron productos que coincidan con los filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINACIÓN */}
                {totalPages > 1 && (
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1 rounded text-sm font-medium ${currentPage === 1
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    « Anterior
                                </button>

                                {/* Números de página */}
                                {[...Array(totalPages)].map((_, index) => {
                                    const pageNum = index + 1;
                                    // Mostrar solo algunas páginas alrededor de la actual
                                    if (
                                        pageNum === 1 ||
                                        pageNum === totalPages ||
                                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`px-3 py-1 rounded text-sm font-medium ${currentPage === pageNum
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                        return <span key={pageNum} className="px-2 text-gray-500">...</span>;
                                    }
                                    return null;
                                })}

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1 rounded text-sm font-medium ${currentPage === totalPages
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    Siguiente »
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductoAdmin;
