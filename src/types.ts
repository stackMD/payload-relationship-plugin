import { PgTable } from '@payloadcms/db-postgres/drizzle/pg-core'
import { RequestContext } from 'payload'

// TODO: find a way to just export it inside index.ts without make the full types inside index.ts

export type RelationPluginContext = {
  isRelationCreate?: boolean
  isRelationUpdate?: boolean
  createFinished?: boolean
  updateFinished?: boolean
  isRelsUpdate?: boolean
  skipCreate?: boolean
  [key: string]: any
} & RequestContext

export type WithExtendedContext<T extends { context: any }> = Omit<T, 'context'> & {
  context: RelationPluginContext
}

export type DrizzleArrayTables = { name: string; drizzleTable: PgTable }[]

export type MyDrizzleTable = {
  currentTable?: PgTable
  relatedToTable?: PgTable
  arrayTables?: DrizzleArrayTables
}
