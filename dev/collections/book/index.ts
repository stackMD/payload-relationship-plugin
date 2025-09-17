import type { CollectionConfig } from 'payload'

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
      hasMany: true,
      relationTo: 'editions',
    },
  ],
  hooks: {
    beforeChange: [
      ({ collection, data }) => {
        console.log('data inside', collection.slug, data)
      },
    ],
  },
}
