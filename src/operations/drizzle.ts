import { PgTable } from '@payloadcms/db-postgres/drizzle/pg-core'
import { MyDrizzleTable } from '../types.js'
import { CreateDBDirect } from './create-direct.js'
import type { PayloadRequest } from 'payload'
import { cleanIdsFromData, getRecordsToProcess } from '../utils/utils.js'
import { eq } from '@payloadcms/db-postgres/drizzle'

/**
 * Checks if the given object is a Drizzle PgTable by looking for the unique symbol property.
 */
export const isDrizzleTable = (obj: any): obj is PgTable<any> => {
  if (!obj || typeof obj !== 'object') return false

  // Check for the Drizzle symbol
  const hasDrizzleSymbol = Object.getOwnPropertySymbols(obj).some(
    (sym) => sym.toString() === 'Symbol(drizzle:IsDrizzleTable)' && obj[sym] === true,
  )

  // Also check for common Drizzle table properties
  const hasTableProperties = obj._ && typeof obj._ === 'object'

  // Check if it has the insert method (which Drizzle tables should have)
  const hasInsertMethod = typeof obj.insert === 'function'

  return hasDrizzleSymbol || (hasTableProperties && hasInsertMethod)
}

/**
 * Checks if both currentTable and relatedToTable in MyDrizzleTable are valid Drizzle tables.
 */
export const isValidDrizzleTableConfig = (drizzleTable: MyDrizzleTable | undefined): boolean => {
  return (
    !!drizzleTable &&
    isDrizzleTable(drizzleTable.currentTable) &&
    isDrizzleTable(drizzleTable.relatedToTable)
  )
}

type DrzzleDBArgs = CreateDBDirect & {
  drizzleTable: MyDrizzleTable
  previousDoc?: any
}

function extractArraysFromData(data: Record<string, any>) {
  const arrays: Record<string, any[]> = {}
  const rest: Record<string, any> = {}

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      arrays[key] = value
    } else {
      rest[key] = value
    }
  }

  return { arrays, rest }
}

// Right now it does not handle array with db, as it will not added, i will add a check if array exist if so it will added it.
export const createDBDrizzleDirect = async ({ req, relationContext, args, doc }: DrzzleDBArgs) => {
  const { drizzleTable } = args
  if (!drizzleTable) {
    console.error('Sorry you drizzle schema does not exist')
    return
  }
  const { relatedToTable, arrayTables } = drizzleTable

  // Example: get the array to insert
  const addedIdToRelation = relationContext?.[args.arrayName] as any[]
  if (!addedIdToRelation || !Array.isArray(addedIdToRelation)) {
    return []
  }

  // Insert each relation using Drizzle
  const inserted = await Promise.all(
    addedIdToRelation.map(async ({ id, ...item }, index) => {
      const data = {
        ...item,
        order: index + 1,
        [args.reverseRelationName]: doc.id,
      }
      const { arrays, rest: originalData } = extractArraysFromData(data)

      // Use Drizzle to insert into the related table
      if (isDrizzleTable(relatedToTable)) {
        // i get the getTansaction from the payload team
        const db = await getTransaction(req)

        // For now, just insert - you can add conflict resolution later
        const result = await db.insert(relatedToTable).values(data).returning()

        // Insert array items into their respective tables if matches found
        const insertedArrays: Record<string, any[]> = {}
        if (arrayTables && arrayTables.length > 0) {
          // console.log('Main insert result:', result)
          // console.log('Using _parent_id:', result[0]?.id)
          for (const arrayName of Object.keys(arrays)) {
            const match = arrayTables.find((arrTable: any) => arrTable.name === arrayName)
            if (match) {
              const items = arrays[arrayName]

              const inserted = await Promise.all(
                items.map(
                  async (item: any, idx: number) =>
                    await db
                      .insert(match.drizzleTable)
                      .values({
                        ...item,
                        _parentID: result[0].id,
                        _order: idx + 1,
                      })
                      .returning(),
                ),
              )
              // Flatten the inserted results and assign to the arrayName property
              insertedArrays[arrayName] = inserted.flat()
            }
          }
        }

        // Return the main result spread, and each arrayName as a property with its inserted values
        return {
          ...result[0],
          ...Object.fromEntries(Object.entries(insertedArrays)),
        }
      }
      return null
    }),
  )

  return inserted.filter(Boolean)
}

