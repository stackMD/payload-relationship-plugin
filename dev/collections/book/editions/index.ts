import { CollectionConfig } from 'payload'

export const Editions: CollectionConfig = {
  slug: 'editions',
  admin: {
    group: 'Library',
  },
  fields: [
    { name: 'editionNumber', type: 'number', required: true },
    { name: 'publishedYear', type: 'number' },
    {
      name: 'book',
      type: 'relationship',
      relationTo: 'book',
      hasMany: false,
      admin: { readOnly: true }, // Prevent manual editing of the link
    },
  ],
}
