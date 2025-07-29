import { dirname, resolve } from 'path'
import fs from 'fs'
import { Field } from 'payload'
import { isEqual } from 'es-toolkit'

// Function to find the root directory of the user's project
export function findProjectRootFromPlugin() {
  // Get the URL of the current module (this will give you the location of the plugin file)
  const pluginDir = dirname(new URL(import.meta.url).pathname)

  let dir = pluginDir

  // Traverse upwards until you find package.json (root of the user's project)
  while (!fs.existsSync(resolve(dir, 'package.json'))) {
    const parentDir = dirname(dir)

    // If we've reached the root without finding package.json, return null or error
    if (parentDir === dir) {
      throw new Error('Could not find package.json. Make sure the plugin is installed correctly.')
    }

    dir = parentDir
  }

  // Return the root directory of the user's project
  return dir
}

/**
 * Type guard to check if a field has a 'name' property.
 */
function isNamedField(field: Field): field is Field & { name: string } {
  return 'name' in field && typeof field.name === 'string'
}

type ExtractOptions = {
  exclude?: (field: Field & { name: string }) => boolean
  preserveLayout?: boolean
}
/**
 * Recursively extract all fields that have a `name` from a Payload field config.
 * This includes fields inside arrays, groups, collapsibles, rows, blocks, etc.
 */
// export function extractNamedFieldsWithFunction(
//   fields: Field[],
//   exclude?: (field: Field & { name: string }) => boolean,
// ): (Field & { name: string })[] {
//   const result: (Field & { name: string })[] = []

//   for (const field of fields) {
//     if (!isNamedField(field)) continue

//     // Clone field to avoid mutating original
//     const clonedField = { ...field }

//     // Recursively handle nested `fields`
//     if ('fields' in clonedField && Array.isArray(clonedField.fields)) {
//       clonedField.fields = extractNamedFieldsWithFunction(clonedField.fields, exclude)
//     }

//     // Recursively handle blocks
//     if (clonedField.type === 'blocks' && Array.isArray(clonedField.blocks)) {
//       clonedField.blocks = clonedField.blocks.map((block) => ({
//         ...block,
//         fields: extractNamedFieldsWithFunction(block.fields, exclude),
//       }))
//     }

//     // 📑 Handle tabs
//     if (clonedField.type === 'tabs' && Array.isArray(clonedField.tabs)) {
//       for (const tab of clonedField.tabs) {
//         result.push(...extractNamedFieldsWithFunction(tab.fields, exclude))
//       }
//     }

//     // Apply exclusion rule only to top-level named field
//     if (!exclude || !exclude(clonedField)) {
//       result.push(clonedField)
//     }
//   }

//   return result
// }

export function extractNamedFieldsWithFunction(
  fields: Field[],
  options: ExtractOptions = {},
): Field[] {
  const result: Field[] = []

  for (const field of fields) {
    const { exclude, preserveLayout } = options

    // Tabs
    if (field.type === 'tabs' && Array.isArray(field.tabs)) {
      for (const tab of field.tabs) {
        result.push(...extractNamedFieldsWithFunction(tab.fields, options))
      }
      continue
    }

    // Blocks
    if (field.type === 'blocks' && Array.isArray(field.blocks)) {
      for (const block of field.blocks) {
        result.push(...extractNamedFieldsWithFunction(block.fields, options))
      }
      continue
    }

    // Nested layout fields
    if ('fields' in field && Array.isArray(field.fields)) {
      const innerFields = extractNamedFieldsWithFunction(field.fields, options)

      if (preserveLayout) {
        result.push({ ...field, fields: innerFields })
      } else {
        result.push(...innerFields)
      }

      continue
    }

    if ('name' in field && typeof field.name === 'string') {
      if (!exclude || !exclude(field)) {
        result.push(field)
      }
    }
  }

  return result
}

/**
 * Accepts a list of exclusion "matchers" — each being a partial Field.
 * Each matcher will exclude fields that match **all** specified properties.
 */

type Matcher = Partial<Field>

type ExclusionOptions = {
  allowRequiredExceptions?: Partial<Field>[]
}

