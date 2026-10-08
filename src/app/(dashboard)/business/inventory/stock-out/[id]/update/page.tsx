'use client'

import { useParams } from 'next/navigation'
import StockOutForm from '@/components/StockOutForm'

export default function UpdateStockOutPage() {
  const params = useParams<{ id: string }>()
  return <StockOutForm mode="edit" inventoryDocId={params.id} />
}
