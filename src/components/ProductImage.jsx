import React from 'react';

const ProductImage = ({ src, alt }) => {
    return (
        <img
            src={src}
            alt={alt}
            className="w-full h-full object-contain bg-gray-50"
            loading="lazy"
        />
    );
};

export default ProductImage;
