'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Database, Boxes, Coins, AlertTriangle, PackagePlus, PackageMinus, ArrowLeftRight, Clock } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useTenant } from '@/context/TenantContext'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import { inventoryLocationApi, type InventoryLocationItem } from '@/lib/api/inventory-location.api'
import { inventoryItemApi, type InventoryItemItem } from '@/lib/api/inventory-item.api'
import { inventoryDocApi } from '@/lib/api/inventory-doc.api'
import { pointApi, type InventoryWallet } from '@/lib/api/point.api'

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

function MiniSpinner({ className }: { className?: string }) {
  return <span className={clsx('inline-block rounded-full border-2 border-gray-300 border-t-primary-500 animate-spin align-middle', className)} />
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function fmtNumber(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function StatCard({ icon: Icon, label, value, gradient, onClick }: {
  icon: typeof Database; label: string; value: React.ReactNode; gradient: string; onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-4 text-left transition-all',
        onClick && 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
      )}
    >
      <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center flex-none text-white shadow-sm bg-gradient-to-br', gradient)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
      </div>
    </Comp>
  )
}

function ActivityTile({ icon: Icon, label, value, color, onClick }: {
  icon: typeof PackagePlus; label: string; value: React.ReactNode; color: string; onClick?: () => void
}) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={clsx('flex items-center gap-3 p-3 rounded-lg transition-all text-left', onClick && 'hover:bg-gray-50 hover:-translate-y-0.5')}>
      <span className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-none', color)}>
        <Icon className="w-4 h-4" />
      </span>
      <span>
        <span className="block text-lg font-bold text-gray-900">{value}</span>
        <span className="block text-xs text-gray-400">{label}</span>
      </span>
    </button>
  )
}

