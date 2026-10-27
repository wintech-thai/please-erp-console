'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight as ChevronRightIcon, History, Search } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { inventoryLocationApi, type InventoryLocationItem } from '@/lib/api/inventory-location.api'
import { inventoryItemApi, type InventoryItemItem } from '@/lib/api/inventory-item.api'
import { pointApi, type InventoryPointTx } from '@/lib/api/point.api'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import { useMasterRefOptions } from '@/hooks/useMasterRefOptions'

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

function fmtNumber(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}

function getDocHref(tx: InventoryPointTx): string | null {
  if (!tx.tags) return null
  switch (tx.description) {
    case 'StockIn': return `/business/inventory/stock-in/${tx.tags}/update`
    case 'StockOut': return `/business/inventory/stock-out/${tx.tags}/update`
    case 'Transfer-In':
    case 'Transfer-Out': return `/business/inventory/stock-transfer/${tx.tags}/update`
    default: return null
  }
}

export default function TransactionHistoryPage() {
  const { t } = useLang()
  const it = t.itemTransaction
  const router = useRouter()
  const params = useParams<{ locationId: string; itemId: string }>()
  const locationId = params.locationId ?? ''
  const itemId = params.itemId ?? ''
  const ssKey = `inventory_tx_highlight_${locationId}_${itemId}`

  const [location, setLocation] = useState<InventoryLocationItem | null>(null)
  const [item, setItem] = useState<InventoryItemItem | null>(null)
  const { options: locationTypes } = useMasterRefOptions('LocationType')
  const { options: itemTypes } = useMasterRefOptions('ItemType')
  const { options: itemUnits } = useMasterRefOptions('ItemUnit')
  const [txs, setTxs] = useState<InventoryPointTx[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedId, setHighlightedId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem(ssKey)
    return null
  })

  function selectRow(id: string) {
    const next = highlightedId === id ? null : id
    setHighlightedId(next)
    if (next) sessionStorage.setItem(ssKey, next)
    else sessionStorage.removeItem(ssKey)
  }

  const fetchTxs = useCallback((tr: TimeRangeValue) => {
    if (!locationId || !itemId) return
    const { fromDate, toDate } = getTimeFilter(tr)
    pointApi.getPointTxsByLocationItemId(locationId, itemId, { limit: 100, fromDate, toDate })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : []
        // ให้เรียงจากใหม่ไปเก่า (descending) — ไม่แก้ sort order ฝั่ง backend
        // เพราะ endpoint เดียวกันนี้ใช้ร่วมกับ Please Payment
        const sorted = [...list].sort((a, b) => new Date(b.createdDate ?? 0).getTime() - new Date(a.createdDate ?? 0).getTime())
        setTxs(sorted)
        setPage(1)
      })
      .catch(() => toast.error(it.loadFailed))
  }, [locationId, itemId, it.loadFailed])

  useEffect(() => {
    if (!locationId || !itemId) return
    let cancelled = false

    Promise.allSettled([
      inventoryLocationApi.getLocationById(locationId),
      inventoryItemApi.getItemById(itemId),
    ]).then(([locRes, itemRes]) => {
      if (cancelled) return
      if (locRes.status === 'fulfilled') {
        const raw = locRes.value.data as unknown
        const loc = (raw as { inventoryLocation?: InventoryLocationItem })?.inventoryLocation ?? (raw as InventoryLocationItem)
        setLocation(loc?.id ? loc : null)
      }
      if (itemRes.status === 'fulfilled') {
        const raw = itemRes.value.data as unknown
        const i = (raw as { inventoryItem?: InventoryItemItem })?.inventoryItem ?? (raw as InventoryItemItem)
        setItem(i?.id ? i : null)
      }
      fetchTxs(timeRange)
      setLoading(false)
    }).catch(() => { if (!cancelled) { toast.error(it.loadFailed); setLoading(false) } })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, itemId])

  function handleTimeRangeChange(tr: TimeRangeValue) {
    setTimeRange(tr)
    fetchTxs(tr)
  }

  const filteredTxs = searchTerm
    ? txs.filter(tx => {
        const q = searchTerm.toLowerCase()
        return (tx.tags2 ?? '').toLowerCase().includes(q) || (tx.description ?? '').toLowerCase().includes(q)
      })
    : txs

  const total = filteredTxs.length
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const pagedTxs = filteredTxs.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100dvh-5rem)]">
        <div className="w-7 h-7 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <div className="flex-none flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-none">
          <History className="w-5 h-5 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{it.txHistoryTitle}</h1>
      </div>

      <div className="flex-none grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-4 rounded-full bg-primary-500" />
            <h2 className="text-sm font-semibold text-gray-700">{it.infoLocationTitle}</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div>
              <p className="text-xs text-gray-400">{it.fieldCode}</p>
              <p className="font-medium text-gray-800">{location?.code || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{it.fieldType}</p>
              <p className="font-medium text-gray-800">{locationTypes.find(o => o.code === location?.locationType)?.description || location?.locationType || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-400">{it.fieldName}</p>
              <p className="font-medium text-gray-800">{location?.name || '—'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-4 rounded-full bg-primary-500" />
            <h2 className="text-sm font-semibold text-gray-700">{it.infoItemTitle}</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div>
              <p className="text-xs text-gray-400">{it.fieldCode}</p>
              <p className="font-medium text-gray-800">{item?.code || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{it.fieldUnit}</p>
              <p className="font-medium text-gray-800">{itemUnits.find(o => o.code === item?.unit)?.description || item?.unit || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-400">{it.fieldName}</p>
              <p className="font-medium text-gray-800">{item?.nameTh || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-400">{it.fieldType}</p>
              <p className="font-medium text-gray-800">{itemTypes.find(o => o.code === item?.itemType)?.description || item?.itemType || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-none flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-56 max-w-xs bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
            placeholder={it.searchPlaceholder}
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setPage(1) }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <AdvancedTimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 overflow-y-auto">
          {filteredTxs.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">{it.noTxData}</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{it.colDate}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{it.colDocNo}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{it.colTxType}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-slate-100">{it.colTxQuantity}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-slate-100">{it.colUnitPrice}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-slate-100">{it.colTxAmount}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-amber-100">{it.colQtyBefore}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-amber-100">{it.colAvgPriceBefore}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-amber-100">{it.colValueBefore}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-sky-100">{it.colQtyAfter}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-sky-100">{it.colAvgPriceAfter}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-sky-100">{it.colValueAfter}</th>
                </tr>
              </thead>
              <tbody>
                {pagedTxs.map((tx, idx) => {
                  const isHighlighted = highlightedId === tx.id
                  const docHref = getDocHref(tx)
                  const txCell = clsx('px-6 py-3 text-right tabular-nums', !isHighlighted && 'bg-slate-100/80')
                  const beginCell = clsx('px-6 py-3 text-right tabular-nums', !isHighlighted && 'bg-amber-100/80')
                  const endCell = clsx('px-6 py-3 text-right tabular-nums', !isHighlighted && 'bg-sky-100/80')
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => selectRow(tx.id)}
                      className={clsx(
                        'border-l-[3px] border-b border-gray-50 cursor-pointer transition-colors',
                        isHighlighted
                          ? '!bg-primary-100 border-l-primary-500'
                          : clsx('border-l-transparent', idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50')
                      )}
                    >
                      <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{fmtDate(tx.createdDate)}</td>
                      <td className="px-6 py-3 font-medium whitespace-nowrap" title={tx.description || undefined}>
                        {docHref ? (
                          <a
                            href={docHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-primary-600 hover:underline"
                          >
                            {tx.tags2 || '—'}
                          </a>
                        ) : (
                          <span className="text-gray-800">{tx.tags2 || '—'}</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className={clsx(
                          'px-2 py-0.5 text-[10px] font-bold rounded-full ring-1',
                          tx.txType === 1 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-600 ring-red-200'
                        )}>
                          {tx.txType === 1 ? it.txTypeIn : it.txTypeOut}
                        </span>
                      </td>
                      <td className={clsx(txCell, 'text-gray-800')}>{fmtNumber(tx.txQuantityDecimal)}</td>
                      <td className={clsx(txCell, 'text-gray-600')}>{fmtNumber(tx.txAveragePriceDecimal)}</td>
                      <td className={clsx(txCell, 'text-gray-800')}>{fmtNumber(tx.txAmountDecimal)}</td>
                      <td className={clsx(beginCell, 'text-gray-500')}>{fmtNumber(tx.previousBalanceQuantityDecimal)}</td>
                      <td className={clsx(beginCell, 'text-gray-500')}>{fmtNumber(tx.previousAveragePriceDecimal)}</td>
                      <td className={clsx(beginCell, 'text-gray-500')}>{fmtNumber(tx.previousBalanceDecimal)}</td>
                      <td className={clsx(endCell, 'font-semibold text-gray-900')}>{fmtNumber(tx.currentBalanceQuantityDecimal)}</td>
                      <td className={clsx(endCell, 'text-gray-600')}>{fmtNumber(tx.currentAveragePriceDecimal)}</td>
                      <td className={clsx(endCell, 'font-semibold text-gray-900')}>{fmtNumber(tx.currentBalanceDecimal)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
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
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || total === 0}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
