import { useEffect, useState } from 'react'
import { masterRefApi } from '@/lib/api/master-ref.api'

export interface MasterRefOption {
  code: string
  description: string
}

// ดึงตัวเลือกจาก MasterRef สำหรับ dropdown เช่น LocationType, ItemType, ItemUnit
export function useMasterRefOptions(refType: string) {
  const [options, setOptions] = useState<MasterRefOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    masterRefApi
      .getRefs({ refType, limit: 100 })
      .then(res => {
        if (cancelled) return
        const list = Array.isArray(res.data) ? res.data : []
        setOptions(list.map(r => ({ code: r.code, description: r.description })))
      })
      .catch(() => { if (!cancelled) setOptions([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refType])

  return { options, loading }
}
