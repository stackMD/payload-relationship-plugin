'use client'
import React, { useEffect, useRef } from 'react'
import { NumberField, useAllFormFields, useField, useForm, useFormFields } from '@payloadcms/ui'
import type { NumberFieldClientComponent } from 'payload'
import { reduceFieldsToValues } from 'payload/shared'

export const SaleTotal: NumberFieldClientComponent = (props) => {
  const { path } = props
  const total = useField<number>({ path })

  const [fields, dispatchFields] = useAllFormFields()
  const formData = reduceFieldsToValues(fields, true)
  const items = formData.salesItemsArray || []

  // Store previous total to compare and prevent unnecessary updates
  const prevTotalRef = useRef<number>(0)

  useEffect(() => {
    const calculatedTotal = items.reduce((sum: number, item: any) => {
      return sum + (item.price || 0) * (item.quantity || 0)
    }, 0)

    // Only update if the total has actually changed
    if (calculatedTotal !== prevTotalRef.current) {
      prevTotalRef.current = calculatedTotal
      total.setValue(calculatedTotal)
    }
  }, [items])

  return <NumberField {...props} readOnly />
}
