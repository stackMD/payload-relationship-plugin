import {
  CollectionAfterChangeHook,
  CollectionAfterReadHook,
  CollectionBeforeChangeHook,
} from 'payload'
import {
  RelationShipConfig,
  RelationshipWithCurrentCollection,
} from '../fields/unified-relationship.js'
import { handleRelationCreate } from '../operations/create.js'
import { handleRelationUpdate } from '../operations/update.js'
import { RelationPluginContext } from '../types.js'

export function setupWithPayloadHooks(
  relationshipField: RelationshipWithCurrentCollection,
  relatedToFieldConfig: RelationShipConfig,
  // currentCollectionNameInRelationTo: string,
) {
  const { relationTo, name, currentCollection } = relationshipField
  const { reverseRelationField, addDefaultField, customArrayOverrides } = relatedToFieldConfig
  const arrayName =
    !addDefaultField && !customArrayOverrides?.name
      ? name
      : customArrayOverrides?.name || `${name}Array`

  const currentCollectionNameInRelationTo =
    reverseRelationField &&
    'name' in reverseRelationField &&
    typeof reverseRelationField.name === 'string'
      ? reverseRelationField.name
      : undefined

  if (!currentCollectionNameInRelationTo) {
    console.error('not found in ', currentCollectionNameInRelationTo)
    return
  }

  return {
    afterRead: [
      // async ({ req, findMany, context, doc }) => {
      //   if (
      //     (context.relationPlugin as RelationPluginContext)?.updateFinished ||
      //     (context.relationPlugin as RelationPluginContext)?.createFinished
      //   ) {
      //     return
      //   }
      //   // If we don't use findMany, there is infinite loop
      //   if (!findMany) {
      //     if (!doc) return
      //     const relations = doc[name]
      //     // console.log('relation inside afterRead', relations)
      //     const populatedRelations = []
      //     for (const item of relations) {
      //       // Support both direct IDs and populated objects with `id`
      //       // sometimes the item can be an object and localApi will give me an error, so i need to check if it is an object and if it is, i need to get the id if not just return the item
      //       const relationId = item && typeof item === 'object' && 'id' in item ? item.id : item
      //       try {
      //         const result = await req.payload.find({
      //           collection: relationTo as string,
      //           where: {
      //             id: {
      //               equals: relationId,
      //             },
      //           },
      //           req,
      //         })
      //         if (result?.docs?.[0]) {
      //           populatedRelations.push(result.docs[0])
      //         }
      //       } catch (err) {
      //         console.error(`Failed to fetch relation in afterRead: ${relationId}:`, err)
      //       }
      //     }
      //     // Attach the populated relations to the response data
      //     doc[arrayName] = populatedRelations
      //   }
      // },
    ] as CollectionAfterReadHook[],
    beforeChange: [
      async ({ operation, context, data }) => {
        if (
          (context.relationPlugin as RelationPluginContext)?.updateFinished ||
          (context.relationPlugin as RelationPluginContext)?.createFinished ||
          (context.relationPlugin as RelationPluginContext)?.skipCreate ||
          (context.relationPlugin as RelationPluginContext)?.isRelsUpdate
        ) {
          const relationPlugin = context.relationPlugin as RelationPluginContext

          context.relationPlugin = {
            createFinished: relationPlugin?.createFinished,
            updateFinished: relationPlugin?.updateFinished,
            isRelsUpdate: relationPlugin?.isRelsUpdate,
            skipCreate: relationPlugin?.skipCreate,
          }
          return
        }

        if (operation === 'create') {
          context.relationPlugin = {
            isRelationCreate: true,
            [arrayName]: data?.[arrayName],
          }
        } else if (operation === 'update') {
          context.relationPlugin = {
            isRelationUpdate: true,
            [arrayName]: data?.[arrayName],
          }
        }
      },
    ] as CollectionBeforeChangeHook[],

    // TODO: i am using current collection right now but it it give me an error when updating the relationTo collection as the name could be diffrent,
    // so i need to check the relation name in the relatedTo fields and get it's name in case there is a diffrence.
    // hopefully the slug will not change so this could be the best approach

    afterChange: [
      async ({ req, operation, context, doc, previousDoc }) => {
        const relationContext = (context.relationPlugin as RelationPluginContext) || undefined
        if (operation === 'create' && relationContext.isRelationCreate) {
          const {
            isRelationCreate,
            isRelationUpdate,
            createFinished,
            updateFinished,
            isRelsUpdate,
            ...rest
          } = context.relationPlugin as RelationPluginContext

          if (isRelationUpdate) return
          if (!doc) return
          if (!isRelationCreate) return
          if (isRelsUpdate) return
          if (createFinished) return
          if (!rest[arrayName]) return
          // Local Api create method
          const addedNewRelations = await handleRelationCreate({
            context,
            doc,
            req,
            arrayName,
            relationTo: relationTo as string,
            currentCollection,
            name,
            currentCollectionNameInRelationTo,
          })

          if (addDefaultField) {
            try {
              // Update the original collection with the new relations IDs
              const result = await req.payload.update({
                collection: currentCollection,
                id: doc.id,
                data: {
                  [name]: addedNewRelations.map((relation) => relation.id),
                },
                req,
                context: {
                  ...context,
                  relationPlugin: {
                    isRelsUpdate: true,
                  },
                },
              })
              context.relationPlugin = {
                createFinished: true,
              }
              // this context work, the before was not???
              req.context.relationPlugin = {
                createFinished: true,
              }

              return result
            } catch (err) {
              console.error(`Error updating original ${currentCollection}:`, err)
              throw new Error(`Error creating ${relationTo} Relation:`, err as ErrorOptions)
            }
          }

          return { ...doc, [arrayName]: addedNewRelations }

          // Update operation
        } else if (operation === 'update' && relationContext.isRelationUpdate) {
          const {
            isRelationCreate,
            isRelationUpdate,
            createFinished,
            updateFinished,
            skipCreate,
            isRelsUpdate,
            ...rest
          } = context.relationPlugin as RelationPluginContext
          // if (context.updateFinished) {
          //   // TODO: i may remove delete for the context will see
          //   delete rest[arrayName]
          //   delete context.relationPlugin.isRelationUpdate
          //   return
          // }
          if (isRelationCreate || createFinished) return
          if (isRelsUpdate) return
          if (!rest[arrayName]) return
          if (skipCreate) return
          const updatedRelatedDoc = await handleRelationUpdate({
            context,
            doc,
            previousDoc,
            req,
            arrayName,
            relationTo: relationTo as string,
            currentCollection,
            name,
            currentCollectionNameInRelationTo,
          })

          if (addDefaultField) {
            try {
              // TODO: I NEED TO CHECK ORIGNALdATA FOR THE DEFAULT ID IF IT IS NUMBER CONVERT IT IF NOT MAKE IT STRING
              // Update the original collection with the new relations IDs
              const currentCollectionUpdate = await req.payload.update({
                collection: currentCollection,
                where: { id: { equals: doc.id } },
                data: {
                  [name]: updatedRelatedDoc?.map((relation) =>
                    typeof relation.id === 'string' ? relation.id : parseInt(relation.id),
                  ),
                },
                req,
                context: {
                  ...context,
                  relationPlugin: { isRelsUpdate: true },
                },
              })

              context.relationPlugin = {
                updateFinished: true,
              }
              // this context work, the before was not???
              req.context.relationPlugin = {
                updateFinished: true,
              }

              return currentCollectionUpdate.docs[0]
            } catch (err) {
              console.error(`Error updating original ${currentCollection}:`, err)
            }
          }

          return { ...doc, [arrayName]: updatedRelatedDoc }
        }
      },
    ] as CollectionAfterChangeHook[],
  }
}
