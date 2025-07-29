import {
  CollectionAfterChangeHook,
  CollectionAfterReadHook,
  CollectionBeforeChangeHook,
} from 'payload'
import {
  NormalRelationConfig,
  RelationShipConfig,
  RelationshipWithCurrentCollection,
} from '../fields/unified-relationship.js'
import { MyDrizzleTable, RelationPluginContext } from 'src/types.js'
import { updateDBDirect } from '../operations/update-direct.js'
import { createDBDirect } from '../operations/create-direct.js'
import { RelationshipPluginConfig } from '../index.js'
import {
  createDBDrizzleDirect,
  isValidDrizzleTableConfig,
  updateDBDrizzleDirect,
} from '../operations/drizzle.js'

type SetupWithoutPayloadHooks = {
  relationshipField: RelationshipWithCurrentCollection
  relatedToFieldConfig: RelationShipConfig
  _relsUpdate?: boolean
  orderd?: boolean
  pluginConfig: RelationshipPluginConfig
  drizzleTable?: MyDrizzleTable
}

export type HookArgs = {
  relationshipField: RelationshipWithCurrentCollection
  arrayName: string
  relatedToFieldConfig?: NormalRelationConfig
  reverseRelationName: string
  relatedToCollection?: string
  orderd?: boolean
  updateRelsTable?: boolean
  drizzleTable?: MyDrizzleTable
}

// TODO: this method will not call req.payload it will call req.payload.db directly, so it will not call any hooks in the relationTo and in the currentCollection when updating the relations field in it,
// methods that this will not call:
// - saveVersion in payload.
// - collection and fields hooks.
// - will not call Send verification email if applicable.
// methods i may call:
// - sanitizeInternalFields, i could not export it from payload, so i just copy the underline function into my own app:
// const sanitizeInternalFields = (incomingDoc)=>{ Create a new object to hold the sanitized fields    const newDoc = {};    for(const key in incomingDoc){        const val = incomingDoc[key];        if (key === '_id') {            newDoc['id'] = val;        } else if (key !== '__v') {            newDoc[key] = val;        }    }return newDoc;};export default sanitizeInternalFields;.
// - i may add resultWithLocale.
// - also i may add sanitizeSelect and pass it in payalod.db.

// in this method i detach from payload relationship workflow as the select method with relationship type is you have add the relations in collecion_rels table to appear in the select method,
// but in this setup i just search the table directly for where current collection equal id, and it return all relationTo records as i don't need to also search for colleciton_rels and it does not have to be present in that tabel.
// TODO: i just need to comment the update current collection with the new relations

export function setupWithoutPayloadHooks({
  relationshipField,
  relatedToFieldConfig,
  _relsUpdate,
  orderd,
  pluginConfig,
  drizzleTable,
}: SetupWithoutPayloadHooks) {
  const { name, relationTo } = relationshipField
  const { addDefaultField, customArrayOverrides, reverseRelationField } = relatedToFieldConfig
  // const arrayName = relatedToFieldConfig.customArrayOverrides?.name || `${name}Array`
  const arrayName =
    !pluginConfig?.usePayloadHooks && !addDefaultField && !customArrayOverrides?.name
      ? name
      : customArrayOverrides?.name || `${name}Array`
  const relatedToCollection = typeof relationTo === 'string' ? relationTo : relationTo[0]

  const reverseRelationName =
    reverseRelationField &&
    'name' in reverseRelationField &&
    typeof reverseRelationField.name === 'string'
      ? reverseRelationField.name
      : undefined

  if (!reverseRelationName) {
    throw new Error("Can't find reverse Relation")
    return
  }

  return {
    afterRead: [
      // afterReadHook({
      //   arrayName,
      //   relationshipField,
      //   relatedToFieldConfig,
      //   reverseRelationName,
      //   orderd,
      //   relatedToCollection,
      // }),
    ],
    beforeChange: [beforeChangeHook({ arrayName, relationshipField, reverseRelationName })],
    afterChange: [
      afterChangeHook({
        relationshipField,
        arrayName,
        reverseRelationName,
        relatedToCollection,
        updateRelsTable: addDefaultField,
        drizzleTable,
      }),
    ],
  }
}

// export const afterReadHook = (args: HookArgs): CollectionAfterReadHook => {
//   const { addDefaultField } = args.relatedToFieldConfig || {}

//   return async ({ req, context, findMany, doc }) => {
//     if (
//       (context.relationPlugin as RelationPluginContext)?.updateFinished ||
//       (context.relationPlugin as RelationPluginContext)?.createFinished
//     ) {
//       return
//     }

//     if (!findMany) {
//       if (!doc) return
//       if (!args.relatedToCollection) return

//       const result = await req.payload.db.find({
//         collection: args.relatedToCollection,
//         where: { [args.reverseRelationName]: { equals: doc.id } },
//         sort: args.orderd || addDefaultField ? 'order' : undefined,
//       })

//       // const resultRecord = args.orderd
//       //   ? result.docs.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
//       //   : result.docs

