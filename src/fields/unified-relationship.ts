import { type CollectionSlug, type Field } from 'payload'

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
