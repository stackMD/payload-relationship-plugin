import { CollectionConfig } from 'payload'
import { createRelationPluginField } from '../../src/fields/unified-relationship.js'
import { Variants } from './varinat-collection.js'

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
      type: 'relationship',
      relationTo: 'productsVariants',
      hasMany: true,
      custom: {
        ...createRelationPluginField({
          create: true,
          // ordered: true,
          config: {
            addDefaultField: true,
            hideDefaultField: false,
            fieldsToExclude: [],
            customArrayOverrides: {
              // name: 'variantsArray',
            },
          },
        }),
      },
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
  hooks: {
    afterChange: [
      async ({ req, operation, context, doc, collection }) => {
        console.log('operation', operation, 'inside', collection.slug)
        console.log('context', context)

        if (operation === 'create') {
          // console.log('create operation')
          // console.log('create inside collection', doc)
        }
      },
    ],
  },
}
