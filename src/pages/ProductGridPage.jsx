
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ProductGridPage = () => {
    const { material, categoria } = useParams();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortOrder, setSortOrder] = useState('default'); // 'default', 'price_asc', 'price_desc'

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. Obtener el ID del material
                const { data: materialData, error: materialError } = await supabase
                    .from('materiales')
                    .select('id')
                    .eq('nombre', material)
                    .single();

                if (materialError || !materialData) {
                    throw new Error(`Material '${material}' no encontrado.`);
                }
                const materialId = materialData.id;

                // 2. Obtener el ID de la categoría
                const { data: categoriaData, error: categoriaError } = await supabase
                    .from('categorias')
                    .select('id')
                    .eq('nombre', categoria)
                    .single();

                if (categoriaError || !categoriaData) {
                    throw new Error(`Categoría '${categoria}' no encontrada.`);
                }
                const categoriaId = categoriaData.id;

                // 3. Obtener los IDs de los productos que coinciden con el material
                const { data: productoMaterialData, error: productoMaterialError } = await supabase
                    .from('producto_material')
                    .select('producto_id')
                    .eq('material_id', materialId);

                if (productoMaterialError) throw productoMaterialError;
                const productIdsFromMaterial = productoMaterialData.map(pm => pm.producto_id);

                if (productIdsFromMaterial.length === 0) {
                    setProducts([]);
                    setLoading(false);
                    return;
                }

                // 4. Obtener los productos finales que también coinciden con la categoría
                const { data: productsData, error: productsError } = await supabase
                    .from('productos')
                    .select('*')
                    .in('id', productIdsFromMaterial)
                    .eq('categoria_id', categoriaId);

                if (productsError) {
                    throw productsError;
                }

                setProducts(productsData);
            } catch (err) {
                console.error("Error fetching products:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [material, categoria]);

    if (loading) {
        return <div className="text-center py-10">Cargando productos...</div>;
    }

    if (error) {
        return <div className="text-center py-10 text-red-500">Error: {error}</div>;
    }

    const handleSortChange = (e) => {
        setSortOrder(e.target.value);
    };

    const sortedProducts = [...products].sort((a, b) => {
        switch (sortOrder) {
            case 'price_asc':
                return a.precio - b.precio;
            case 'price_desc':
                return b.precio - a.precio;
            default:
                // Sort by creation date descending (newest first)
                return new Date(b.created_at) - new Date(a.created_at);
        }
    });

    return (
        <div className="container mx-auto px-4 py-8 pt-24">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-3xl font-bold capitalize">{categoria} de {material}</h1>
                <select 
                    onChange={handleSortChange} 
                    value={sortOrder}
                    className="p-2 border border-gray-300 rounded-md shadow-sm"
                >
                    <option value="default">Ordenar por</option>
                    <option value="price_asc">Precio: Menor a Mayor</option>
                    <option value="price_desc">Precio: Mayor a Menor</option>
                </select>
            </div>
            <p className="text-gray-600 mb-8">Explora nuestra colección.</p>

            {sortedProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {sortedProducts.map((product) => (
                        <Link to={`/producto/${product.id}`} key={product.id} className="group">
                            <div className="bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-300 group-hover:scale-105">
                                <img 
                                    src={product.imagen_principal_url} 
                                    alt={product.titulo} 
                                    className="w-full h-48 object-cover"
                                />
                                <div className="p-4">
                                    <h3 className="text-md font-semibold truncate">{product.titulo}</h3>
                                    {product.precio && (
                                        <p className="text-gray-600 mt-1">S/ {product.precio.toFixed(2)}</p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10">
                    <p>No se encontraron productos en esta categoría.</p>
                    <Link to="/" className="text-blue-500 hover:underline mt-4 inline-block">Volver al inicio</Link>
                </div>
            )}
        </div>
    );
};

export default ProductGridPage;
