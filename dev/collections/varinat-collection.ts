import type { CollectionConfig } from 'payload'

import { randomUUID } from 'crypto'

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
      defaultValue: () => {
        return randomUUID()
      },
      label: 'Variant ID',
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
      admin: {
        position: 'sidebar',
      },
      relationTo: 'product',
      required: true,
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
      async ({ collection, context, operation }) => {
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
