'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { Search, Plus, Database, ChevronLeft, ChevronRight as ChevronRightIcon, MoreHorizontal, CheckCircle2, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import { accountDocApi, type AccountDocItem } from '@/lib/api/account-doc.api'

type SaleType = 'cash' | 'credit'

function getTimeFilter(tr: TimeRangeValue): { fromDate?: string; toDate?: string } {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return { fromDate: new Date(tr.start * 1000).toISOString(), toDate: new Date(tr.end * 1000).toISOString() }
  }
  if (tr.type === 'relative' && tr.value) {
    const num = parseInt(tr.value) || 0
    const unit = tr.value.replace(/\d/g, '')
    const now = Date.now()
    const ms = unit === 'm' ? num * 60_000 : unit === 'h' ? num * 3_600_000 : num * 86_400_000
    return { fromDate: new Date(now - ms).toISOString(), toDate: new Date(now).toISOString() }
  }
  return {}
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtNumber(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatusBadge({ status, label }: { status?: string | null; label: string }) {
  const styles = status === 'Approved'
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    : status === 'Cancelled'
      ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
      : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  return <span className={clsx('px-2.5 py-0.5 rounded-full text-[11px] font-semibold', styles)}>{label}</span>
}

function ConfirmModal({ title, desc, confirmLabel, confirmingLabel, cancelLabel, confirming, danger, onConfirm, onCancel }: {
  title: string; desc: string; confirmLabel: string; confirmingLabel: string; cancelLabel: string
  confirming: boolean; danger?: boolean; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
          {danger ? <XCircle className="w-7 h-7 text-white" /> : <CheckCircle2 className="w-7 h-7 text-white" />}
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-white/60 mb-7">{desc}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className={clsx('flex-1 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60 transition-colors uppercase',
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700')}
          >
            {confirming ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function SalesDocListContent({ saleType }: { saleType: SaleType }) {
  const { t } = useLang()
  const sd = t.salesDoc
  const tt = saleType === 'cash' ? t.cashSale : t.creditSale
  const basePath = `/business/sale-management/${saleType === 'cash' ? 'cash-sale' : 'credit-sale'}`
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [docs, setDocs] = useState<AccountDocItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ action: 'approve' | 'cancel'; id: string; docNo: string } | null>(null)
  const [actioning, setActioning] = useState(false)
  const ssKey = `${saleType}_sale_highlight`
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem(ssKey) ?? null
    return null
  })
  const menuRef = useRef<HTMLDivElement>(null)

  const api = saleType === 'cash'
    ? { list: accountDocApi.getCashSales, count: accountDocApi.getCashSaleCount }
    : { list: accountDocApi.getCreditSales, count: accountDocApi.getCreditSaleCount }

  const fetchDocs = useCallback(async (
    search = searchTerm, status = statusFilter, tr = timeRange, p = page, perPage = itemsPerPage
  ) => {
    setLoading(true)
    try {
      const { fromDate, toDate } = getTimeFilter(tr)
      const offset = (p - 1) * perPage + 1
      const payload = { fullTextSearch: search || undefined, documentStatus: status || undefined, fromDate, toDate }
      const [listRes, countRes] = await Promise.allSettled([
        api.list({ ...payload, offset, limit: perPage }),
        api.count(payload),
      ])
      if (listRes.status === 'fulfilled') setDocs(Array.isArray(listRes.value.data) ? listRes.value.data : [])
      if (countRes.status === 'fulfilled') { const raw = countRes.value.data as unknown; setTotal(typeof raw === 'number' ? raw : 0) }
    } catch { toast.error(sd.loadFailed) } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sd.loadFailed, saleType])

  useEffect(() => { fetchDocs(searchTerm, statusFilter, timeRange, page, itemsPerPage) }, [page, itemsPerPage, saleType]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!openMenuId) return
    const handler = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setOpenMenuId(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenuId])

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    sessionStorage.setItem(ssKey, highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname)
    fetchDocs(searchTerm, statusFilter, timeRange, 1)
    setPage(1)
    const timer = setTimeout(() => {
      document.getElementById(`${saleType}-sale-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightIdParam])

  function selectRow(id: string) {
    const next = selectedRowId === id ? null : id
    setSelectedRowId(next)
    if (next) sessionStorage.setItem(ssKey, next)
    else sessionStorage.removeItem(ssKey)
  }

  function handleSearch() { setPage(1); fetchDocs(searchTerm, statusFilter, timeRange, 1) }
  function handleStatusChange(value: string) { setStatusFilter(value); setPage(1); fetchDocs(searchTerm, value, timeRange, 1) }
  function handleTimeRangeChange(tr: TimeRangeValue) { setTimeRange(tr); setPage(1); fetchDocs(searchTerm, statusFilter, tr, 1) }

  async function handleConfirmAction() {
    if (!confirmModal) return
    setActioning(true)
    try {
      if (confirmModal.action === 'approve') {
        await accountDocApi.approveDocById(confirmModal.id)
        toast.success(sd.approveSuccess)
      } else {
        await accountDocApi.cancelDocById(confirmModal.id)
        toast.success(sd.cancelDocSuccess)
      }
      setConfirmModal(null)
      fetchDocs()
    } catch (err) {
      const axiosErr = err as AxiosError
      const fallback = confirmModal.action === 'approve' ? sd.failedToApprove : sd.failedToCancelDoc
      toast.error(axiosErr.message || fallback)
    } finally { setActioning(false) }
  }

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)

  const statusLabel = (status?: string | null) =>
    status === 'Approved' ? sd.statusApproved : status === 'Cancelled' ? sd.statusCancelled : sd.statusPending

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <div className="flex-none flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tt.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tt.subtitle}</p>
        </div>
        <button
          onClick={() => router.push(`${basePath}/add`)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {tt.addBtn}
        </button>
      </div>

      <div className="flex-none flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-56 max-w-xs bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={sd.searchPlaceholder}
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setPage(1); fetchDocs('', statusFilter, timeRange, 1) }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => handleStatusChange(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{sd.allStatus}</option>
          <option value="Pending">{sd.statusPending}</option>
          <option value="Approved">{sd.statusApproved}</option>
          <option value="Cancelled">{sd.statusCancelled}</option>
        </select>
        <AdvancedTimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
        <button onClick={handleSearch} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
          {t.admin.search}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{sd.colDocNo}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{sd.colDate}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{sd.colCustomer}</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{sd.colTotal}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{sd.colStatus}</th>
                <th className="w-28 px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{sd.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                    <span className="text-sm text-gray-400">{t.admin.loading}</span>
                  </div>
                </td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center">
                  <Database className="w-7 h-7 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400">{sd.noData}</p>
                </td></tr>
              ) : docs.map((doc, idx) => {
                const highlighted = selectedRowId === doc.id
                return (
                  <tr
                    key={doc.id}
                    id={`${saleType}-sale-row-${doc.id}`}
                    onClick={() => selectRow(doc.id)}
                    className={clsx(
                      'border-l-[3px] border-b border-gray-100 cursor-pointer transition-colors',
                      highlighted
                        ? '!bg-primary-100 border-l-primary-500'
                        : clsx('border-l-transparent', idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50')
                    )}
                  >
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`${basePath}/${doc.id}/update`)}
                        className="font-semibold text-primary-600 hover:text-primary-800 hover:underline underline-offset-2 transition-colors"
                      >
                        {doc.documentNo}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{fmtDate(doc.documentDate || doc.createdDate)}</td>
                    <td className="px-6 py-4 text-gray-600">{doc.entityName || doc.entityCode || '—'}</td>
                    <td className="px-6 py-4 text-right tabular-nums font-semibold text-primary-700">{fmtNumber(doc.totalPrice)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge status={doc.status} label={statusLabel(doc.status)} />
                        {doc.status === 'Approved' && doc.approvedDate && (
                          <span className="text-[11px] text-gray-400">{fmtDate(doc.approvedDate)}</span>
                        )}
                        {doc.status === 'Cancelled' && doc.statusDate && (
                          <span className="text-[11px] text-gray-400">{fmtDate(doc.statusDate)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { if (doc.status === 'Pending') setOpenMenuId(prev => prev === doc.id ? null : doc.id) }}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {doc.status === 'Pending' && openMenuId === doc.id && (
                        <div ref={menuRef} className="absolute right-4 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 text-left">
                          <button
                            onClick={() => { setOpenMenuId(null); setConfirmModal({ action: 'approve', id: doc.id, docNo: doc.documentNo }) }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-primary-700 hover:bg-primary-50 transition-colors whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 flex-none" />
                            {sd.menuApprove}
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); setConfirmModal({ action: 'cancel', id: doc.id, docNo: doc.documentNo }) }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
                          >
                            <XCircle className="w-3.5 h-3.5 flex-none" />
                            {sd.menuCancel}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex-none flex items-center justify-end px-6 py-3 border-t border-gray-100 gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{t.admin.rowsPerPage}</span>
            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
              className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm">
              {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} of {total}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || total === 0 || loading}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.action === 'approve' ? sd.approveConfirmTitle : sd.cancelDocConfirmTitle}
          desc={confirmModal.action === 'approve' ? sd.approveConfirmDesc : sd.cancelDocConfirmDesc}
          confirmLabel={confirmModal.action === 'approve' ? sd.approveBtn : sd.confirm}
          confirmingLabel={confirmModal.action === 'approve' ? sd.approving : sd.cancelling}
          cancelLabel={sd.cancel}
          confirming={actioning}
          danger={confirmModal.action === 'cancel'}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}

export default function SalesDocList({ saleType }: { saleType: SaleType }) {
  return (
    <Suspense>
      <SalesDocListContent saleType={saleType} />
    </Suspense>
  )
}
