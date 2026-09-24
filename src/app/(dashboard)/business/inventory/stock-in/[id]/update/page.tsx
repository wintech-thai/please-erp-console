'use client'

import { useParams } from 'next/navigation'
import StockInForm from '@/components/StockInForm'

export default function UpdateStockInPage() {
  const params = useParams<{ id: string }>()
  return <StockInForm mode="edit" inventoryDocId={params.id} />
}
