'use client'

import React, { useEffect, useState } from 'react'
import { Select, toast, useAllFormFields, useField, useRowLabel } from '@payloadcms/ui'
import { Option } from '@payloadcms/ui/elements/ReactSelect'
import { ProductWithVariants } from 'types/product/index.js'
import { reduceFieldsToValues } from 'payload/shared'

interface ProductVariantSelectProps {
  data: Map<number, ProductWithVariants>
  productPath?: string
  variantPath?: string
  arrayParentPath?: string
  varinatInfoPath?: string
  path: string
}

interface VariantOption extends Option<number> {
  price: number
  stock: number
}

export const ProductVariantSelect: React.FC<ProductVariantSelectProps> = ({
  data,
  arrayParentPath,
  productPath,
  variantPath,
  varinatInfoPath,
  path,
}) => {
  const { setValue, value, rows } = useField<string>({ path })
  const arrayIndex = path.split('.')[1] // This will get just the number from items.0

  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [productOptions, setProductOptions] = useState<Option<number | undefined>[]>([])
  const [variantOptions, setVariantOptions] = useState<Option<number | undefined>[]>([])

  const [fields] = useAllFormFields()
  const formData = reduceFieldsToValues(fields, true)

  const productField = useField<string>({
    path: `${arrayParentPath}.${arrayIndex}.${productPath}` || '',
  })

  const variantField = useField<string>({
    path: `${arrayParentPath}.${arrayIndex}.${variantPath}` || '',
  })

  const variantInfoField = useField<string>({
    path: `${arrayParentPath}.${arrayIndex}.${varinatInfoPath}` || '',
  })

  // Set product options on initial load
  useEffect(() => {
    const options = Array.from(data.keys()).map((productId) => {
      const product = data.get(productId)

      return {
        label: product?.title,
        value: product?.id,
      }
    })
    setProductOptions(options)

    // Set initial values if they exist
    const productId = Number(productField.value)
    const variantId = Number(variantField.value)

    if (productId) {
      const product = Array.from(data.values()).find((p) => p.id === productId)
      const selectedProduct = options.find((opt) => opt.value === productId)
      setSelectedProduct(selectedProduct || null)

      if (product) {
        const variantOptions = product.variants?.map((varr) => ({
          value: varr.id,
          label: varr.title,
          price: varr.price,
          stock: varr.stock,
        }))
        setVariantOptions(variantOptions)

        if (variantId) {
          const selectedVariant = variantOptions?.find((opt) => opt.value === variantId)
          setSelectedVariant(selectedVariant || null)

          if (selectedVariant) {
            variantInfoField.setValue({
              id: selectedVariant.value,
              price: selectedVariant.price,
              stock: selectedVariant.stock,
              title: selectedVariant.label,
            })
          }
        }
      }
    }
  }, [data, productField.value, variantField.value])

  const handleProductChange = (option: Option<unknown> | Option<unknown>[]) => {
    if (Array.isArray(option)) return
    setSelectedProduct(option || null)
    productField.setValue(option?.value || null)
    variantField.setValue(null)
    setSelectedVariant(null)
    variantInfoField.setValue(null)
  }

  const handleVariantChange = (option: Option<unknown> | Option<unknown>[]) => {
    if (Array.isArray(option)) return

    const variantOption = option as VariantOption
    setSelectedVariant(variantOption)
    productField.setValue(selectedProduct?.value || null)

    if (variantOption && variantOption.stock <= 0) {
      console.warn('Selected variant is out of stock')
      toast.info('Selected variant is out of stock')
      return
    }

    variantField.setValue(variantOption?.value || null)

    if (variantOption) {
      variantInfoField.setValue({
        id: variantOption.value,
        price: variantOption.price,
        stock: variantOption.stock,
        title: variantOption.label,
      })
    } else {
      variantInfoField.setValue(null)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '10px',
        width: '100%',
      }}
    >
      <div style={{ flex: 1 }}>
        <Select
          options={productOptions}
          onChange={handleProductChange}
          value={selectedProduct}
          isClearable
          placeholder="Select Product"
        />
      </div>
      <div style={{ flex: 1 }}>
        <Select
          key={selectedVariant?.value || 'empty'}
          options={variantOptions}
          onChange={handleVariantChange}
          value={selectedVariant}
          isClearable
          placeholder="Select Variant"
          disabled={!selectedProduct}
        />
      </div>
    </div>
  )
}
