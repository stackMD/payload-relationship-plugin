import { CollectionConfig } from 'payload'

const SalesItems: CollectionConfig = {
  slug: 'salesItems',
  admin: {
    group: 'Sales',
  },
  fields: [
    {
      name: 'sale',
      type: 'relationship',
      relationTo: 'sales',
      hasMany: false,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'custom-product-variant-select',
          type: 'ui',
          admin: {
            components: {
              Field: {
                path: '@/components/CustomProductSelect#CustomProductVariantSelect',
                serverProps: {
                  arrayParentPath: 'salesItemsArray',
                  productPath: 'product',
                  variantPath: 'product_variant',
                  varinatInfoPath: 'varinatInfo',
                },
              },
            },
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'product',
          required: true,
          label: 'Product',
          admin: {
            readOnly: true,
            allowCreate: false,
            allowEdit: false,
          },
        },
        {
          name: 'product_variant',
          type: 'relationship',
          relationTo: 'productsVariants',
          label: 'Variant',
          required: true,
          admin: {
            readOnly: true,
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'price',
          type: 'number',
          min: 0,
          validate: (value: any, { data, siblingData }: { data: any; siblingData: any }) => {
            const recommendedPrice = siblingData.varinatInfo?.price
            if (!value) {
              return 'Price is required'
            }
            if (recommendedPrice && value < recommendedPrice) {
              return `Price cannot be less than the recommended price of ${recommendedPrice}`
            }

            return true
          },
        },
        {
          name: 'quantity',
          type: 'number',
          min: 0,
          validate: (value: any, { siblingData }: { siblingData: any }) => {
            const availableStock = siblingData.varinatInfo?.stock
            if (!value) {
              return 'Quantity is required'
            }
            if (availableStock && value > availableStock) {
              return `Quantity cannot exceed available stock of ${availableStock}`
            }

            return true
          },
        },
      ],
    },
    { name: 'varinatInfo', type: 'json', virtual: true },
  ],
}

export default SalesItems
