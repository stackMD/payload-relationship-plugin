import type {
  CollectionAfterChangeHook,
  CollectionAfterReadHook,
  CollectionBeforeChangeHook,
  CollectionSlug,
  Config,
  Field,
  RelationshipField,
  RequestContext,
} from 'payload'
import type {
  NormalRelationConfig,
  RelationShipConfig,
  RelationshipWithCurrentCollection,
} from './fields/unified-relationship.js'
import { RenderUnifiedRelationship } from './fields/unified-relationship.js'
import { setupWithoutPayloadHooks } from './hooks/without-payload-hooks.js'
import { setupWithPayloadHooks } from './hooks/with-payload.hooks.js'
import { PgTable } from '@payloadcms/db-postgres/drizzle/pg-core'
import { DrizzleArrayTables, MyDrizzleTable } from './types.js'
export { createRelationPluginField } from './fields/unified-relationship.js'

export type RelationPluginContext = {
  isRelationCreate?: boolean
  isRelationUpdate?: boolean
  isRelsUpdate: boolean
  createFinished?: boolean
  updateFinished?: boolean
} & RequestContext

export type WithExtendedContext<T extends { context: any }> = Omit<T, 'context'> & {
  context: RelationPluginContext
}

export type RelationTo = {
  fieldName?: string
  drizzleTable?: PgTable
  arrayTables?: DrizzleArrayTables
}

export type RelationshipPluginConfig = {
  /**
   * List of collections to add a custom field
   */
  collections?: Partial<
    Record<CollectionSlug, { drizzleTable?: PgTable; relationships: RelationTo[] }>
  >
  disabled?: boolean
  usePayloadHooks?: boolean
}

// TODO: when seeding the database it will check the [nameArray] first if it is empty it will remove values from database even if i just add it in actual relation object,
// i think it is becuase i can't have 2 fields that will alter the same field. for now the array field is the source truth.

