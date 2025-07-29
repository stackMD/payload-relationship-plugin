# Payload Custom Relationship Plugin

A relationship field for Payload CMS that enables you to create, update, and delete related documents inside the collection — before the parent document is saved—solving the pain points of data consistency and multi-step workflows in complex relational data models.

---

## Why Use This Plugin?

Payload's default `relationship` and `join` fields are powerful, but they have limitations:

- **Manual Consistency:** If you use a standard relationship field, you must manually keep both sides of the relationship in sync. This can easily lead to data inconsistency, especially in many-to-one or many-to-many relationships.
- **Multi-Step Creation:** With the `join` field, you can view and add related documents from the parent, but you must first save the parent document. Only then can you add related documents (which opens a drawer, saves the child, and then returns you to the parent). This is not ideal if you want to add all related documents in a single create or update operation.
- **No Inline Array inisde parent collection:** There's no way to manage the array of related documents inline, with full control over which fields are shown, and to save everything in one go.

---

## What This Plugin Does

- **Creation & Editing:** Add, edit, and remove related documents directly from the parent document's form—even before the parent is saved.
- **Single-Transaction Save:** All related documents and the parent are saved together in one operation, ensuring data consistency.
- **Virtual Array Field:** Adds a virtual array field (default: `{name}Array`, customizable) to the parent collection, giving you a clear, editable list of related documents.
- **Customizable Field Selection:** By default, all fields from the related collection are available except the relationship field. You can include or exclude fields in the field Level. (Note: required fields cannot be excluded.)
- **Flexible Naming:** The virtual array field's name can be customized to fit your schema.

---

## Example Use Case

Suppose you have a `Product` collection and a `Variants` collection. With this plugin, you can:

- Create a new Product and add all its variants inline, without saving the Product first.
- Edit or remove variants directly from the Product's form.
- Save the Product and all its variants in one go—no more multi-step, save-then-edit workflows.

---

## Installation

```bash
yarn add your-plugin-package-name
# or
npm install your-plugin-package-name
```

---

## Required Collections

You must define both the parent and child collections. Here's an example for a product/variant relationship:

```ts
// collections/product-collection.ts
import { createRelationPluginField } from '../path/to/your/plugin/fields/unified-relationship.js'

export const Products = {
  slug: 'products',
  fields: [
    {
      name: 'variants',
      type: 'relationship',
      relationTo: 'productsVariants',
      hasMany: true,
      custom: {
        ...createRelationPluginField({
          create: true, // Default is true
          config: {
            fieldsToExclude: [{ name: 'stock', type: 'number' }],
            addDefaultField: true,
            customArrayOverrides: {
              name: 'variantsArray', // Default is {name}Array
              label: 'Variants',
            },
          },
        }),
      },
    },
  ],
}

// collections/productsVariants-collection.ts
export const ProductsVariants = {
  slug: 'productsVariants',
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      hasMany: false,
      admin: { readOnly: true }, // Recommended: prevent manual editing of the link
    },
  ],
}
```

---

## Plugin Usage in Payload Config

```ts
// payload.config.ts
import { Products } from './collections/product-collection'
import { ProductsVariants } from './collections/productsVariants-collection'
import { RelationshipPlugin } from '../path/to/your/plugin/index.js'

export default buildConfig({
  collections: [Products, ProductsVariants],
  plugins: [
    RelationshipPlugin({
      collections: {
        products: { relationships: [] },
      },
      // Other plugin options here
    }),
  ],
})
```

---

## Field-Level Options

- `create`: (boolean) Default is true. If `false`, disables inline creation of related documents.
- `ordered`: (boolean) Default is false. If `true`, it will add a new field to the relatedTo collection named (`order`) and sort the relations based on the order only if `addDefaultField` is false, else order will be handled by the `_rels` table.
- `config.fieldsToExclude`: (array) Exclude specific fields from the relatedTo fields (cannot exclude required fields).
- `config.addDefaultField`: (boolean) Default is `true`.
- `config.hideDefaultField`: (boolean) If `true`, hides the default select relationship field in the admin UI (default: `true`).
- `config.customArrayOverrides`: (object) Customize the virtual array field's properties.

---

## Plugin Options

- `disabled` (boolean): Disable the plugin.
- `usePayloadHooks` (boolean): Use Payload's Local API (true, default) or direct DB access (false).
- `collections`: (object) Specify which collections and fields the plugin should manage.

---

## CRUD Operation Modes

This plugin supports three modes for handling create, update, and delete operations for relationships:

### 1. Payload Hooks Mode (`usePayloadHooks: true`)
- The plugin adds hooks to both the parent and related collections.
- **On create:**
  1. The parent collection's `beforeChange` hook sets context for the operation.
  2. In the `afterChange` hook, for each related item, it calls `create` in the related collection with context (`isRelationCreate`, `{name}Array`).
  3. Then, it calls `update` in the parent collection to update the relationship field (currentCollection_rels), again with context (`isRelsUpdate`).
  4. Finally, it continues the original create operation with context (`createFinished`).

