import { CollectionConfig } from 'payload'
import { createRelationPluginField } from '../../../src/fields/unified-relationship.js'

const Sales: CollectionConfig = {
  slug: 'sales',
  admin: {
    useAsTitle: 'customerName',
    defaultColumns: ['customerName', 'total', 'date'],
    group: 'Sales',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'customerName',
      type: 'text',
      required: true,
      label: 'Customer Name',
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Phone',
    },
    {
      name: 'address',
      type: 'textarea',
      label: 'Address',
    },
    {
      name: 'salesItems',
      type: 'relationship',
      relationTo: 'salesItems',
      hasMany: true,
      custom: {
        ...createRelationPluginField({
          create: true,
          config: {
            // fieldsToExclude: [{ name: 'stock', type: 'number' }],
            addDefaultField: true,
            hideDefaultField: false,
            customArrayOverrides: {
              name: 'salesItemsArray',
              label: 'Sale Item',
            },
          },
        }),
      },
    },

    {
      name: 'total',
      type: 'number',
      label: 'Total',
      min: 0,
      // required: true,
      admin: {
        components: {
          Field: '@/components/SalesTotal#SaleTotal',
        },
      },
    },
    // {
    //   name: 'date',
    //   type: 'date',
    //   required: true,
    //   label: 'Date',
    //   admin: {
    //     position: 'sidebar',
    //   },
    // },

    // prevoius Items
    // {
    //   name: 'items',
    //   type: 'array',
    //   required: true,
    //   label: 'Items',
    //   minRows: 1,
    //   fields: [
    //     {
    //       name: 'variant',
    //       type: 'relationship',
    //       relationTo: 'productVariant',
    //       required: true,
    //       label: 'Product',
    //     },
    //     {
    //       name: 'quantity',
    //       type: 'number',
    //       required: true,
    //       min: 1,
    //       label: 'Quantity',
    //     },
    //     {
    //       name: 'price',
    //       type: 'number',
    //       required: true,
    //       min: 0,
    //       label: 'Price',
    //     },
    //     {
    //       name: 'total',
    //       type: 'number',
    //       required: true,
    //       min: 0,
    //       label: 'Total',
    //     },
    //   ],
    // },

    // New Sales Items will try relationship to SalesItems collection
    // {
    //   name: 'items',
    //   type: 'array',
    //   // virtual: true,
    //   fields: [
    //     {
    //       type: 'row',
    //       fields: [
    //         {
    //           name: 'custom-product-variant-select',
    //           type: 'ui',
    //           admin: {
    //             components: {
    //               Field: {
    //                 path: '@/collections/Sales/components/CustomProductSelect#CustomProductVariantSelect',
    //                 serverProps: {
    //                   arrayParentPath: 'items',
    //                   productPath: 'product',
    //                   variantPath: 'product_variant',
    //                   varinatInfoPath: 'varinatInfo',
    //                 },
    //               },
    //             },
    //           },
    //         },
    //       ],
    //     },
    //     {
    //       type: 'row',
    //       fields: [
    //         {
    //           name: 'product',
    //           type: 'relationship',
    //           relationTo: 'product',
    //           required: true,
    //           label: 'Product',
    //           admin: {
    //             readOnly: true,
    //             allowCreate: false,
    //             allowEdit: false,
    //           },
    //         },
    //         {
    //           name: 'product_variant',
    //           type: 'relationship',
    //           relationTo: 'productVariant',
    //           label: 'Variant',
    //           required: true,
    //           admin: {
    //             readOnly: true,
    //           },
    //         },
    //       ],
    //     },
    //     {
    //       type: 'row',
    //       fields: [
    //         {
    //           name: 'price',
    //           type: 'number',
    //           min: 0,
    //           validate: (value: any, { data, siblingData }: { data: any; siblingData: any }) => {
    //             const recommendedPrice = siblingData.varinatInfo?.price
    //             if (!value) {
    //               return 'Price is required'
    //             }
    //             if (recommendedPrice && value < recommendedPrice) {
    //               return `Price cannot be less than the recommended price of ${recommendedPrice}`
    //             }

    //             return true
    //           },
    //         },
    //         {
    //           name: 'quantity',
    //           type: 'number',
    //           min: 0,
    //           validate: (value: any, { siblingData }: { siblingData: any }) => {
    //             const availableStock = siblingData.varinatInfo?.stock
    //             if (!value) {
    //               return 'Quantity is required'
    //             }
    //             if (availableStock && value > availableStock) {
    //               return `Quantity cannot exceed available stock of ${availableStock}`
    //             }

    //             return true
    //           },
    //         },
    //       ],
    //     },
    //     { name: 'varinatInfo', type: 'json', virtual: true },
    //   ],
    // },
  ],

  hooks: {
    afterChange: [
      async ({ context, operation }) => {
        console.log('inside sale operation', operation)
        console.log('inside sale context', context)
      },
    ],
  },
}

export default Sales