function isAllowedException(field: Field, exceptions?: Partial<Field>[]): boolean {
  if (!exceptions) return false

  return exceptions.some((rule) => {
    return Object.entries(rule).every(([key, value]) => {
      const fieldValue = (field as Record<string, unknown>)[key]
      if (Array.isArray(value)) {
        return Array.isArray(fieldValue) && value.every((v) => fieldValue.includes(v))
      }
      return fieldValue === value
    })
  })
}

function hasRequired(field: Field): field is Field & { required?: boolean } {
  return 'required' in field
}

export function generateDynamicExclusionFunction(
  matchers: Matcher[] | undefined,
  options?: ExclusionOptions,
): (field: Field) => boolean {
  return (field: Field) => {
    const shouldExclude =
      matchers?.some((matcher) =>
        Object.entries(matcher).every(([key, value]) => {
          return field[key as keyof Field] === value
        }),
      ) ?? false

    const isException = isAllowedException(field, options?.allowRequiredExceptions)

    if (shouldExclude || isException) {
      if (hasRequired(field) && field.required === true && !isException) {
        console.warn(
          `\x1b[33m[DEBUG]Relationship Plugin: Cannot exclude required field "${(field as any).name}".\x1b[0m`,
        )
        return false
      }

      return true
    }

    return false
  }
}

type ExcludeEntry = { name: string; type?: string }

export function extractNamedFieldsWithList(
  fields: Field[],
  excludeList: ExcludeEntry[] = [],
): (Field & { name: string })[] {
  const shouldExclude = (field: Field & { name: string }) =>
    excludeList.some(
      (entry) => entry.name === field.name && (!entry.type || entry.type === field.type),
    )

  const result: (Field & { name: string })[] = []

  for (const field of fields) {
    if (isNamedField(field) && !shouldExclude(field)) {
      result.push(field)
    }

    if ('fields' in field && Array.isArray(field.fields)) {
      result.push(...extractNamedFieldsWithList(field.fields, excludeList))
    }

    if (field.type === 'blocks' && Array.isArray(field.blocks)) {
      for (const block of field.blocks) {
        result.push(...extractNamedFieldsWithList(block.fields, excludeList))
      }
    }
  }

  return result
}

export function getMatchingFields(fieldsToRender: Field[], data: Record<string, any>): string[] {
  return fieldsToRender
    .filter(isNamedField) // Narrow down to named fields
    .map((field) => field.name)
    .filter((fieldName) => fieldName in data)
}

export function getMatchingFieldsFromArray(
  fieldsToRender: Field[],
  items: Record<string, any>[] = [],
): string[] {
  const fieldNames = fieldsToRender.filter(isNamedField).map((field) => field.name)

  const result = new Set<string>()

  for (const item of items) {
    fieldNames.forEach((name) => {
      if (name in item) {
        result.add(name)
      }
    })
  }

  return Array.from(result)
}

export function getMatchingFieldsWithNestedArraySupport(
  fieldsToRender: Field[],
  items: Record<string, any>[] = [],
): string[] {
  const result = new Set<string>()

  fieldsToRender.forEach((field) => {
    if (!('name' in field) || typeof field.name !== 'string') return

    const fieldName = field.name

    for (const item of items) {
      const value = item[fieldName]

      if (value !== undefined) {
        result.add(fieldName)
        break
      }

      // Check one level deeper if it's an array of objects
      if (Array.isArray(item[fieldName])) {
        const nestedArray = item[fieldName]

        for (const nestedItem of nestedArray) {
          if (typeof nestedItem === 'object' && nestedItem !== null) {
            for (const key in nestedItem) {
              if (key === fieldName) {
                result.add(fieldName)
                break
              }
            }
          }
        }
      }
    }
  })

  return Array.from(result)
}

export type DynamicData = {
  id?: string | number
  [key: string]: unknown
}

export function cleanIdsFromData(
  dataToUpdate: DynamicData[],
  originalDoc: any,
  arrayName: string,
): DynamicData[] {
  const originalIds = new Set((originalDoc[arrayName] || []).map((v: any) => String(v.id)))

  return dataToUpdate.map((item) => {
    const id = item.id
    const isValid = id && originalIds.has(String(id))

    if (isValid) return item

    const { id: _, ...rest } = item
    return rest
  })
}

