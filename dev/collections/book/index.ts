import { CollectionConfig } from 'payload'
import { createRelationPluginField } from '../../../src/fields/unified-relationship.js'

export const Book: CollectionConfig = {
  slug: 'book',
  admin: {
    group: 'Library',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'editions',
      type: 'relationship',
      relationTo: 'editions',
      hasMany: true,
      custom: {
        ...createRelationPluginField({
          create: true,
          config: {
            addDefaultField: false,
            hideDefaultField: false,
            // You can add fieldsToExclude or customArrayOverrides if needed
          },
        }),
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, collection }) => {
        console.log('data inside', collection.slug, data)
      },
    ],
  },
}
