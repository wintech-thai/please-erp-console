'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight as ChevronRightIcon, History, Search } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { customerApi, type CustomerItem } from '@/lib/api/customer.api'
import { pointApi, type InventoryPointTx, type InventoryWallet } from '@/lib/api/point.api'
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
  if (tx.description === 'CreditInvoice') return `/business/sale-management/credit-sale/${tx.tags}/update`
  return null
}

export default function BalanceTransactionPage() {
  const { t } = useLang()
  const bt = t.balanceTransaction
  const cu = t.customer
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const customerId = params.id ?? ''
  const ssKey = `balance_tx_highlight_${customerId}`
  const { options: customerTypes } = useMasterRefOptions('CustomerType')
  const { options: customerGroups } = useMasterRefOptions('CustomerGroup')

  const [customer, setCustomer] = useState<CustomerItem | null>(null)
  const [wallet, setWallet] = useState<InventoryWallet | null>(null)
  const [txs, setTxs] = useState<InventoryPointTx[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [walletId, setWalletId] = useState('')
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

  const fetchTxs = useCallback((walletId: string, tr: TimeRangeValue) => {
    const { fromDate, toDate } = getTimeFilter(tr)
    pointApi.getPointTxsByWalletId(walletId, { limit: 100, fromDate, toDate })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : []
        const sorted = [...list].sort((a, b) => new Date(b.createdDate ?? 0).getTime() - new Date(a.createdDate ?? 0).getTime())
        setTxs(sorted)
        setPage(1)
      })
      .catch(() => toast.error(bt.loadFailed))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bt.loadFailed])

  useEffect(() => {
    if (!customerId) return
    let cancelled = false

    Promise.allSettled([
      customerApi.getCustomerById(customerId),
      pointApi.getWalletByRefIdAndType(customerId, 'AccountReceivable'),
    ]).then(([custRes, walletRes]) => {
      if (cancelled) return
      if (custRes.status === 'fulfilled') {
        const raw = custRes.value.data as unknown
        const c = (raw as { entity?: CustomerItem })?.entity ?? (raw as CustomerItem)
        setCustomer(c?.id ? c : null)
      }
      let w: InventoryWallet | null = null
      if (walletRes.status === 'fulfilled') {
        w = walletRes.value.data?.wallet ?? null
        setWallet(w)
      }
      if (w?.id) {
        setWalletId(w.id)
        fetchTxs(w.id, timeRange)
      }
      setLoading(false)
    }).catch(() => { if (!cancelled) { toast.error(bt.loadFailed); setLoading(false) } })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  function handleTimeRangeChange(tr: TimeRangeValue) {
    setTimeRange(tr)
    if (walletId) fetchTxs(walletId, tr)
  }

  const filteredTxs = searchTerm
    ? txs.filter(tx => (tx.tags2 ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
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
        <h1 className="text-2xl font-bold text-gray-900">{bt.txHistoryTitle}</h1>
      </div>

      <div className="flex-none grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-4 rounded-full bg-primary-500" />
            <h2 className="text-sm font-semibold text-gray-700">{bt.infoCustomerTitle}</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div>
              <p className="text-xs text-gray-400">{bt.fieldCode}</p>
              <p className="font-medium text-gray-800">{customer?.code || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{cu.colPhone}</p>
              <p className="font-medium text-gray-800">{customer?.primaryPhone || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-400">{bt.fieldName}</p>
              <p className="font-medium text-gray-800">{customer?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{cu.colType}</p>
              <p className="font-medium text-gray-800">
                {customerTypes.find(o => o.id === customer?.customerTypeId)?.description || customer?.customerTypeCode || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{cu.colGroup}</p>
              <p className="font-medium text-gray-800">
                {customerGroups.find(o => o.id === customer?.customerGroupId)?.description || customer?.customerGroupCode || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{cu.fieldCreditTermDay}</p>
              <p className="font-medium text-gray-800">{customer?.creditTermDay ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{cu.fieldCreditAmount}</p>
              <p className="font-medium text-gray-800">{fmtNumber(customer?.creditAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-4 rounded-full bg-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700">{bt.balanceTitle}</h2>
          </div>
          <p className="text-2xl font-bold text-amber-600 tabular-nums">{fmtNumber(wallet?.pointBalanceDecimal)}</p>
        </div>
      </div>

      <div className="flex-none flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 w-full min-w-56 max-w-xs bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
            placeholder={bt.searchPlaceholder}
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
            <p className="py-16 text-center text-sm text-gray-400">{bt.noTxData}</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{bt.colDate}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{bt.colDocNo}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{bt.colTxType}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-slate-100">{bt.colTxAmount}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-amber-100">{bt.colValueBefore}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-sky-100">{bt.colValueAfter}</th>
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
                      <td className="px-6 py-3 font-medium whitespace-nowrap">
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
                          tx.txType === 1 ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        )}>
                          {tx.txType === 1 ? bt.txTypeIn : bt.txTypeOut}
                        </span>
                      </td>
                      <td className={clsx(txCell, 'text-gray-800')}>{fmtNumber(tx.txAmountDecimal)}</td>
                      <td className={clsx(beginCell, 'text-gray-500')}>{fmtNumber(tx.previousBalanceDecimal)}</td>
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
