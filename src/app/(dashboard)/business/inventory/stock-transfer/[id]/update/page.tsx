'use client'

import { useParams } from 'next/navigation'
import StockTransferForm from '@/components/StockTransferForm'

export default function UpdateStockTransferPage() {
  const params = useParams<{ id: string }>()
  return <StockTransferForm mode="edit" inventoryDocId={params.id} />
}