//       doc[args.arrayName] = result.docs
//     }
//   }
// }

const beforeChangeHook = (args: HookArgs): CollectionBeforeChangeHook => {
  // now i can access both:
  // - payload hook args (operation, context, data)
  // - my custom args.
  return async ({ operation, context, data }) => {
    if (
      (context.relationPlugin as RelationPluginContext)?.updateFinished ||
      (context.relationPlugin as RelationPluginContext)?.createFinished
    ) {
      const relationPlugin = context.relationPlugin as RelationPluginContext

      context.relationPlugin = {
        createFinished: relationPlugin?.createFinished,
        updateFinished: relationPlugin?.updateFinished,
      }
      return
    }

    if (operation === 'create') {
      context.relationPlugin = {
        isRelationCreate: true,
        [args.arrayName]: data?.[args.arrayName],
      }
    } else if (operation === 'update') {
      context.relationPlugin = {
        isRelationUpdate: true,
        [args.arrayName]: data?.[args.arrayName],
      }
    }
  }
}

const afterChangeHook = (args: HookArgs): CollectionAfterChangeHook => {
  // now i can access both:
  // - payload hook args (operation, context, data)
  // - my custom args
  return async ({ operation, context, doc, previousDoc, req, collection }) => {
    const relationContext = (context.relationPlugin as RelationPluginContext) || undefined

    if (operation === 'create' && relationContext.isRelationCreate) {
      let addedNewRelations: any[] | undefined = []

      if (args.drizzleTable && isValidDrizzleTableConfig(args.drizzleTable)) {
        // TODO: keep this code for now i will just use drizzle at update then i will handle create
        // // Call your Drizzle-specific function
        addedNewRelations = await createDBDrizzleDirect({
          req,
          relationContext,
          args,
          doc,
          drizzleTable: args.drizzleTable,
        })
      } else {
        addedNewRelations = await createDBDirect({
          req,
          relationContext,
          args,
          doc,
        })
      }
      // i added an option, to optionally add it or not, but i also need a hook in the relationTo to update the the the field in the current collection,
      if (args.updateRelsTable) {
        // TODO: i need to pass the full doc here, or it will give me an error using db directly unlike using payloadAPI, as it will update all the fields without just update only the data,
        // for example if i want to just pass name, and age is required it will give me an error, also this will fire if AddDefaultField is true.
        const updatedProduct = await req.payload.db.updateOne({
          collection: collection.slug,
          id: doc.id,
          data: {
            ...doc,
            [args.relationshipField.name]: addedNewRelations?.map((item) => item.id),
          },
          req,
        })

        context.relationPlugin = { createFinished: true } as RelationPluginContext

        return { ...updatedProduct, [args.arrayName]: addedNewRelations }
      }

      context.relationPlugin = { createFinished: true } as RelationPluginContext

      return { ...doc, [args.arrayName]: addedNewRelations }
    }

    if (operation === 'update' && relationContext.isRelationUpdate) {
      if (!args.relatedToCollection) return

      // find the previous data of the relatedTo collection if i don't use the aftreRead in the field it will not be populated
      // const result = await req.payload.db.find({
      //   collection: args.relatedToCollection,
      //   where: { [args.reverseRelationName]: { equals: doc.id } },
      //   sort: args.orderd ? 'order' : undefined,
      // })
      let updatedRelationToData
      if (args.drizzleTable && isValidDrizzleTableConfig(args.drizzleTable)) {
        updatedRelationToData = await updateDBDrizzleDirect({
          req,
          relationContext,
          args,
          doc,
          previousDoc,
          drizzleTable: args.drizzleTable,
        })
      } else {
        // i need to know the relationTo collection and find the name of the relationship becuase i think it could be diffrent from the current collection name
        updatedRelationToData = await updateDBDirect({
          req,
          relationContext,
          args,
          doc,
          previousDoc,
          reverseRelationName: args.reverseRelationName,
        })
      }

      // TODO: i may add an option, to optionally add it or not, but i also need a hook in the relationTo to update the the the field in the current collection.
      if (args.updateRelsTable) {
        // TODO: i need to pass the full doc here, or it will give me an error using db directly unlike using payloadAPI, as it will update all the fields without just update only the data,
        // for example if i want to just pass name, and age is required it will give me an error, also this will fire if AddDefaultField is true.
        const currentCollectionUpdated = await req.payload.db.updateOne({
          collection: collection.slug,
          id: doc.id,
          data: {
            ...doc,
            [args.relationshipField.name]: updatedRelationToData?.map((relation) =>
              typeof relation === 'object' && relation !== null && 'id' in relation
                ? (relation as { id: unknown }).id
                : relation,
            ),
          },
          req,
        })

        context.relationPlugin = { updateFinished: true } as RelationPluginContext
        return {
          ...currentCollectionUpdated,
          [args.arrayName]: updatedRelationToData,
        }
      }

      context.relationPlugin = { updateFinished: true } as RelationPluginContext
      return {
        ...doc,
        [args.arrayName]: updatedRelationToData,
      }
    }
  }
}
