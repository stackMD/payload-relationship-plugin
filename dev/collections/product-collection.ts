import type { CollectionConfig } from 'payload'

import { populateFieldFromCollection } from '../../src/fields/unified-relationship.js'

export const Product: CollectionConfig = {
  slug: 'product',
  admin: {
    group: 'Product',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'options',
      type: 'array',
      fields: [
        {
          name: 'option',
          type: 'text',
        },
        {
          name: 'values',
          type: 'array',
          fields: [
            {
              name: 'id',
              type: 'text',
              admin: {
                // disabled: true,
              },
            },
            {
              name: 'value',
              type: 'text',
            },
          ],
        },
      ],
    },
    {
      name: 'variants',
      type: 'array',
      custom: populateFieldFromCollection({
        fieldsToExclude: [{ name: 'product' }],
        populateFrom: 'productsVariants',
      }),
      fields: [],
      virtual: true,
    },
    // {
    //   name: 'custom',
    //   type: 'ui',
    //   admin: {
    //     components: {
    //       Field: '@/components/Custom#Custom',
    //     },
    //   },
    // },

    // {
    //   name: 'variants',
    //   type: 'relationship',
    //   relationTo: 'productsVariants',
    //   hasMany: true,
    //   custom: { allowcreate: true },
    // },
    // ...RelationshipArrayField(
    //   {
    //     name: 'variant',
    //     type: 'normal-relationship',
    //     relationTo: 'productsVariants',
    //     currentCollection: 'product',
    //     hasMany: true,
    //   },
    //   {
    //     fieldsToRender: Variants.fields,
    //     fieldsToExclude: [{ name: 'title', type: 'text' }],
    //     addDefaultRelation: true,
    //   },
    // ),
    // TODO: can't add fieldsToRender here i need to add it in the plugin becuase i get an error ⨯ ReferenceError: Cannot access 'Variants' before initialization
    // ...RenderUnifiedRelationship(
    //   {
    //     name: 'variant',
    //     type: 'normal-relationship',
    //     relationTo: 'productsVariants',
    //     currentCollection: 'product',
    //     hasMany: true,
    //   },
    //   {
    //     fieldsToRender: Variants.fields ? Variants.fields : [],
    //     fieldsToExclude: [{ name: 'title', type: 'text' }],
    //     addDefaultRelation: true,
    //   },
    // ),
  ],
}
