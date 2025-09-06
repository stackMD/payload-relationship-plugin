import {
  Field,
  RelationshipField,
  deepMerge,
  ArrayField,
  FieldHook,
  CollectionAfterChangeHook,
  PayloadRequest,
} from 'payload'

import {
  DynamicData,
  extractNamedFieldsWithFunction,
  generateDynamicExclusionFunction,
} from '..//utils/utils.js'
import {
  NormalRelationConfig,
  RelationShipConfig,
  RelationshipWithCurrentCollection,
} from './unified-relationship.js'
import { RelationshipPluginConfig } from 'src/index.js'
import { HookArgs } from 'src/hooks/without-payload-hooks.js'
import { RelationPluginContext } from 'src/types.js'

type CustomRelationshipType = (
  /**
   * Field overrides
   */
  relationshipField: RelationshipWithCurrentCollection,

  /**
   * Additional configuration for processing the value
   */
  options: NormalRelationConfig,
  pluginConfig?: RelationshipPluginConfig,
) => Field[]

export const RelationshipArrayField: CustomRelationshipType = (
  relationshipField,
  relatedToFieldConfig,
  pluginConfig,
) => {
  // TODO: added a check if relationTo is string, i will not support it right now
  const { relationTo, name, hasMany = false, currentCollection, type } = relationshipField
  const {
    fieldsToRender = [],
    fieldsToExclude,
    addDefaultField = true,
    hideDefaultField = true,
    customArrayOverrides,
    reverseRelationField,
  } = relatedToFieldConfig

  const arrayName =
    !addDefaultField && !customArrayOverrides?.name
      ? name
      : customArrayOverrides?.name || `${name}Array`

  // Generate the exclusion function based on dynamic conditions
  const exclusionFunction = generateDynamicExclusionFunction(fieldsToExclude, {
    allowRequiredExceptions: [
      {
        name: reverseRelationField?.name,
        type: 'relationship',
        relationTo:
          typeof currentCollection === 'string' ? currentCollection : currentCollection[0],
      },
      { name: 'order', type: 'number' },
    ],
  })

  const filtredFieldsToRender = extractNamedFieldsWithFunction(fieldsToRender, {
    exclude: exclusionFunction,
    preserveLayout: true,
  })

  // Log excluded fields after the exclusion function
  // console.log('Fields to Render:', FieldsToRender)
  const relationshipMergedField = deepMerge<Omit<RelationshipField, 'type'>, RelationshipField>(
    relationshipField,
    {
      // Default values
      type: 'relationship',
      admin: {
        allowCreate: false,
        allowEdit: false,
        hidden: hideDefaultField ? true : false,
        components: {
          Description: '@stackmd/payload-relationship-plugin/client#RelationshipDescription',
        },
      },
      hooks: { afterChange: [] },
    },
  )

  const ArrayFieldpMergedField = deepMerge<Omit<ArrayField, 'type'>, ArrayField>(
    {
      name: arrayName,
      label: `Relationship ${name}`,
      virtual: true,
      hooks: {
        afterRead: [
          // i use the afterField hook becuase in the prevoiusDoc the field is not poulated in the afterChangeCollectionHook, if i use the collection afterREadHook,
          // but if i use the afterReadField hook it is populated and i don't need to fetch it again, is it bug or not??
          !addDefaultField
            ? afterReadFieldHook({
                arrayName,
                relationshipField,
                reverseRelationName: reverseRelationField?.name || '',
              })
            : async ({ req, operation, data, findMany, context, originalDoc }) => {
                if (context.RelationUpdateFinished) {
                  return
                }
                // If we don't use findMany, there is infinite loop
                if (operation === 'read' && !findMany) {
                  if (!data) return
                  // Imp: this is using the _rels table to populate the array
                  const relations = data[name]
                  const populatedRelations = []
                  for (const item of relations) {
                    // Support both direct IDs and populated objects with `id`
                    // sometimes the item can be an object and localApi will give me an error, so i need to check if it is an object and if it is, i need to get the id if not just return the item
                    const relationId =
                      item && typeof item === 'object' && 'id' in item ? item.id : item
                    try {
                      const result = await req.payload.find({
                        collection: relationTo as string,
                        where: {
                          id: {
                            equals: relationId,
                          },
                        },
                        req,
                      })
                      if (result?.docs?.[0]) {
                        populatedRelations.push(result.docs[0])
                      }
                    } catch (err) {
                      console.error(`Failed to fetch relation in afterRead: ${relationId}:`, err)
                    }
                  }
                  // Attach the populated relations to the response data
                  data[arrayName] = populatedRelations
                }
              },
        ],
      },
    },
    {
      ...customArrayOverrides,
      type: 'array',
      fields: filtredFieldsToRender,
      maxRows: hasMany ? undefined : 1,
    },
  )

  return !addDefaultField
    ? [ArrayFieldpMergedField]
    : [relationshipMergedField, ArrayFieldpMergedField]
}

const afterReadFieldHook = (args: HookArgs): FieldHook<any, any, any> => {
  return async ({ req, context, findMany, data }) => {
    if (
      (context.relationPlugin as RelationPluginContext)?.updateFinished ||
      (context.relationPlugin as RelationPluginContext)?.createFinished ||
      (context.relationPlugin as RelationPluginContext)?.isRelsUpdate
    ) {
      return
    }
    if (!findMany) {
      if (!data) return
      const collectionToFind =
        typeof args.relationshipField.relationTo === 'string'
          ? args.relationshipField.relationTo
          : args.relationshipField.relationTo[0]

      const result: any = await req.payload.db.find({
        collection: collectionToFind,
        where: { [args.reverseRelationName]: { equals: data.id } },
        sort: 'order',
      })

      data[args.arrayName] = result.docs
      return result.docs
    }

    if (findMany) {
      if (!data) return
      const collectionToFind =
        typeof args.relationshipField.relationTo === 'string'
          ? args.relationshipField.relationTo
          : args.relationshipField.relationTo[0]

      const result: any = await req.payload.db.find({
        collection: collectionToFind,
        where: { [args.reverseRelationName]: { equals: data.id } },
        sort: 'order',
      })

      data[args.arrayName] = result.docs
      return result.docs
    }
  }
}