export const RelationshipPlugin =
  (pluginConfig: RelationshipPluginConfig) =>
  (inComingConfig: Config): Config => {
    if (!inComingConfig.collections) {
      inComingConfig.collections = []
    }

    /**
     * If the plugin is disabled, we still want to keep added collections/fields so the database schema is consistent which is important for migrations.
     * If your plugin heavily modifies the database schema, you may want to remove this property.
     */
    if (pluginConfig.disabled) {
      return inComingConfig
    }

    // Type guard for creatable relationship fields
    const isCreatableRelationshipField = (field: Field): field is RelationshipField => {
      return (
        field.type === 'relationship' &&
        !!field.relationTo &&
        field.custom?.relationPlugin?.create === true
      )
    }

    // Safely get collections or empty object
    const collectionsToProcess = pluginConfig.collections || {}
    // my custom plugin logic

    type CollectionHooks = {
      afterRead: CollectionAfterReadHook[]
      beforeChange: CollectionBeforeChangeHook[]
      afterChange: CollectionAfterChangeHook[]
    }

    Object.keys(collectionsToProcess).forEach((collectionSlug) => {
      const collection = inComingConfig.collections?.find((c) => c.slug === collectionSlug)
      if (!collection) return

      // Get the drizzle table config for this collection
      const collectionConfig = collectionsToProcess[collectionSlug]
      const currentCollectionTable = collectionConfig?.drizzleTable
      const relationships = collectionConfig?.relationships || []

      // Store hooks to add after processing all fields
      const hooksToAdd: CollectionHooks = {
        // for the relationship aftreReadHook is inside the relationship Field
        afterRead: [],
        beforeChange: [],
        afterChange: [],
      }

      // Process all creatable relationships
      const creatableRelationships = collection.fields.flatMap((field, index) =>
        isCreatableRelationshipField(field) ? [{ field, index }] : [],
      )

      creatableRelationships.forEach(({ field: relationshipField, index }) => {
        const { relationTo, custom } = relationshipField
        // TODO: for now only a single relation is supported
        if (!relationTo || Array.isArray(relationTo)) {
          if (Array.isArray(relationTo)) {
            throw new Error(`Only single relations are supported (collection: ${collection.slug})`)
          }
          return
        }

        const relatedCollection = inComingConfig.collections?.find((c) => c.slug === relationTo)
        if (!relatedCollection) return

        // Find reverse relationship name
        const reverseRelationField = relatedCollection?.fields.find(
          (f) => f.type === 'relationship' && f.relationTo === collection.slug,
        ) as RelationshipField

        // Process field configuration

        const relationshipFieldInParent: RelationshipWithCurrentCollection = {
          ...relationshipField,
          currentCollection: collection.slug,
        }

        const fieldConfig = (custom?.relationPlugin?.config as NormalRelationConfig) || {}
        const relatedToFieldsConfig: RelationShipConfig = {
          ...fieldConfig,
          fieldsToRender: relatedCollection.fields,
          reverseRelationField: {
            ...reverseRelationField,
            currentCollection:
              typeof relationshipFieldInParent.relationTo === 'string'
                ? relationshipFieldInParent.relationTo
                : relationshipFieldInParent.relationTo[0],
          },
        }

        // it will add order in the relatedTo collection if the orderd is true and addDefualt is false, else it will be handled by _rels table.
        custom?.relationPlugin?.ordered &&
          !relatedToFieldsConfig.addDefaultField &&
          relatedCollection.fields.push({
            name: 'order',
            type: 'number',
            admin: { disabled: true },
          })

        // Generate and replace fields
        const generatedFields = RenderUnifiedRelationship(
          relationshipFieldInParent,
          relatedToFieldsConfig,
          pluginConfig,
        )

        collection.fields.splice(index, 1, ...generatedFields)

        let drizzleTable: MyDrizzleTable = {}
        // if the user passes drizzleTable and usePayloadHook is false
        if (!pluginConfig.usePayloadHooks) {
          const matchingRelationship = relationships.find(
            (rel) => rel.fieldName === relationshipField.name,
          )

          if (matchingRelationship && currentCollectionTable) {
            drizzleTable = {
              currentTable: currentCollectionTable,
              relatedToTable: matchingRelationship.drizzleTable,
              arrayTables: matchingRelationship.arrayTables || [],
            }
          }
        }

        const usePayloadHooks = pluginConfig.usePayloadHooks ?? true

        // Collect hooks for later addition
        const relationshipHooks = usePayloadHooks
          ? setupWithPayloadHooks(relationshipFieldInParent, relatedToFieldsConfig)
          : setupWithoutPayloadHooks({
              relationshipField: relationshipFieldInParent,
              relatedToFieldConfig: relatedToFieldsConfig,
              orderd: custom?.relationPlugin?.ordered,
              pluginConfig,
              drizzleTable,
            })

        // TODO: should i implement the handle _rels table on relatedTo collection if user is adding the relation inside related Collection?
        // this is for relatedTo collection i need to add this hook to update the field on the current collection if the user was in the create page of the relatedTo colleciton,
        // only create, did not implemnt update
        // pluginConfig.usePayloadHooks &&
        //   relatedCollection.hooks?.afterChange?.unshift(
        //     afterChangeRelatedToCollectionHook({
        //       relationshipField: reverseRelationField,
        //       reverseRelationField: relationshipFieldInParent,
        //       relatedToFieldsConfig,
        //     }),
        //   )

        // Merge hooks
        if (relationshipHooks?.afterRead) {
          hooksToAdd.afterRead.push(...relationshipHooks.afterRead)
        }
        if (relationshipHooks?.beforeChange) {
          hooksToAdd.beforeChange.push(...relationshipHooks.beforeChange)
        }
        if (relationshipHooks?.afterChange) {
          hooksToAdd.afterChange.push(...relationshipHooks.afterChange)
        }
      })

      // Add all hooks after field processing is complete
      if (hooksToAdd.afterRead.length > 0) {
        collection.hooks = {
          afterRead: [...(hooksToAdd.afterRead || []), ...(collection.hooks?.afterRead || [])],
          ...collection.hooks,
        }
      }

      if (hooksToAdd.beforeChange.length > 0) {
        collection.hooks = {
          ...collection.hooks,
          beforeChange: [
            ...(hooksToAdd.beforeChange || []),
            ...(collection.hooks?.beforeChange || []),
          ],
        }
      }

      if (hooksToAdd.afterChange.length > 0) {
        collection.hooks = {
          ...collection.hooks,
          afterChange: [
            ...(hooksToAdd.afterChange || []),
            ...(collection.hooks?.afterChange || []),
          ],
        }
      }
    })

    if (!inComingConfig.endpoints) {
      inComingConfig.endpoints = []
    }

    if (!inComingConfig.admin) {
      inComingConfig.admin = {}
    }

    if (!inComingConfig.admin.components) {
      inComingConfig.admin.components = {}
    }

    if (!inComingConfig.admin.components.beforeDashboard) {
      inComingConfig.admin.components.beforeDashboard = []
    }

    // inComingConfig.admin.components.beforeDashboard.push(
    //   '/src/components/BeforeDashboardClient#BeforeDashboardClient',
    // )
    // inComingConfig.admin.components.beforeDashboard.push(
    //   `/src/components/BeforeDashboardServer#BeforeDashboardServer`,
    // )

    // inComingConfig.endpoints.push({
    //   handler: () => {
    //     return Response.json({ message: 'Hello from custom endpoint' })
    //   },
    //   method: 'get',
    //   path: '/my-plugin-endpoint',
    // })

    const incomingOnInit = inComingConfig.onInit

    inComingConfig.onInit = async (payload) => {
      // Ensure we are executing any existing onInit functions before running our own.
      if (incomingOnInit) {
        await incomingOnInit(payload)
      }
    }

    return inComingConfig
  }
