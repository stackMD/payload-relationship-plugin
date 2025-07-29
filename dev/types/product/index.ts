import { Option } from '@payloadcms/ui/elements/ReactSelect'
import { Product, ProductsVariant } from 'payload-types.js'

export type ProductOptions = NonNullable<Product>[]
// Define a new type that ensures the `variants` field contains full ProductVariant objects,
// not just IDs. This is useful when working with populated product data (e.g., from an API)
// where variants are fully expanded, allowing safe access to properties like title, price, etc.
export type ProductWithVariants = Omit<Product, 'variants'> & {
  variants: ProductsVariant[]
}

export type ProductVariants = NonNullable<ProductsVariant>[][number]
export type ProductVariantOptions = NonNullable<ProductsVariant['options']>[number]

export interface OptionValue extends Option {
  label: string
  __isNew__?: boolean
}

export interface ProductOption {
  id?: string
  option: string
  values: OptionValue[]
}
