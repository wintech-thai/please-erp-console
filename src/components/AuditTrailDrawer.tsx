'use client'

import { useState, useEffect } from 'react'
import { X, History, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'
import { auditTrailApi, type AuditTrack } from '@/lib/api/audit-trail.api'

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return iso }
}

function ActionBadge({ action }: { action?: string | null }) {
  const a = action?.toLowerCase()
  if (a === 'added') return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">{action}</span>
  )
  if (a === 'modified') return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200">{action}</span>
  )
  if (a === 'deleted') return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 ring-1 ring-red-200">{action}</span>
  )
  return <span className="text-xs text-gray-500">{action ?? '—'}</span>
}

function highlightJson(json: string): string {
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) return `<span style="color:#6366f1;font-weight:600">${match}</span>`
        return `<span style="color:#059669">${match}</span>`
      }
      if (/true|false/.test(match)) return `<span style="color:#d97706">${match}</span>`
      if (/null/.test(match)) return `<span style="color:#9ca3af">${match}</span>`
      return `<span style="color:#0284c7">${match}</span>`
    }
  )
}

function computeDiff(oldJson?: string | null, newJson?: string | null) {
  try {
    const oldObj: Record<string, unknown> = oldJson ? JSON.parse(oldJson) : {}
    const newObj: Record<string, unknown> = newJson ? JSON.parse(newJson) : {}
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))
    const diffOld: Record<string, unknown> = {}
    const diffNew: Record<string, unknown> = {}
    for (const k of allKeys) {
      if (JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k])) {
        if (k in oldObj) diffOld[k] = oldObj[k]
        if (k in newObj) diffNew[k] = newObj[k]
      }
    }
    return { diffOld, diffNew }
  } catch {
    return { diffOld: {}, diffNew: {} }
  }
}

function DiffCell({ data, fieldsLabel, copyLabel, copiedLabel }: {
  data: Record<string, unknown>; fieldsLabel: string; copyLabel: string; copiedLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const keys = Object.keys(data)
  if (keys.length === 0) return <span className="text-gray-300 text-xs">—</span>

  const formatted = JSON.stringify(data, null, 2)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(formatted)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span className="text-[10px] text-gray-400">{keys.length} {fieldsLabel}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-50 w-80 shadow-xl border border-gray-200 rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 bg-gray-50">
            <span className="text-[10px] text-gray-400 font-medium">{keys.length} {fieldsLabel}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-primary-600 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              {copied ? copiedLabel : copyLabel}
            </button>
          </div>
          <pre
            className="text-[10px] font-mono p-3 overflow-auto whitespace-pre-wrap break-all leading-relaxed max-h-72"
            dangerouslySetInnerHTML={{ __html: highlightJson(formatted) }}
          />
        </div>
      )}
    </div>
  )
}

interface Props {
  rowId: string
  subtitle?: string
  onClose: () => void
}

// x013 ข้อ 9 ปรับแก้ : ย้ายมาใช้ MAuditTrack (field-level diff ผ่าน EF SaveChangesInterceptor)
// เหมือนที่ please-payment-admin ใช้กับ PayIn/PayOut แทนระบบ AuditLogs/ES เดิม — ported
// AuditTrailDrawer.tsx จาก please-payment-admin เกือบทั้งหมด (ตัด useFormatDate/timezone
// ออกเพราะ ERP ยังไม่มีระบบนั้น ใช้ th-TH locale ตรงๆ แทน)
export default function AuditTrailDrawer({ rowId, subtitle, onClose }: Props) {
  const { t } = useLang()
  const at = t.docAuditTrail
  const [tracks, setTracks] = useState<AuditTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    auditTrailApi.getByRowId(rowId)
      .then(res => { if (!cancelled) setTracks(Array.isArray(res.data) ? res.data : []) })
      .catch(() => { if (!cancelled) setError(at.loadFailed) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [rowId, at.loadFailed])

  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/20" onClick={onClose} />
      <div className="fixed top-0 right-0 h-screen w-full max-w-[860px] bg-white border-l border-gray-200 shadow-2xl z-[9999] flex flex-col">
        <div className="flex-none flex items-center justify-between px-6 py-4 bg-gray-900 text-white">
          <div className="flex items-center gap-2 min-w-0">
            <History className="w-4 h-4 text-white/70 flex-none" />
            <span className="text-sm font-bold uppercase tracking-widest flex-none">{at.title}</span>
            <span className="text-xs text-white/50 ml-1 truncate">{subtitle || rowId}</span>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors flex-none">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <div className="w-5 h-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
              <span className="text-sm">{at.loading}</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-red-500 text-sm">{error}</div>
          ) : tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
              <History className="w-8 h-8 opacity-30" />
              <span className="text-sm">{at.noRecords}</span>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide w-36">{at.colDate}</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">{at.colApiName}</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide w-24">{at.colAction}</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide w-36">{at.colBy}</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide w-24">{at.colOld}</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide w-24">{at.colNew}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tracks.map((t, i) => {
                  const { diffOld, diffNew } = computeDiff(t.oldValue, t.newValue)
                  return (
                    <tr key={t.id ?? i} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        <div>{fmtDate(t.createdDate)}</div>
                        {t.ipAddress2 && <div className="text-[10px] text-gray-400 mt-0.5">{t.ipAddress2}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-gray-700 cursor-help" title={t.actionRequested ?? undefined}>
                          {t.apiName ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3"><ActionBadge action={t.actionName} /></td>
                      <td className="px-4 py-3 text-gray-600">{t.actionBy ?? at.unknownUser}</td>
                      <td className="px-4 py-3"><DiffCell data={diffOld} fieldsLabel={at.fieldsCount} copyLabel={at.copy} copiedLabel={at.copied} /></td>
                      <td className="px-4 py-3"><DiffCell data={diffNew} fieldsLabel={at.fieldsCount} copyLabel={at.copy} copiedLabel={at.copied} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
