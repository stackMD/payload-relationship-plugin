import type { Field } from 'payload'

/*
 * Type guard to check if a field has a 'name' property.
 */
function isNamedField(field: Field): field is { name: string } & Field {
  return 'name' in field && typeof field.name === 'string'
}

type ExtractOptions = {
  exclude?: (field: { name: string } & Field) => boolean
  preserveLayout?: boolean
}

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
  if (!exceptions) {
    return false
  }

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

function hasRequired(field: Field): field is { required?: boolean } & Field {
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
      return true
    }

    return false
  }
}

type ExcludeEntry = { name: string; type?: string }

export function extractNamedFieldsWithList(
  fields: Field[],
  excludeList: ExcludeEntry[] = [],
): ({ name: string } & Field)[] {
  const shouldExclude = (field: { name: string } & Field) =>
    excludeList.some(
      (entry) => entry.name === field.name && (!entry.type || entry.type === field.type),
    )

  const result: ({ name: string } & Field)[] = []

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
