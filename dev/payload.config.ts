import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { PopulateArrayFromCollection } from '../src/index.js'
import { Editions } from './collections/book/editions/index.js'
import { Book } from './collections/book/index.js'
import { Product } from './collections/product-collection.js'
import Sales from './collections/Sales/index.js'
import SalesItems from './collections/Sales/SalesItems/index.js'
import { Variants } from './collections/varinat-collection.js'
import { devUser } from './helpers/credentials.js'
import { testEmailAdapter } from './helpers/testEmailAdapter.js'
import { seed } from './seed.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname
}

export default buildConfig({
  admin: {
    autoLogin: devUser,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Product, Variants, Sales, SalesItems, Book, Editions],
  // db: mongooseAdapter({
  //   url: process.env.DATABASE_URI || '',
  // }),
  db: postgresAdapter({
    pool: {
      connectionString: process.env.POSTGRES_URL,
    },
    // allowIDOnCreate: true,
  }),
  editor: lexicalEditor(),
  email: testEmailAdapter,
  onInit: async (payload) => {
    await seed(payload)
  },
  plugins: [
    PopulateArrayFromCollection({
      collections: {
        product: { arrayFieldNames: ['variants'] },
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
