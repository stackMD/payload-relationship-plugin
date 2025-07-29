import { RelationPluginContext } from '../types.js'
import {
  cleanIdsFromData,
  DynamicData,
  getRecordsToProcess,
  ReturnedRecordsToProcess,
} from '../utils/utils.js'
import { PayloadRequest, Where } from 'payload'
import { HookArgs } from '../hooks/without-payload-hooks.js'

type UpdateDBDirect = {
  req: PayloadRequest
  relationContext: RelationPluginContext
  args: HookArgs
  doc: any
  previousDoc: any
  reverseRelationName: string
}

export const updateDBDirect = async ({
  req,
  relationContext,
  args,
  doc,
  previousDoc,
}: UpdateDBDirect) => {
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
  
  const proccesdRecords = getRecordsToProcess(previousDoc[args.arrayName], cleanedData)
  
  //   i used upsert from db.adapter but it did not create any record.

  try {
    const resultRecords = await processRecordsTransactionally({ proccesdRecords, args, doc, req })
    return resultRecords
  } catch (error) {
    console.error('Failed to process records:', error)
    // Handle failure (transaction already rolled back)
  }
}

/**
 * Processes updates and creates in a transaction-safe way
 */
const processRecordsTransactionally = async ({
  proccesdRecords,
  args,
  doc,
  req,
}: {
  proccesdRecords: ReturnedRecordsToProcess
  args: HookArgs
  doc: any
  req: PayloadRequest
}) => {
  const { toCreate, toUpdate, toDelete, unchanged } = proccesdRecords
  const { relationshipField, reverseRelationName } = args

  try {
    // 1. First handle DELETES (if any)
    const deleteResults = await Promise.all(
      toDelete.map(async (record) => {
        if (typeof relationshipField.relationTo !== 'string') {
          throw new Error(`Invalid relationTo for delete`)
        }

        await req.payload.db.deleteOne({
          collection: relationshipField.relationTo,
          where: { id: { equals: record.id } },
          req,
        })

        return { id: record.id, order: record.order, _deleted: true }
      }),
    )

    // 2. Process UPDATES
    const updateResults = await Promise.all(
      toUpdate.map(async (record) => {
        if (record.id) {
          if (typeof relationshipField.relationTo !== 'string') {
            throw new Error(`Invalid relationTo for update: ${record.id}`)
          }

          const result = await req.payload.db.updateOne({
            collection: relationshipField.relationTo,
            where: { id: { equals: record.id } },
            data: {
              ...record,
              [reverseRelationName]: doc.id,
            },
            req,
          })

          return { ...result, order: record.order }
        }
      }),
    )

    // 3. Process CREATES (last, in case they reference updated/deleted records)
    const createResults = await Promise.all(
      toCreate.map(async (record) => {
        if (typeof relationshipField.relationTo !== 'string') {
          throw new Error(`Invalid relationTo for create`)
        }

        const result = await req.payload.db.create({
          collection: relationshipField.relationTo,
          data: {
            ...record,
            [reverseRelationName]: doc.id,
          },
          req,
        })

        return { ...result, order: record.order }
      }),
    )

    // Combine and sort all successful records
    const resultRecord: DynamicData[] = [...unchanged, ...updateResults, ...createResults].sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    )

    return resultRecord
  } catch (err) {
    console.error('Transaction failed:', err)
    throw err // Re-throw to maintain transaction rollback
  }
}
