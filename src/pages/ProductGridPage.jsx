import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ProductImage from '../components/ProductImage';


const ProductGridPage = () => {
    // Parámetros dinámicos de la URL
    const { material, categoria } = useParams();

    // Estados del componente
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortOrder, setSortOrder] = useState('default');

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            setError(null);

            const isViewingAll = material === 'all' && categoria === 'all';
            let productsData = [];

            try {
                if (isViewingAll) {
                    // CASO 1: Cargar TODOS los productos activos (vista de catálogo total)
                    const { data, error: productsError } = await supabase
                        .from('productos')
                        .select('*')
                        .eq('activo', true)
                        .order('created_at', { ascending: false });

                    if (productsError) throw productsError;
                    productsData = data || []; // Asegura que sea un array

                } else if (material === 'all' && categoria !== 'all') {
                    // CASO 3: Filtrado SOLO por Categoría (ignorando material)
                    // Útil para "Personalizados" o cualquier categoría global

                    // Normalizar "Personalizados" (plural) a "PERSONALIZADO" (singular de la BD)
                    const categoriaBusqueda = categoria.toLowerCase() === 'personalizados' ? 'PERSONALIZADO' : categoria;

                    // 1. Obtener ID de la categoría (búsqueda insensible a mayúsculas/minúsculas)
                    const { data: categoriaData, error: categoriaError } = await supabase
                        .from('categorias')
                        .select('id')
                        .ilike('nombre', categoriaBusqueda)
                        .maybeSingle();

                    if (categoriaError) throw categoriaError;

                    if (!categoriaData) {
                        // Si no encuentra la categoría, mostramos lista vacía en lugar de error
                        console.warn(`La Categoría '${categoria}' no se encontró en la base de datos.`);
                        setProducts([]);
                        setLoading(false);
                        return;
                    }
                    const categoriaId = categoriaData.id;

                    // 2. Obtener productos activos de esa categoría
                    const { data, error: productsError } = await supabase
                        .from('productos')
                        .select('*')
                        .eq('categoria_id', categoriaId)
                        .eq('activo', true)
                        .order('created_at', { ascending: false });

                    if (productsError) throw productsError;
                    productsData = data || [];

                } else {
                    // CASO 2: Lógica de Filtrado por Material y Categoría

                    // 1. Obtener ID del material (búsqueda insensible a mayúsculas/minúsculas)
                    const { data: materialData, error: materialError } = await supabase
                        .from('materiales')
                        .select('id')
                        .ilike('nombre', material)
                        .maybeSingle();

                    if (materialError) throw materialError;

                    if (!materialData) {
                        // Si no encuentra el material, mostramos lista vacía
                        console.warn(`El Material '${material}' no se encontró.`);
                        setProducts([]);
                        setLoading(false);
                        return;
                    }
                    const materialId = materialData.id;

                    // 2. Obtener ID de la categoría (búsqueda insensible a mayúsculas/minúsculas)
                    const { data: categoriaData, error: categoriaError } = await supabase
                        .from('categorias')
                        .select('id')
                        .ilike('nombre', categoria)
                        .maybeSingle();

                    if (categoriaError) throw categoriaError;

                    if (!categoriaData) {
                        // Si no encuentra la categoría, mostramos lista vacía
                        console.warn(`La Categoría '${categoria}' no se encontró.`);
                        setProducts([]);
                        setLoading(false);
                        return;
                    }
                    const categoriaId = categoriaData.id;

                    // 3. Obtener IDs de productos que tienen el material
                    const { data: productoMaterialData, error: productoMaterialError } = await supabase
                        .from('producto_material')
                        .select('producto_id')
                        .eq('material_id', materialId);

                    if (productoMaterialError) throw productoMaterialError;

                    const validProductoMaterialData = productoMaterialData || [];

                    if (validProductoMaterialData.length === 0) {
                        setProducts([]);
                        setLoading(false);
                        return;
                    }

                    const productIdsFromMaterial = validProductoMaterialData.map(pm => pm.producto_id);

                    // 4. Obtener productos activos que coinciden con los IDs de material y la categoría
                    const { data, error: productsError } = await supabase
                        .from('productos')
                        .select('*')
                        .in('id', productIdsFromMaterial)
                        .eq('categoria_id', categoriaId)
                        .eq('activo', true)
                        .order('created_at', { ascending: false });

                    if (productsError) throw productsError;
                    productsData = data || [];
                }

                setProducts(productsData);
            } catch (err) {
                console.error("Error al cargar productos:", err);
                // Establece el error para mostrar un mensaje claro al usuario
                setError(err.message || "Hubo un error desconocido al cargar los productos. Revisa tu conexión a Supabase y los permisos de las tablas.");
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [material, categoria]);

    const handleSortChange = (e) => {
        setSortOrder(e.target.value);
    };

    // Lógica para ordenar los productos
    const sortedProducts = [...products].sort((a, b) => {
        switch (sortOrder) {
            case 'price_asc':
                return a.precio - b.precio;
            case 'price_desc':
                return b.precio - a.precio;
            default:
                // Por defecto: ordenar por fecha de creación descendente (más nuevos primero)
                return new Date(b.created_at) - new Date(a.created_at);
        }
    });

    // Helper para formatear texto a Title Case (primera mayúscula, resto minúscula)
    const toTitleCase = (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    // Mapeo de categorías singulares a plurales para el título
    const CATEGORY_DISPLAY_NAMES = {
        'COLLAR': 'Collares',
        'ANILLO': 'Anillos',
        'ARETE': 'Aretes',
        'PULSERA': 'Pulseras',
        'PERSONALIZADO': 'Diseños Personalizados'
    };

    // Construye el título de la página
    let pageTitle = "";
    if (material === 'all' && categoria === 'all') {
        pageTitle = "Catálogo Completo";
    } else if (material === 'all') {
        const catKey = categoria.toUpperCase();
        pageTitle = CATEGORY_DISPLAY_NAMES[catKey] || toTitleCase(categoria);
    } else {
        const catKey = categoria.toUpperCase();
        const displayCat = CATEGORY_DISPLAY_NAMES[catKey] || toTitleCase(categoria);
        const displayMat = toTitleCase(material);
        pageTitle = `${displayCat} de ${displayMat}`;
    }

    if (loading) return <div className="text-center pt-32 text-xl font-medium">Cargando productos...</div>;

    // Renderizado del mensaje de error si hay problemas
    if (error) return (
        <div className="container mx-auto px-4 py-8 pt-24 text-center">
            <h1 className="text-3xl font-bold text-red-600 mb-4">¡Ups! Error al Cargar</h1>
            <p className="text-xl text-gray-700 mb-8">{error}</p>
            <Link to="/" className="text-indigo-500 hover:underline font-semibold">Volver a la página principal</Link>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 pt-24">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-lg md:text-3xl font-bold">{pageTitle}</h1>
                <select
                    onChange={handleSortChange}
                    value={sortOrder}
                    className="p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="default">Ordenar por</option>
                    <option value="price_asc">Precio: Menor a Mayor</option>
                    <option value="price_desc">Precio: Mayor a Menor</option>
                </select>
            </div>
            <p className="text-gray-600 mb-8">Explora nuestra colección.</p>

            {sortedProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {sortedProducts.map((product) => (
                        <Link to={`/producto/${product.id}`} key={product.id} className="group block h-full">
                            <div className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col">
                                {/* Componente de imagen para la carga gradual */}
                                <div className="h-40 sm:h-56 overflow-hidden">
                                    <ProductImage
                                        src={product.imagen_principal_url}
                                        alt={product.titulo}
                                    />
                                </div>

                                <div className="p-4 flex flex-col flex-grow">
                                    <h3 className="text-xs md:text-base font-semibold truncate text-black">{product.titulo}</h3>
                                    {product.precio ? (
                                        <p className="text-sm md:text-lg font-normal text-black mt-2">S/ {product.precio.toFixed(2)}</p>
                                    ) : (
                                        <p className="text-sm md:text-lg font-normal text-gray-500 mt-2 italic">A pedido</p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500 text-lg">No hay productos ingresados.</p>
                    <Link to="/catalogo/all/all" className="text-indigo-500 hover:underline mt-4 inline-block font-medium">Ver todo el catálogo</Link>
                </div>
            )}
        </div>
    );
};

export default ProductGridPage;