/**
 * Dynamically compares updated and original data, filtering original data to match the fields in updatedData.
 * Tracks unchanged records as well.
 *
 * @param {DynamicData[]} originalData - The original data from the database.
 * @param {DynamicData[]} updatedData - The updated data to compare against.
 * @returns {Object} - An object containing toCreate, toUpdate, toDelete, and unchanged arrays.
 */
export type ReturnedRecordsToProcess = {
  toCreate: DynamicData[]
  toUpdate: DynamicData[]
  toDelete: DynamicData[]
  unchanged: DynamicData[]
}
export function getRecordsToProcess(
  originalData: DynamicData[],
  updatedData: DynamicData[],
): ReturnedRecordsToProcess {
  const toCreate: DynamicData[] = []
  const toUpdate: DynamicData[] = []
  const toDelete: DynamicData[] = []
  const unchanged: DynamicData[] = [] // To track unchanged records

  // Convert originalData to a Map of ID to record for fast lookup
  const originalDataMap = new Map(originalData.map((item) => [item.id?.toString(), item])) // Ensure IDs are strings

  // Get the list of fields from updatedData to compare against (i.e., the relevant fields)
  const dynamicFieldsToInclude = getFieldsToInclude(updatedData)

  // Check for records to update or create
  updatedData.forEach((updatedRecord) => {
    if (!updatedRecord.id) {
      // This record is new and needs to be created
      toCreate.push(updatedRecord)
    } else {
      const originalRecord = originalDataMap.get(updatedRecord.id.toString()) // Ensure IDs are strings

      if (originalRecord) {
        // Record exists, so filter originalRecord to include only relevant fields
        const filteredOriginalRecord = filterOriginalRecord(originalRecord, dynamicFieldsToInclude)
        const filteredUpdatedRecord = filterOriginalRecord(updatedRecord, dynamicFieldsToInclude)

        // Debugging: Log the filtered records to inspect the fields before comparison

        // Compare the filtered records
        if (!isEqual(filteredOriginalRecord, filteredUpdatedRecord)) {
          toUpdate.push(updatedRecord) // If there are changes, add to update
        } else {
          unchanged.push(updatedRecord) // If no changes, track as unchanged
        }
      } else {
        // If no matching original record, treat it as new and add it to create
        toCreate.push(updatedRecord)
      }
    }
  })

  // Check for records that have been removed from the updated data (to be deleted)
  originalData.forEach((originalRecord) => {
    const updatedRecord = updatedData.find(
      (updated) => updated.id?.toString() === originalRecord.id?.toString(),
    ) // Ensure IDs are strings

    if (!updatedRecord) {
      // If the original record doesn't exist in the updated data, it needs to be deleted
      toDelete.push(originalRecord)
    }
  })

  // Return all created, updated, deleted, and unchanged records
  return { toCreate, toUpdate, toDelete, unchanged }
}

/**
 * Filters the given record to only include fields that exist in the provided field list.
 *
 * @param {DynamicData} record - The record to filter.
 * @param {string[]} fieldsToInclude - The list of fields to include in the filtered record.
 * @returns {DynamicData} - The filtered record with only the included fields.
 */
function filterOriginalRecord(record: DynamicData, fieldsToInclude: string[]): DynamicData {
  const filteredRecord: DynamicData = {}

  Object.keys(record).forEach((key) => {
    if (fieldsToInclude.includes(key)) {
      filteredRecord[key] = record[key]
    }
  })

  return filteredRecord
}

/**
 * Automatically infers fields to be included from updatedData's keys.
 *
 * @param {DynamicData[]} data - The updated data to inspect for fields.
 * @returns {string[]} - A list of field names to include (excluding system-generated fields).
 */
function getFieldsToInclude(data: DynamicData[]): string[] {
  const fieldsToInclude = new Set<string>()

  // Iterate through the updatedData and add keys that exist in updatedData to the fieldsToInclude
  data.forEach((record) => {
    Object.keys(record).forEach((key) => {
      // Include all keys except system fields like `id`, `createdAt`, `updatedAt`, `vid`
      if (key !== 'id' && key !== 'vid' && key !== 'createdAt' && key !== 'updatedAt') {
        fieldsToInclude.add(key)
      }
    })
  })

  return Array.from(fieldsToInclude)
}
