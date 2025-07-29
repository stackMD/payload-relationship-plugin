import { randomUUID } from 'crypto'
import { CollectionConfig } from 'payload'

export const Variants: CollectionConfig = {
  slug: 'productsVariants',
  access: {
    create: () => true,
    delete: () => true,
    read: () => true,
    update: () => true,
  },
  admin: {
    defaultColumns: ['title', 'price'],
    useAsTitle: 'title',

    group: 'Product',
  },
  fields: [
    {
      name: 'vid',
      type: 'text',
      admin: {
        disabled: true,
      },
      label: 'Variant ID',
      defaultValue: () => {
        return randomUUID()
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'price',
      type: 'number',
      required: true,
    },
    {
      name: 'stock',
      type: 'number',
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'product',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'options',
      type: 'array',
      fields: [
        {
          name: 'option_id',
          type: 'text',
          admin: { disabled: true },
        },
        {
          name: 'option',
          type: 'text',
          required: true,
        },
        {
          name: 'value',
          type: 'text',
          required: true,
        },
        {
          name: 'value_id',
          type: 'text',
          admin: { disabled: true },
        },
      ],
      label: 'Options',
    },
  ] as const,
  hooks: {
    afterChange: [
      async ({ operation, collection, context }) => {
        console.log('operation', operation, 'inside', collection.slug)
        console.log('context inside', collection.slug, context)
      },
    ],
    afterDelete: [
      async ({ collection, context }) => {
        console.log('operation', 'delete', 'inside', collection.slug)
        console.log('context inside', collection.slug, context)
      },
    ],
  },
} as const
