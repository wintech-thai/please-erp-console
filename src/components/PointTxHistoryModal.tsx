'use client'

import { useEffect, useState } from 'react'
import { X, History } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { useLang } from '@/context/LanguageContext'
import { pointApi, type InventoryPointTx } from '@/lib/api/point.api'

function fmtNumber(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}

interface Props {
  locationId: string
  itemId: string
  label: string
  onClose: () => void
}

export default function PointTxHistoryModal({ locationId, itemId, label, onClose }: Props) {
  const { t } = useLang()
  const it = t.itemTransaction
  const [txs, setTxs] = useState<InventoryPointTx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    pointApi.getPointTxsByLocationItemId(locationId, itemId, { limit: 100 })
      .then(res => { if (!cancelled) setTxs(Array.isArray(res.data) ? res.data : []) })
      .catch(() => { if (!cancelled) toast.error(it.loadFailed) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [locationId, itemId, it.loadFailed])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-primary-950/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-none flex items-center gap-3 px-5 py-4 bg-primary-600">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-none">
            <History className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{it.txHistoryTitle}</h3>
            <p className="text-xs text-primary-100 truncate">{label}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            </div>
          ) : txs.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">{it.noTxData}</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-sm">
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{it.colDate}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{it.colTxType}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{it.colTxQuantity}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{it.colTxAmount}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{it.colTxAveragePrice}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{it.colBalanceAfter}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{it.colDescription}</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx, idx) => (
                  <tr key={tx.id} className={clsx('border-b border-gray-50', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40')}>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(tx.createdDate)}</td>
                    <td className="px-4 py-2.5">
                      <span className={clsx(
                        'px-2 py-0.5 text-[10px] font-bold rounded-full ring-1',
                        tx.txType === 1 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-600 ring-red-200'
                      )}>
                        {tx.txType === 1 ? it.txTypeIn : it.txTypeOut}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">{fmtNumber(tx.txQuantityDecimal)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">{fmtNumber(tx.txAmountDecimal)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{fmtNumber(tx.txAveragePriceDecimal)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-900 whitespace-nowrap">
                      {fmtNumber(tx.currentBalanceQuantityDecimal)} / {fmtNumber(tx.currentBalanceDecimal)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-[14rem] truncate">{tx.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex-none px-5 py-3 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            {it.close}
          </button>
        </div>
      </div>
    </div>
  )
}
