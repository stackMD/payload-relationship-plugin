import { PayloadRequest } from 'payload'
import { RelationPluginContext } from '../types.js'
import { HookArgs } from '../hooks/without-payload-hooks.js'

export type CreateDBDirect = {
  req: PayloadRequest
  relationContext: RelationPluginContext
  args: HookArgs
  doc: any
}

export const createDBDirect = async ({
  req,
  relationContext,
  args,
  doc,
}: CreateDBDirect) => {
  const addedIdToRelation = relationContext?.[args.arrayName] as any[]

  // Add null check to prevent error when array is undefined
  if (!addedIdToRelation || !Array.isArray(addedIdToRelation)) {
    return []
  }

  const relationsWitoutIdAndWithDocId = addedIdToRelation.map(({ id, ...rest }, index) => {
    return {
      ...rest,
      order: index + 1,
      [args.reverseRelationName]: doc.id,
    }
  }) as any[]

  //  * The current payload relationship flow:
  //  * When creating a new record (e.g., `Product`), if we pass a `relationTo` field (e.g., `variants`) with an ID
  //  * that exists in the related collection (e.g., `productVariants`), Payload CMS will link it *without* validating if the referenced variant actually belongs to this product.
  //  * Example of the issue:
  //  * 1. Create `Product A` (id: "prod_123")
  //  * 2. Create `Variant X` (id: "var_456") and assign it to `Product A`
  //  * 3. Now, create `Product B` (id: "prod_789")
  //  * 4. If you pass `variants: ["var_456"]` in `Product B`'s payload, Payload will link `Variant X` to `Product B`
  //  * - Even though `Variant X` was originally tied to `Product A`!
  const addedNewRelations = await Promise.all(
    relationsWitoutIdAndWithDocId.map(async (relation: any) => {
      try {
        let newRelation
        if (typeof args.relationshipField.relationTo === 'string') {
          newRelation = await req.payload.db.create({
            collection: args.relationshipField.relationTo,
            data: relation,
            req,
          })
        }
        return newRelation
      } catch (err) {
        console.error(`Error creating ${args.relationshipField.relationTo} Relation:`, err)
        throw new Error(
          `Error creating ${args.relationshipField.relationTo} Relation:`,
          err as ErrorOptions,
        )
      }
    }),
  )

  return addedNewRelations
}
