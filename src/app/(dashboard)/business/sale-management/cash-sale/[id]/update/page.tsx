'use client'

import { useParams } from 'next/navigation'
import SalesDocForm from '@/components/SalesDocForm'

export default function UpdateCashSalePage() {
  const params = useParams<{ id: string }>()
  return <SalesDocForm mode="edit" saleType="cash" accountDocId={params.id} />
}
