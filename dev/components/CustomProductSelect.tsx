import React from 'react'
import { UIFieldServerComponent, UIFieldServerProps } from 'payload'
import { ProductVariantSelect } from './ProductVariantSelect.js'
import { Product } from 'payload-types.js'
import { ProductVariants, ProductWithVariants } from 'types/product/index.js'

interface CustomProductVariantSelectProps extends UIFieldServerProps {
  productPath?: string
  variantPath?: string
  arrayParentPath?: string
  varinatInfoPath?: string
}

export const CustomProductVariantSelect: UIFieldServerComponent = async (
  props: CustomProductVariantSelectProps,
) => {
  const { path, payload, data } = props

  const products = await payload.find({
    collection: 'product',
    // depth: 2,
    select: {
      id: true,
      title: true,
      variants: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const getProductsWithVariants = (productList: Product[]) => {
    const productsMap = new Map<number, ProductWithVariants>()

    productList.forEach((product) => {
      const processedProduct = {
        ...product,
        variants: product.variants as ProductVariants[],
      }
      productsMap.set(product.id, processedProduct)
    })

    return productsMap
  }

  const productsWithVariants = getProductsWithVariants(products.docs as Product[])

  return (
    <>
      <h3>Product and Variant Selection</h3>
      <ProductVariantSelect
        path={path}
        data={productsWithVariants}
        arrayParentPath={props.arrayParentPath}
        productPath={props.productPath}
        variantPath={props.variantPath}
        varinatInfoPath={props.varinatInfoPath}
      />
    </>
  )
}
