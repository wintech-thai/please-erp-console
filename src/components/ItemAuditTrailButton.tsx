'use client'

import { useState } from 'react'
import { History } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'
import AuditTrailDrawer from '@/components/AuditTrailDrawer'

interface Props {
  rowId: string
  itemLabel?: string
}

// x013 ข้อ 9 ปรับแก้ : audit trail ระดับ item (child row) — rowId คือ id ของแถว
// InventoryDocItem เอง (ไม่ใช่ itemId ของ master item) เพราะ AuditTrailInterceptor
// track การเปลี่ยนแปลงราย row ของ table InventoryDocItems อยู่แล้ว
export default function ItemAuditTrailButton({ rowId, itemLabel }: Props) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t.docAuditTrail.itemTrailTooltip}
        className="p-1 rounded text-gray-300 hover:text-primary-600 hover:bg-primary-50 transition-colors flex-none"
      >
        <History className="w-3.5 h-3.5" />
      </button>
      {open && <AuditTrailDrawer rowId={rowId} subtitle={itemLabel} onClose={() => setOpen(false)} />}
    </>
  )
}
