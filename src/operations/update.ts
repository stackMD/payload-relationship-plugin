import { PayloadRequest, RequestContext } from 'payload'
import { LocalAPI } from '../local-api/index.js'
import { RelationPluginContext } from '../types.js'
import { cleanIdsFromData, getRecordsToProcess } from '../utils/utils.js'

export async function handleRelationUpdate({
  context,
  doc,
  previousDoc,
  req,
  arrayName,
  relationTo,
  currentCollection,
  name,
  currentCollectionNameInRelationTo,
}: {
  context: RequestContext
  doc: any
  previousDoc: any
  req: PayloadRequest
  arrayName: string
  relationTo: string
  currentCollection: string
  name: string
  currentCollectionNameInRelationTo: string
}) {
  const {
    isRelationCreate,
    isRelationUpdate,
    createFinished,
    updateFinished,
    skipCreate,
    isRelsUpdate,
    ...rest
  } = context.relationPlugin as RelationPluginContext
  // TODO: the update i called mutiple times, so i have this logic to add to database,
  // but the problem with my approach is that one it is called first time is good,
  // but when it is called multiple times it undo what i did becuase there is data changed between the orignalDoc and data coming from the form,
  // it is on payload, that is why i added a context to stop it from calling the update operation again
  // TODO: I NEED TO FIND A BETTER SOLUTION

  const relatedItemToUpdate = rest[arrayName] as any
  const items = relatedItemToUpdate as Record<string, any>[]

  const itemsWithOrderIndex = items.map((item, index) => ({
    ...item,
    _orderIndex: index,
  }))

  const cleanedData = cleanIdsFromData(itemsWithOrderIndex, previousDoc, arrayName)

  // TODO: right now when the user delete in select relationship it will not be deleted from the database as my functions will add it again based on the array so it will be re added.

  const { toCreate, toUpdate, toDelete, unchanged } = getRecordsToProcess(
    previousDoc[arrayName],
    cleanedData,
  )

  const result = await LocalAPI(
    req,
    { toCreate, toUpdate, toDelete, unchanged },
    {
      collectiontoUpdate: relationTo as string,
      originalData: relatedItemToUpdate, // Pass the original data to preserve the order
      originalDoc: previousDoc,
      currentCollectionNameInRelationTo,
    },
  )

  return result
}