export const updateDBDrizzleDirect = async ({
  req,
  relationContext,
  args,
  doc,
  previousDoc,
}: DrzzleDBArgs) => {
  const { drizzleTable } = args
  if (!drizzleTable) {
    console.error('Sorry you drizzle schema does not exist')
    return
  }
  const { relatedToTable } = drizzleTable

  const relationToArray = relationContext?.[args.arrayName] as any[]

  // Add null check to prevent error when array is undefined
  if (!relationToArray || !Array.isArray(relationToArray)) {
    return []
  }

  const itemsWithOrderIndex = relationToArray.map((item, index) => ({
    ...item,
    order: index + 1,
  }))

  // TODO: i need to fetch the prevoius record from the database

  const cleanedData = cleanIdsFromData(itemsWithOrderIndex, previousDoc, args.arrayName)

  const { toDelete, ...rest } = getRecordsToProcess(previousDoc[args.arrayName], cleanedData)

  // Only process items that need to be created or updated
  const itemsToProcess = [...(rest.toCreate || []), ...(rest.toUpdate || [])]

  const deletedPromise = await Promise.all(
    toDelete.map(async (record) => {
      const db: any = await getTransaction(req)

      if (isDrizzleTable(relatedToTable)) {
        // @ts-ignore
        const result = await db.delete(relatedToTable).where(eq(relatedToTable.id, record.id))

        return result
      }
    }),
  )

  if (itemsToProcess.length === 0) {
    // Return unchanged items as-is
    return rest.unchanged || []
  }

  // Insert each relation using Drizzle with onConflictDoUpdate
  const createInserted = await Promise.all(
    itemsToProcess.map(async (record) => {
      const data = {
        ...record,
        [args.reverseRelationName]: doc.id,
      }

      const db = await getTransaction(req)

      if (isDrizzleTable(relatedToTable)) {
        const result = await db
          .insert(relatedToTable)
          .values(data)
          // @ts-ignore
          .onConflictDoUpdate({ target: relatedToTable.id, set: data })
          .returning()

        // Handle arrayTables if present
        const { arrays } = extractArraysFromData(data)
        const { arrayTables } = args.drizzleTable || {}
        if (arrayTables && arrayTables.length > 0) {
          for (const arrayName of Object.keys(arrays)) {
            const match = arrayTables.find((arrTable: any) => arrTable.name === arrayName)
            if (match) {
              const items = arrays[arrayName]

              // TODO: i think i will make db.delete but right now it is as is
              await Promise.all(
                items.map(
                  async (item: any, idx: number) =>
                    await db
                      .insert(match.drizzleTable)
                      .values({
                        ...item,
                        _parentID: result[0].id,
                        _order: idx + 1,
                      })
                      .onConflictDoUpdate({
                        // @ts-ignore
                        target: match.drizzleTable.id,
                        set: {
                          ...item,
                          _ParentID: result[0].id,
                          _order: idx + 1,
                        },
                      })
                      .returning(),
                ),
              )
            }
          }
        }

        return result
      }
    }),
  )

  // Combine inserted/updated items with unchanged items
  const allResults = [...createInserted, ...(rest.unchanged || [])]

  return allResults
}

/**
 * Returns current db transaction instance from req or adapter.drizzle itself
 */
export const getTransaction = async (req?: Partial<PayloadRequest>) => {
  if (!req?.transactionID) {
    return req?.payload?.db.drizzle
  }

  return (
    (req?.payload?.db?.sessions?.[await req.transactionID].db as any) || req?.payload?.db.drizzle
  )
}