// x013 ข้อ 10 : dashboard สรุปภาพรวมระบบคลัง — KPI การ์ดเป็น snapshot ปัจจุบันเสมอ (ไม่ผูกกับ
// date range) ส่วน "กิจกรรม" ผูกกับ date range ที่เลือกได้ ถ้าจะเพิ่มสรุปภาพรวมของโมดูลอื่น
// (ซื้อ/ขาย) ในอนาคต ให้สร้าง section component แยกแบบนี้แล้วเอาไปวางต่อในหน้า overview/page.tsx
export default function InventoryOverviewSection() {
  const { t } = useLang()
  const ov = t.overview
  const router = useRouter()
  const { loading: tenantLoading, selectedOrg } = useTenant()

  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [loading, setLoading] = useState(true)
  const [locationCount, setLocationCount] = useState(0)
  const [locations, setLocations] = useState<InventoryLocationItem[]>([])
  const [items, setItems] = useState<InventoryItemItem[]>([])
  const [itemCount, setItemCount] = useState(0)
  const [wallets, setWallets] = useState<InventoryWallet[]>([])
  const [activity, setActivity] = useState({ stockIn: 0, stockOut: 0, transfer: 0, pending: 0 })
  const [activityLoading, setActivityLoading] = useState(true)

  useEffect(() => {
    // รอ TenantContext resolve org จริงก่อน (login ใหม่ orgId จะเป็น 'global' ชั่วคราว
    // ยิง API ตอนนั้นได้ 401 เพราะ org ไม่ถูกต้อง ไม่ใช่ session หมดอายุ)
    if (tenantLoading || !selectedOrg) return
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      inventoryLocationApi.getLocations({ limit: 100 }),
      inventoryLocationApi.getLocationCount(),
      inventoryItemApi.getItems({ limit: 100 }),
      inventoryItemApi.getItemCount(),
    ]).then(async ([locRes, locCountRes, itemRes, itemCountRes]) => {
      if (cancelled) return
      const locs = locRes.status === 'fulfilled' && Array.isArray(locRes.value.data) ? locRes.value.data : []
      setLocations(locs)
      if (locCountRes.status === 'fulfilled') setLocationCount(Number(locCountRes.value.data) || 0)
      if (itemRes.status === 'fulfilled') setItems(Array.isArray(itemRes.value.data) ? itemRes.value.data : [])
      if (itemCountRes.status === 'fulfilled') setItemCount(Number(itemCountRes.value.data) || 0)

      const walletResults = await Promise.allSettled(locs.map(l => pointApi.getWalletsByLocationId(l.id)))
      if (cancelled) return
      setWallets(walletResults.flatMap(r => (r.status === 'fulfilled' && Array.isArray(r.value.data) ? r.value.data : [])))
      setLoading(false)
    }).catch(() => { if (!cancelled) { toast.error(ov.loadFailed); setLoading(false) } })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantLoading, selectedOrg])

  useEffect(() => {
    if (tenantLoading || !selectedOrg) return
    let cancelled = false
    setActivityLoading(true)
    const { fromDate, toDate } = getTimeFilter(timeRange)
    Promise.allSettled([
      inventoryDocApi.getDocCount({ documentType: 'StockIn', fromDate, toDate }),
      inventoryDocApi.getDocCount({ documentType: 'StockOut', fromDate, toDate }),
      inventoryDocApi.getDocCount({ documentType: 'StockTransfer', fromDate, toDate }),
      inventoryDocApi.getDocCount({ documentStatus: 'Pending' }),
    ]).then(([a, b, c, d]) => {
      if (cancelled) return
      setActivity({
        stockIn: a.status === 'fulfilled' ? Number(a.value.data) || 0 : 0,
        stockOut: b.status === 'fulfilled' ? Number(b.value.data) || 0 : 0,
        transfer: c.status === 'fulfilled' ? Number(c.value.data) || 0 : 0,
        pending: d.status === 'fulfilled' ? Number(d.value.data) || 0 : 0,
      })
      setActivityLoading(false)
    }).catch(() => { if (!cancelled) setActivityLoading(false) })
    return () => { cancelled = true }
  }, [timeRange, tenantLoading, selectedOrg])

  const totalStockValue = wallets.reduce((s, w) => s + (w.pointBalanceDecimal || 0), 0)

  const qtyByItem = new Map<string, number>()
  wallets.forEach(w => {
    if (!w.inventoryItemId) return
    qtyByItem.set(w.inventoryItemId, (qtyByItem.get(w.inventoryItemId) || 0) + (w.pointQuantityBalanceDecimal || 0))
  })
  const lowStockItems = items
    .filter(i => i.minimumQuantity != null && i.minimumQuantity > 0)
    .map(i => ({ item: i, qty: qtyByItem.get(i.id) || 0 }))
    .filter(x => x.qty < (x.item.minimumQuantity || 0))
    .sort((a, b) => (a.qty - (a.item.minimumQuantity || 0)) - (b.qty - (b.item.minimumQuantity || 0)))

  const valueByLocation = locations
    .map(l => ({ location: l, value: wallets.filter(w => w.inventoryLocationId === l.id).reduce((s, w) => s + (w.pointBalanceDecimal || 0), 0) }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const maxLocationValue = Math.max(1, ...valueByLocation.map(x => x.value))

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">{ov.inventorySectionTitle}</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Database} label={ov.kpiLocations} value={loading ? <MiniSpinner className="w-4 h-4" /> : locationCount} gradient="from-primary-500 to-primary-700" onClick={() => router.push('/business/inventory/locations')} />
        <StatCard icon={Boxes} label={ov.kpiItems} value={loading ? <MiniSpinner className="w-4 h-4" /> : itemCount} gradient="from-primary-600 to-primary-800" onClick={() => router.push('/business/inventory/items')} />
        <StatCard icon={Coins} label={ov.kpiStockValue} value={loading ? <MiniSpinner className="w-4 h-4" /> : fmtNumber(totalStockValue)} gradient="from-emerald-400 to-emerald-600" onClick={() => scrollToSection('top-locations-section')} />
        <StatCard icon={AlertTriangle} label={ov.kpiLowStock} value={loading ? <MiniSpinner className="w-4 h-4" /> : lowStockItems.length} gradient="from-amber-400 to-amber-600" onClick={() => scrollToSection('low-stock-section')} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-gray-900">{ov.activityTitle}</h3>
          <AdvancedTimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ActivityTile icon={PackagePlus} label={ov.activityStockIn} value={activityLoading ? <MiniSpinner className="w-3.5 h-3.5" /> : activity.stockIn} color="text-emerald-600 bg-emerald-50" onClick={() => router.push('/business/inventory/stock-in')} />
          <ActivityTile icon={PackageMinus} label={ov.activityStockOut} value={activityLoading ? <MiniSpinner className="w-3.5 h-3.5" /> : activity.stockOut} color="text-red-600 bg-red-50" onClick={() => router.push('/business/inventory/stock-out')} />
          <ActivityTile icon={ArrowLeftRight} label={ov.activityTransfer} value={activityLoading ? <MiniSpinner className="w-3.5 h-3.5" /> : activity.transfer} color="text-primary-600 bg-primary-50" onClick={() => router.push('/business/inventory/stock-transfer')} />
          <ActivityTile icon={Clock} label={ov.activityPending} value={activityLoading ? <MiniSpinner className="w-3.5 h-3.5" /> : activity.pending} color="text-amber-600 bg-amber-50" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="low-stock-section" className="bg-white rounded-xl shadow-sm border border-gray-100 scroll-mt-4">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-gray-900">{ov.lowStockTitle}</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-10 text-center"><div className="w-6 h-6 mx-auto rounded-full border-2 border-primary-500 border-t-transparent animate-spin" /></div>
            ) : lowStockItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{ov.lowStockEmpty}</p>
            ) : (
              <table className="min-w-full text-sm">
                <tbody>
                  {lowStockItems.map(({ item, qty }) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/business/inventory/items/${item.id}/transactions`)}
                    >
                      <td className="px-6 py-2.5">
                        <p className="font-medium text-gray-800">{item.code}</p>
                        <p className="text-xs text-gray-400">{item.nameTh}</p>
                      </td>
                      <td className="px-6 py-2.5 text-right whitespace-nowrap">
                        <span className="font-semibold text-red-600 tabular-nums">{fmtNumber(qty)}</span>
                        <span className="text-xs text-gray-400"> / {fmtNumber(item.minimumQuantity)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div id="top-locations-section" className="bg-white rounded-xl shadow-sm border border-gray-100 scroll-mt-4">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary-600" />
            <h3 className="text-sm font-bold text-gray-900">{ov.topLocationsTitle}</h3>
          </div>
          <div className="px-6 py-4 space-y-3">
            {loading ? (
              <div className="py-6 text-center"><div className="w-6 h-6 mx-auto rounded-full border-2 border-primary-500 border-t-transparent animate-spin" /></div>
            ) : valueByLocation.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{ov.topLocationsEmpty}</p>
            ) : valueByLocation.map(({ location, value }) => (
              <div key={location.id} className="cursor-pointer" onClick={() => router.push(`/business/inventory/locations/${location.id}/transactions`)}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700 truncate">{location.name || location.code}</span>
                  <span className="text-gray-500 tabular-nums">{fmtNumber(value)}</span>
                </div>
                <div className="h-1.5 bg-primary-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600" style={{ width: `${(value / maxLocationValue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
