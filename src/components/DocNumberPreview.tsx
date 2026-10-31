'use client'

import { useEffect, useState } from 'react'
import { documentNumberApi } from '@/lib/api/document-number.api'

function fmtDate(d: Date) {
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface Props {
  mode: 'add' | 'edit'
  documentType: string
  existingDocNo?: string | null
  existingDate?: string | null
  docNoLabel: string
  dateLabel: string
  hint: string
}

// x013 ข้อ 4 : preview เลขที่เอกสาร + วันที่แบบ read-only เฉยๆ — เลขจริงคำนวณตอน save ด้วย logic เดิมที่ backend
export default function DocNumberPreview({ mode, documentType, existingDocNo, existingDate, docNoLabel, dateLabel, hint }: Props) {
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'add') return
    let cancelled = false
    documentNumberApi.getNextDocumentNumber(documentType)
      .then(res => {
        if (cancelled) return
        const data = res.data as { documentNumber?: string; DocumentNumber?: string }
        setPreview(data.documentNumber || data.DocumentNumber || null)
      })
      .catch(() => { if (!cancelled) setPreview(null) })
    return () => { cancelled = true }
  }, [mode, documentType])

  const docNo = mode === 'add' ? preview : existingDocNo
  const date = mode === 'add' ? new Date() : (existingDate ? new Date(existingDate) : null)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">{docNoLabel}</label>
        <input type="text" value={docNo || '—'} readOnly className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
        {mode === 'add' && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">{dateLabel}</label>
        <input type="text" value={date ? fmtDate(date) : '—'} readOnly className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
      </div>
    </div>
  )
}
