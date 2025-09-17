import type { CollectionSlug, Config } from 'payload'

import { extractNamedFieldsWithFunction, generateDynamicExclusionFunction } from './utils/utils.js'

export type RelationshipPluginConfig = {
  /**
   * List of collections to add a custom field
   */
  collections?: Partial<Record<CollectionSlug, { arrayFieldNames: string[] }>>
  disabled?: boolean
}

export const PopulateArrayFromCollection =
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

    // Safely get collections or empty object
    const collectionsToProcess = pluginConfig.collections || {}
    // my custom plugin logic

    Object.keys(collectionsToProcess).forEach((collectionSlug) => {
      const collectionConfig = collectionsToProcess[collectionSlug]
      const collection = inComingConfig.collections?.find((col) => col.slug === collectionSlug)

      if (!collection || !collectionConfig?.arrayFieldNames) {
        return
      }

      // Find array fields by name
      const arrayFields = collection.fields.filter(
        (field) =>
          'name' in field &&
          typeof (field as any).name === 'string' &&
          collectionConfig.arrayFieldNames.includes((field as any).name) &&
          field.type === 'array',
      )

      arrayFields.forEach((arrayField) => {
        const populateFrom = arrayField.custom?.populateFrom
        if (populateFrom) {
          const sourceCollection = inComingConfig.collections?.find(
            (col) => col.slug === populateFrom,
          )

          if (
            sourceCollection &&
            Array.isArray(sourceCollection.fields) &&
            'fields' in arrayField &&
            Array.isArray(arrayField.fields)
          ) {
            // Use exclusion function if needed
            const excludeFn = generateDynamicExclusionFunction(arrayField.custom?.fieldsToExclude)

            // Extract named fields with exclusion
            const filtredFieldsToRender = extractNamedFieldsWithFunction(sourceCollection.fields, {
              exclude: excludeFn,
              preserveLayout: true,
            })

            arrayField.fields = filtredFieldsToRender
          }
        }
      })
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
