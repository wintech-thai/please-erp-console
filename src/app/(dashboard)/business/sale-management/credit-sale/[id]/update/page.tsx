'use client'

import { useParams } from 'next/navigation'
import SalesDocForm from '@/components/SalesDocForm'

export default function UpdateCreditSalePage() {
  const params = useParams<{ id: string }>()
  return <SalesDocForm mode="edit" saleType="credit" accountDocId={params.id} />
}
