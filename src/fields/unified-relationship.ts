import type { RelationshipPluginConfig } from 'src/index.js'

import {
  type ArrayField,
  type CollectionSlug,
  deepMerge,
  type Field,
  type RelationshipField,
} from 'payload'

import { RelationshipArrayField } from './relationship-array-field.js'

export type DotNotationWithSlug<T extends string = CollectionSlug> = `${T}.${string}`

type BaseConfig = {
  addDefaultField?: boolean
  addToRels?: boolean
  customArrayOverrides?: Partial<Omit<ArrayField, 'fields' | 'type'>>
  fieldsToExclude?: Partial<Field>[] | undefined
  fieldsToRender?: Field[] // List of fields to render
  hideDefaultField?: boolean
}

export type NormalRelationConfig = {
  // drizzleSchemas?: { collectionRelSchema: PgTable; relationSchema: PgTable }
  reverseRelationField?: RelationshipWithCurrentCollection
} & BaseConfig

export type NestedRelationConfig = {
  drizzleTable?: string
} & BaseConfig

export type RelationShipConfig = NormalRelationConfig

export type RelationshipWithCurrentCollection = {
  currentCollection: CollectionSlug
} & RelationshipField

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

type PopulateArrayField = {
  fieldsToExclude?: Partial<Field>[] | undefined
  fieldsToRender?: Field[] // List of fields to render
  populateFrom: CollectionSlug
}

export const populateFieldFromCollection = (userConfig: PopulateArrayField) => {
  return {
    fieldsToExclude: userConfig.fieldsToExclude ?? [],
    fieldsToRender: userConfig.fieldsToRender ?? [],
    populateFrom: userConfig.populateFrom,
  }
}
