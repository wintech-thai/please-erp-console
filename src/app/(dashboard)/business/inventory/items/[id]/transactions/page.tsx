'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight as ChevronRightIcon, History, Search } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { inventoryItemApi, type InventoryItemItem } from '@/lib/api/inventory-item.api'
import { inventoryLocationApi, type InventoryLocationItem } from '@/lib/api/inventory-location.api'
import { pointApi, type InventoryWallet } from '@/lib/api/point.api'

const listPath = '/business/inventory/items'

function fmtNumber(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ItemLocationTransactionsPage() {
  const { t } = useLang()
  const it = t.itemTransaction
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const itemId = params.id ?? ''
  const ssKey = `inventory_item_tx_balance_highlight_${itemId}`

  const [item, setItem] = useState<InventoryItemItem | null>(null)
  const [wallets, setWallets] = useState<InventoryWallet[]>([])
  const [locations, setLocations] = useState<InventoryLocationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [highlightedId, setHighlightedId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem(ssKey)
    return null
  })
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')

  function selectRow(id: string) {
    const next = highlightedId === id ? null : id
    setHighlightedId(next)
    if (next) sessionStorage.setItem(ssKey, next)
    else sessionStorage.removeItem(ssKey)
  }

  useEffect(() => {
    if (!itemId) return
    let cancelled = false

    Promise.allSettled([
      inventoryItemApi.getItemById(itemId),
      pointApi.getWalletsByItemId(itemId),
      inventoryLocationApi.getLocations({ limit: 100 }),
    ]).then(([itemRes, walletsRes, locRes]) => {
      if (cancelled) return
      if (itemRes.status === 'fulfilled') {
        const raw = itemRes.value.data as unknown
        const i = (raw as { inventoryItem?: InventoryItemItem })?.inventoryItem ?? (raw as InventoryItemItem)
        setItem(i?.id ? i : null)
      }
      if (walletsRes.status === 'fulfilled') setWallets(Array.isArray(walletsRes.value.data) ? walletsRes.value.data : [])
      if (locRes.status === 'fulfilled') setLocations(Array.isArray(locRes.value.data) ? locRes.value.data : [])
      setLoading(false)
    }).catch(() => { if (!cancelled) { toast.error(it.loadFailed); setLoading(false) } })

    return () => { cancelled = true }
  }, [itemId, it.loadFailed])

  const locationById = new Map(locations.map(l => [l.id, l]))

  const filteredWallets = searchTerm
    ? wallets.filter(w => {
        const loc = w.inventoryLocationId ? locationById.get(w.inventoryLocationId) : undefined
        const q = searchTerm.toLowerCase()
        return (loc?.code ?? '').toLowerCase().includes(q) || (loc?.name ?? '').toLowerCase().includes(q)
      })
    : wallets

  const total = filteredWallets.length
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const pagedWallets = filteredWallets.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100dvh-5rem)]">
        <div className="w-7 h-7 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <div className="flex-none flex items-center gap-3 mb-6">
        <button onClick={() => router.push(listPath)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{it.byItemTitle}</h1>
          <p className="text-base text-gray-500 mt-0.5">
            {it.byItemSubtitle}{item ? ` — ${item.code} ${item.nameTh || ''}` : ''}
          </p>
        </div>
      </div>

      <div className="flex-none flex items-center mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-56 max-w-xs bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
            placeholder={it.balanceSearchByLocationPlaceholder}
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setPage(1) }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex-1 overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{it.colLocationCode}</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{it.colLocationName}</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{it.colQuantity}</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{it.colAveragePrice}</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{it.colValue}</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{it.colAction}</th>
            </tr>
          </thead>
          <tbody>
            {pagedWallets.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-400">{it.noData}</td></tr>
            ) : pagedWallets.map((w, idx) => {
              const loc = w.inventoryLocationId ? locationById.get(w.inventoryLocationId) : undefined
              const highlighted = highlightedId === w.id
              return (
                <tr
                  key={w.id}
                  onClick={() => selectRow(w.id)}
                  className={clsx(
                    'border-l-[3px] border-b border-gray-50 cursor-pointer transition-colors',
                    highlighted
                      ? '!bg-primary-100 border-l-primary-500'
                      : clsx('border-l-transparent', idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50')
                  )}
                >
                  <td className="px-6 py-3 font-medium text-gray-800">{loc?.code || w.inventoryLocationId || '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{loc?.name || '—'}</td>
                  <td className="px-6 py-3 text-right tabular-nums text-gray-800">{fmtNumber(w.pointQuantityBalanceDecimal)}</td>
                  <td className="px-6 py-3 text-right tabular-nums text-gray-600">{fmtNumber(w.pointAveragePriceDecimal)}</td>
                  <td className="px-6 py-3 text-right tabular-nums font-semibold text-gray-900">{fmtNumber(w.pointBalanceDecimal)}</td>
                  <td className="px-6 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => loc && router.push(`/business/inventory/transactions/${loc.id}/${itemId}`)}
                      disabled={!loc}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <History className="w-3.5 h-3.5" />
                      {it.viewHistory}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
