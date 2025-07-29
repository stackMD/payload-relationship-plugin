import { PayloadRequest } from 'payload'
import { DynamicData } from 'src/utils/utils.js'

// Function to process create, update, and delete operations
export async function LocalAPI(
  req: PayloadRequest,
  fullObject: {
    toCreate: DynamicData[]
    toUpdate: DynamicData[]
    toDelete: DynamicData[]
    unchanged: DynamicData[]
  },
  {
    collectiontoUpdate,
    originalData,
    originalDoc,
    currentCollectionNameInRelationTo,
  }: {
    collectiontoUpdate: string
    originalData: DynamicData[] // Pass the original data to preserve the order
    originalDoc: DynamicData
    currentCollectionNameInRelationTo: string
  },
) {
  const { toCreate, toUpdate, toDelete, unchanged } = fullObject
  const resultRecords: any[] = []

  resultRecords.push(...unchanged)

  // Update records (Check if id is defined)
  const updatePromises = toUpdate.map(async (record) => {
    try {
      if (record.id) {
        const updatedRecord = await req.payload.update({
          collection: collectiontoUpdate,
          id: record.id,
          data: record,
          req,
        })
        resultRecords.push({ ...updatedRecord, _orderIndex: record._orderIndex }) // Add updated record to the result
      } else {
        console.error(`Skipping update for record with undefined id.`)
      }
    } catch (error) {
      console.error(`Error updating record with id ${record.id}:`, error)
    }
  })

  // Delete records (Check if id is defined)
  const deletePromises = toDelete.map(async (record) => {
    try {
      if (record.id) {
        await req.payload.delete({
          collection: collectiontoUpdate,
          id: record.id,
          req,
        })
      } else {
        console.error(`Skipping delete for record with undefined id.`)
      }
    } catch (error) {
      console.error(`Error deleting record with id ${record.id}:`, error)
    }
  })

  try {
    // Create records
    const createPromises = toCreate.map(async (record) => {
      try {
        const createdRecord = await req.payload.create({
          collection: collectiontoUpdate,
          data: { ...record, [currentCollectionNameInRelationTo]: originalDoc.id },
          req,
        })

        resultRecords.push({ ...createdRecord, _orderIndex: record._orderIndex }) // Add created record to the result
      } catch (error) {
        console.error(`Error creating record with id ${record.id}:`, error)
      }
    })

    // Wait for all promises to resolve
    // the reaason i put createPromise the last is because i want to create the record last and it the last is pushed to the resultREcords, becuase of order
    await Promise.all([...updatePromises, ...deletePromises, ...createPromises])

    // sort the resultRecords based on the _orderIndex
    resultRecords.sort((a, b) => (a._orderIndex || 0) - (b._orderIndex || 0))

    // Return the ordered result
    return resultRecords
  } catch (error) {
    console.error('Error processing records:', error)
    return null
  }
}
