import { PayloadRequest } from 'payload'
import { RelationPluginContext } from '../types.js'

export async function handleRelationCreate({
  context,
  doc,
  req,
  arrayName,
  relationTo,
  currentCollection,
  name,
  currentCollectionNameInRelationTo,
}: {
  context: any
  doc: any
  req: PayloadRequest
  arrayName: string
  relationTo: string
  currentCollection: string
  name: string
  currentCollectionNameInRelationTo: string
}) {
  const { isRelationCreate, isRelationUpdate, createFinished, updateFinished, ...rest } =
    context.relationPlugin as RelationPluginContext
  // TODO: when creating i am calling update function on the current collection, so current collection get update operation after creating the relationTo,
  // so it will miss the context in current collection after create operation, and you will get operation update before opeation create in afterChange in collection hooks.
  // to understand this, when i am inside the create operation inside the  afterChange collection hook, the operation will be updated before it is create, so when it should be create then update,
  // but becuase i am calling update inside afterChange it will go for update operation then start create operation, so i need to prevent this by adding a context.
  // i may use drizzle to handle this situation, but i need to find a better solution.

  const relatedItemToCreate = rest[arrayName]

  const relationsWithoutId = relatedItemToCreate.map(({ id, ...rest }: any) => rest) as any[]
  let addedRelations: any[] = []

  try {
    // Create related collection
    addedRelations = await Promise.all(
      relationsWithoutId.map(async (relation: any) => {
        try {
          const newRelation = await req.payload.create({
            collection: relationTo,
            data: {
              ...relation,
              [currentCollectionNameInRelationTo]: doc.id,
            },
            req,
          })
          return newRelation
        } catch (err) {
          console.error(`Error creating ${relationTo} Relation:`, err)
          throw new Error(`Error creating ${relationTo} Relation:`, err as ErrorOptions)
        }
      }),
    )

    // Filter out failed creations (null values)
    addedRelations = addedRelations.filter((relation) => relation !== null)
  } catch (err) {
    console.error('Unexpected error during relation creation:', err)
  }

  return addedRelations
}
