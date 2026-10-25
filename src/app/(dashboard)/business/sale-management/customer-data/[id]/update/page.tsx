'use client'

import { useParams } from 'next/navigation'
import CustomerForm from '@/components/CustomerForm'

export default function UpdateCustomerPage() {
  const params = useParams<{ id: string }>()
  return <CustomerForm mode="edit" entityId={params.id} />
}