- **On update:**
  A similar process occurs with some changes:
  1. The parent collection's `beforeChange` hook sets context for the operation.
  2. In the `afterChange` hook, for each related item, it calls `create`, `update`, or `delete` in the related collection with context (`isRelationUpdate`, `{name}Array`).
  3. Then, it calls `update` in the parent collection to update the relationship field, again with context (`isRelsUpdate`).
  4. Finally, it continues the original update operation with context (`updateFinished`).
  
- The context object ensures that each operation is only performed once and helps prevent infinite loops.

**Context Example:**
```ts
{
  isRelationCreate?: boolean,
  isRelationUpdate?: boolean,
  isRelsUpdate?: boolean,
  createFinished?: boolean,
  updateFinished?: boolean,
  skipCreate?: boolean,
  // ...other context fields
}

import { RequestContext as OriginalRequestContext } from 'payload'
import type { RelationPluginContext } from "@stackMD/payload-relationship-plugin"

declare module 'payload' {
  // Create a new interface that merges your additional fields with the original one
  export interface RequestContext extends OriginalRequestContext, RelationPluginContext {
    relationPlugin?: RelationPluginContext
  }
}

```

### 2. Direct DB Adapter Mode (`usePayloadHooks: false`)
- The plugin bypasses Payload's hooks and uses the database adapter directly for CRUD operations.
- This mode is faster and avoids triggering hooks, but does not run field/collection hooks, access control, or side effects.
- Use this mode for maximum performance when you do not need Payload's full hook system.

### 3. Drizzle Table Mode (Beta)
- If you pass a Drizzle table configuration, the plugin will use Drizzle directly for relationship operations.
- Just pass the Drizzle table in the plugin config in collection and it will be used for CRUD operations.
- To use Drizzle for relationship operations, you must:
  - Pass a `drizzleTable` property in the **collection** config.
  - For each relationship, specify both the `fieldName` and its corresponding `drizzleTable` in the `relationships` array.
- Example:
  ```js
  RelationshipPlugin({
    collections: {
      product: {
        drizzleTable: productTable, // Drizzle table for the collection
        relationships: [
          { fieldName: 'variants', drizzleTable: variantsTable }
        ]
      }
    }
  })
  ```

---

## API Usage Examples

### Using Payload's Local API

When `usePayloadHooks: true`, you can use Payload's standard `create` and `update` methods to create relationships inline:

#### Creating with Related Data

```typescript
// Create a product with variants in a single operation
const product = await payload.create({
  collection: 'products',
  data: {
    title: 'Premium T-Shirt',
    description: 'High-quality cotton t-shirt',
    variants: [], // Plugin will disregard this and use variantsArray instead
    variantsArray: [ // Plugin creates this field automatically
      {
        title: 'Small - Red',
        price: 29.99,
        stock: 50,
      },
      {
        title: 'Medium - Blue',
        price: 29.99,
        stock: 30,
      },
      {
        title: 'Large - Green',
        price: 29.99,
        stock: 20,
      },
    ],
  },
})
```

#### Updating with Related Data

```typescript
// Update product and variants together
const updatedProduct = await payload.update({
  collection: 'products',
  id: productId,
  data: {
    title: 'Updated Premium T-Shirt',
    variants: [], // Plugin will disregard this and use variantsArray instead
    variantsArray: [
      {
        title: 'Small - Red',
        price: 34.99, // Updated price
        stock: 45,
      },
      {
        title: 'Large - Green', // New variant
        price: 34.99,
        stock: 15,
      },
      // Removed 'Medium - Blue' variant (will be deleted)
    ],
  },
})
```

### Using Direct DB Access

When `usePayloadHooks: false` and addDefaultField is false:

```typescript
// Same API, but bypasses Payload hooks to save the relatedTo docs
const product = await payload.create({
  collection: 'products',
  data: {
    title: 'Fast T-Shirt',
    variants: [
      { title: 'Small', price: 25.99 },
      { title: 'Medium', price: 25.99 },
    ],
    
  },
})

```

---

## Notes

- `usePayloadHooks`: If set to true, it will go through all the hooks, and the order of the hooks it will append the plugin hooks first. First, it will call create in the relatedTo collection, then it will call update in the current collection, then it will call create. This is because in the `afterChange` hook, we call update on the current collection to update the relationship, then it will follow create hooks normally. We added contexts to let you know when it finishes.
- `config.customArrayOverrides`: If name is set, it will use this name. Else, if `addDefaultField` is true, it will use the name from the object and append "Array" to it. If `addDefaultField` is false and `usePayloadHooks` is false and no name is provided, it will use the name directly without appending "Array".

---

## Summary

This plugin is ideal when you want to:
- Add all related documents in a single create or update operation.
- Avoid manual syncing and data inconsistency.
