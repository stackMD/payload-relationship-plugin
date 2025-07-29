import React from 'react';
import { ProductWithVariants } from 'types/product/index.js';
interface ProductVariantSelectProps {
    data: Map<number, ProductWithVariants>;
    productPath?: string;
    variantPath?: string;
    arrayParentPath?: string;
    varinatInfoPath?: string;
    path: string;
}
export declare const ProductVariantSelect: React.FC<ProductVariantSelectProps>;
export {};
