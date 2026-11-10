'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Users, Receipt, Wallet, Clock, FileText, Banknote, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useTenant } from '@/context/TenantContext'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import { customerApi, type CustomerItem } from '@/lib/api/customer.api'
import { accountDocApi } from '@/lib/api/account-doc.api'
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

function fmtNumber(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function StatCard({ icon: Icon, label, value, gradient, onClick }: {
  icon: typeof Users; label: string; value: React.ReactNode; gradient: string; onClick?: () => void
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
  icon: typeof FileText; label: string; value: React.ReactNode; color: string; onClick?: () => void
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

// x014 ข้อ 7 : dashboard สรุปภาพรวมงานขาย — ไอเดียเดียวกับ InventoryOverviewSection
// (KPI การ์ดเป็น snapshot ปัจจุบัน, "กิจกรรม" ผูกกับ date range ที่เลือกได้)
export default function SalesOverviewSection() {
  const { t } = useLang()
  const ov = t.overview
  const router = useRouter()
  const { loading: tenantLoading, selectedOrg } = useTenant()

  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [loading, setLoading] = useState(true)
  const [customerCount, setCustomerCount] = useState(0)
  const [customers, setCustomers] = useState<CustomerItem[]>([])
  const [arWallets, setArWallets] = useState<InventoryWallet[]>([])
  const [totalSales, setTotalSales] = useState(0)
  const [activity, setActivity] = useState({ creditSale: 0, cashSale: 0, pending: 0 })
  const [activityLoading, setActivityLoading] = useState(true)
  const [highlightedCustomerId, setHighlightedCustomerId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('sales_overview_topcustomer_highlight')
    return null
  })

  function selectCustomerRow(id: string) {
    setHighlightedCustomerId(prev => {
      const next = prev === id ? null : id
      if (next) sessionStorage.setItem('sales_overview_topcustomer_highlight', next)
      else sessionStorage.removeItem('sales_overview_topcustomer_highlight')
      return next
    })
  }

  useEffect(() => {
    if (tenantLoading || !selectedOrg) return
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      customerApi.getCustomers({ limit: 100 }),
      customerApi.getCustomerCount(),
      pointApi.getWalletBalancesGroupByRefId('AccountReceivable'),
    ]).then(([custRes, custCountRes, arRes]) => {
      if (cancelled) return
      setCustomers(custRes.status === 'fulfilled' && Array.isArray(custRes.value.data) ? custRes.value.data : [])
      if (custCountRes.status === 'fulfilled') setCustomerCount(Number(custCountRes.value.data) || 0)
      setArWallets(arRes.status === 'fulfilled' && Array.isArray(arRes.value.data) ? arRes.value.data : [])
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
      accountDocApi.getCreditSaleCount({ fromDate, toDate }),
      accountDocApi.getCashSaleCount({ fromDate, toDate }),
      accountDocApi.getCreditSaleCount({ documentStatus: 'Pending' }),
      accountDocApi.getCashSaleCount({ documentStatus: 'Pending' }),
      accountDocApi.getCreditSales({ documentStatus: 'Approved', fromDate, toDate, limit: 200 }),
      accountDocApi.getCashSales({ documentStatus: 'Approved', fromDate, toDate, limit: 200 }),
    ]).then(([credCnt, cashCnt, credPending, cashPending, credDocs, cashDocs]) => {
      if (cancelled) return
      setActivity({
        creditSale: credCnt.status === 'fulfilled' ? Number(credCnt.value.data) || 0 : 0,
        cashSale: cashCnt.status === 'fulfilled' ? Number(cashCnt.value.data) || 0 : 0,
        pending: (credPending.status === 'fulfilled' ? Number(credPending.value.data) || 0 : 0)
          + (cashPending.status === 'fulfilled' ? Number(cashPending.value.data) || 0 : 0),
      })
      const credList = credDocs.status === 'fulfilled' && Array.isArray(credDocs.value.data) ? credDocs.value.data : []
      const cashList = cashDocs.status === 'fulfilled' && Array.isArray(cashDocs.value.data) ? cashDocs.value.data : []
      setTotalSales([...credList, ...cashList].reduce((s, d) => s + (d.grandTotal || 0), 0))
      setActivityLoading(false)
    }).catch(() => { if (!cancelled) setActivityLoading(false) })
    return () => { cancelled = true }
  }, [timeRange, tenantLoading, selectedOrg])

  const totalArBalance = arWallets.reduce((s, w) => s + (w.pointBalanceDecimal || 0), 0)

  const topCustomers = arWallets
    .filter(w => (w.pointBalanceDecimal || 0) > 0)
    .map(w => ({ customer: customers.find(c => c.id === w.refId), balance: w.pointBalanceDecimal || 0, refId: w.refId }))
    .filter(x => x.customer)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)
  const maxCustomerBalance = Math.max(1, ...topCustomers.map(x => x.balance))

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">{ov.saleSectionTitle}</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label={ov.kpiCustomers} value={loading ? <MiniSpinner className="w-4 h-4" /> : customerCount} gradient="from-primary-500 to-primary-700" onClick={() => router.push('/business/sale-management/customer-data')} />
        <StatCard icon={Banknote} label={ov.kpiTotalSales} value={activityLoading ? <MiniSpinner className="w-4 h-4" /> : fmtNumber(totalSales)} gradient="from-emerald-400 to-emerald-600" />
        <StatCard icon={Wallet} label={ov.kpiArBalance} value={loading ? <MiniSpinner className="w-4 h-4" /> : fmtNumber(totalArBalance)} gradient="from-amber-400 to-amber-600" onClick={() => router.push('/business/sale-management/customer-data')} />
        <StatCard icon={Clock} label={ov.kpiPendingDocs} value={activityLoading ? <MiniSpinner className="w-4 h-4" /> : activity.pending} gradient="from-rose-400 to-rose-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-gray-900">{ov.activityTitle}</h3>
          <AdvancedTimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ActivityTile icon={FileText} label={ov.activityCreditSale} value={activityLoading ? <MiniSpinner className="w-3.5 h-3.5" /> : activity.creditSale} color="text-primary-600 bg-primary-50" onClick={() => router.push('/business/sale-management/credit-sale')} />
          <ActivityTile icon={Receipt} label={ov.activityCashSale} value={activityLoading ? <MiniSpinner className="w-3.5 h-3.5" /> : activity.cashSale} color="text-emerald-600 bg-emerald-50" onClick={() => router.push('/business/sale-management/cash-sale')} />
          <ActivityTile icon={Clock} label={ov.activityPendingApproval} value={activityLoading ? <MiniSpinner className="w-3.5 h-3.5" /> : activity.pending} color="text-amber-600 bg-amber-50" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-gray-900">{ov.topCustomersTitle}</h3>
        </div>
        <div className="px-6 py-4 space-y-3">
          {loading ? (
            <div className="py-6 text-center"><div className="w-6 h-6 mx-auto rounded-full border-2 border-primary-500 border-t-transparent animate-spin" /></div>
          ) : topCustomers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">{ov.topCustomersEmpty}</p>
          ) : topCustomers.map(({ customer, balance, refId }) => {
            if (!customer || !refId) return null
            const highlighted = highlightedCustomerId === customer.id
            return (
              <div
                key={customer.id}
                className={clsx(
                  'flex items-center gap-2 -mx-2 pl-[9px] pr-2 py-1 border-l-[3px] rounded-lg cursor-pointer transition-colors',
                  highlighted ? '!bg-primary-100 border-l-primary-500' : 'border-l-transparent hover:bg-gray-50'
                )}
                onClick={() => selectCustomerRow(customer.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700 truncate">{customer.name || customer.code}</span>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); router.push(`/business/sale-management/customer-data/${customer.id}/balance-transactions`) }}
                      className="text-gray-500 tabular-nums hover:text-primary-600 hover:underline"
                    >
                      {fmtNumber(balance)}
                    </button>
                  </div>
                  <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${(balance / maxCustomerBalance) * 100}%` }} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); router.push(`/business/sale-management/customer-data/${customer.id}/balance-transactions`) }}
                  className="flex-none"
                >
                  <ChevronRight className="w-4 h-4 text-gray-300 hover:text-primary-500 transition-colors" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
