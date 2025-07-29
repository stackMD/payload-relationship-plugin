import {
  type Field,
  type RelationshipField,
  type CollectionSlug,
  type ArrayField,
  deepMerge,
} from 'payload'
import { RelationshipArrayField } from './relationship-array-field.js'
import { RelationshipPluginConfig } from 'src/index.js'

export type DotNotationWithSlug<T extends string = CollectionSlug> = `${T}.${string}`

type BaseConfig = {
  fieldsToRender?: Field[] // List of fields to render
  fieldsToExclude?: Partial<Field>[] | undefined
  addDefaultField?: boolean
  hideDefaultField?: boolean
  addToRels?: boolean
  customArrayOverrides?: Partial<Omit<ArrayField, 'type' | 'fields'>>
}

export type NormalRelationConfig = BaseConfig & {
  // drizzleSchemas?: { collectionRelSchema: PgTable; relationSchema: PgTable }
  reverseRelationField?: RelationshipWithCurrentCollection
}

export type NestedRelationConfig = BaseConfig & {
  drizzleTable?: string
}

export type RelationShipConfig = NormalRelationConfig

export type RelationshipWithCurrentCollection = RelationshipField & {
  currentCollection: CollectionSlug
}

export type UnifiedRelationshipFactory = (
  relationshipField: RelationshipWithCurrentCollection,
  relationshipFieldInParent?: RelationShipConfig,
  pluginConfig?: Omit<RelationshipPluginConfig, 'collections'>,
) => Field[]

// Factory function
export const RenderUnifiedRelationship: UnifiedRelationshipFactory = (
  relationshipField,
  relatedFieldsConfig,
  pluginConfig,
) => {
  const result = RelationshipArrayField(relationshipField, relatedFieldsConfig ?? {}, pluginConfig)
  return Array.isArray(result) ? result : [result] // ensure Field[]
}

type RelationPluginField = {
  create?: boolean

  /**
   * If true, adds a numeric 'order' field to the relatedTocollection
   * to support ordering in relationships.
   */
  ordered?: boolean
  config: Omit<BaseConfig, 'fieldsToRender' | 'reverseRelationField' | 'addToRels'>
}

type ReturnedRelationPluginField = {
  relationPlugin: RelationPluginField
}

export const createRelationPluginField = (
  userConfig: RelationPluginField,
): ReturnedRelationPluginField => {
  const defaults: ReturnedRelationPluginField = {
    relationPlugin: {
      create: true, // Default enabled
      config: {
        addDefaultField: false, // Default config
      },
    },
  }

  return deepMerge(defaults, {
    relationPlugin: userConfig,
  })
}
