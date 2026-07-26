'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { tenantApi } from '@/lib/api/tenant.api'
import type { MerchantItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Search, ChevronLeft, ChevronRight, Building2, MoreHorizontal, Users, Ban, CheckCircle } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

function TenantListContent() {
  const { t } = useLang()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [tenants, setTenants] = useState<MerchantItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(highlightIdParam)

  const SS_KEY = 'erp_tenant_highlight'
  const autoSelectFirstRef = useRef(false)

  useEffect(() => {
    if (!highlightIdParam) {
      const saved = sessionStorage.getItem(SS_KEY)
      if (saved) setSelectedRowId(saved)
    }
  }, [])

  useEffect(() => {
    if (highlightIdParam) {
      setSelectedRowId(highlightIdParam)
      sessionStorage.setItem(SS_KEY, highlightIdParam)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('highlight')
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    }
  }, [highlightIdParam, pathname, searchParams])

  const selectRow = (id: string) => {
    setSelectedRowId(id)
    sessionStorage.setItem(SS_KEY, id)
  }

  const fetchTenants = async (currentPage: number, keyword: string = '') => {
    setLoading(true)
    try {
      const [listRes, countRes] = await Promise.all([
        tenantApi.getTenants({ FullTextSearch: keyword || undefined, page: currentPage, limit: itemsPerPage }),
        tenantApi.getTenantCount({ FullTextSearch: keyword || undefined }),
      ])
      const raw = listRes.data
      setTenants(Array.isArray(raw) ? raw : (raw?.merchants ?? []))
      const rawCount = countRes.data
      setTotal(typeof rawCount === 'number' ? rawCount : (rawCount?.count ?? 0))
    } catch {
      toast.error(t.tenant.failedToLoad)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenants(page, appliedSearch)
  }, [page, itemsPerPage])

  useEffect(() => {
    if (!autoSelectFirstRef.current) return
    autoSelectFirstRef.current = false
    if (tenants.length > 0) selectRow(tenants[0].id)
    else { setSelectedRowId(null); sessionStorage.removeItem(SS_KEY) }
  }, [tenants])

  const handleSearch = () => {
    autoSelectFirstRef.current = true
    setAppliedSearch(searchTerm)
    setPage(1)
    fetchTenants(1, searchTerm)
  }

  const handleDisable = async (tenant: MerchantItem) => {
    try {
      await tenantApi.disableTenantById(tenant.id)
      toast.success(t.tenant.disabledSuccess)
      fetchTenants(page, appliedSearch)
    } catch {
      toast.error(t.tenant.failedToDisable)
    }
  }

  const handleEnable = async (tenant: MerchantItem) => {
    try {
      await tenantApi.enableTenantById(tenant.id)
      toast.success(t.tenant.enabledSuccess)
      fetchTenants(page, appliedSearch)
    } catch {
      toast.error(t.tenant.failedToEnable)
    }
  }

  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const totalPages = Math.ceil(total / itemsPerPage)

  const createUrl = selectedRowId
    ? `/business-setup/tenant/create?prevHighlight=${selectedRowId}`
    : '/business-setup/tenant/create'

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.tenant.title}</h1>
          <p className="text-base text-gray-500 mt-1">{t.tenant.subtitle}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={t.tenant.searchPlaceholder}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 sm:min-w-[220px]"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Link href={createUrl}>
              <button className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors uppercase">
                {t.tenant.addTenant}
              </button>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1 min-h-0">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.tenant.colCode}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.tenant.colName}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.tenant.colEmail}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.tenant.colPhone}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.tenant.colTags}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.tenant.colStatus}</th>
                <th className="w-14 px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.tenant.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-20 text-center"><LoadingRow label={t.admin.loading} /></td></tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <EmptyRow
                      icon={<Building2 className="w-7 h-7 text-gray-400" />}
                      title={t.tenant.noTenantsFound}
                      subtitle={t.tenant.noTenantsSubtitle}
                    />
                  </td>
                </tr>
              ) : (
                tenants.map(tenant => {
                  const isSelected = selectedRowId === tenant.id
                  const isActive = tenant.status?.toLowerCase() === 'active'
                  const tagList = parseCsv(tenant.tags)
                  return (
                    <tr
                      key={tenant.id}
                      onClick={() => selectRow(tenant.id)}
                      className={clsx(
                        'border-l-[3px] transition-all cursor-pointer',
                        isSelected
                          ? '!bg-primary-100 border-l-primary-500'
                          : 'border-l-transparent hover:bg-gray-50/50'
                      )}
                    >
                      <td className="px-6 py-4 text-sm text-gray-700">{tenant.code || '—'}</td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/business-setup/tenant/${tenant.id}/update`}
                          onClick={e => e.stopPropagation()}
                          className={clsx('text-sm font-semibold hover:underline', isSelected ? 'text-primary-700' : 'text-gray-900 hover:text-primary-600')}
                        >
                          {tenant.name || '—'}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{tenant.contactEmail || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{tenant.contactPhone || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {tagList.length
                            ? tagList.map(tag => <TagBadge key={tag}>{tag}</TagBadge>)
                            : <span className="text-sm text-gray-400">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={tenant.status || ''} />
                      </td>
                      <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <RowActions items={[
                          {
                            label: t.tenant.viewUsers,
                            icon: <Users className="w-4 h-4" />,
                            onClick: () => router.push(`/business-setup/tenant/${tenant.id}/users`),
                          },
                          {
                            label: t.tenant.disableTenant,
                            icon: <Ban className="w-4 h-4" />,
                            danger: true,
                            disabled: !isActive,
                            onClick: () => handleDisable(tenant),
                          },
                          {
                            label: t.tenant.enableTenant,
                            icon: <CheckCircle className="w-4 h-4" />,
                            disabled: isActive,
                            onClick: () => handleEnable(tenant),
                          },
                        ]} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-gray-100 gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{t.admin.rowsPerPage}</span>
            <select
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
              className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
            >
              {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} of {total}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || total === 0 || loading}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function parseCsv(value: string | null | undefined): string[] {
  if (!value) return []
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

function TagBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-primary-50 text-primary-700 rounded-md">{children}</span>
}

function StatusBadge({ status }: { status: string }) {
  const key = status?.toLowerCase()
  const map: Record<string, { label: string; className: string; dot: string }> = {
    active:   { label: 'Active',   className: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
    disabled: { label: 'Disabled', className: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
    pending:  { label: 'Pending',  className: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  }
  const cfg = map[key] ?? { label: status || '—', className: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full', cfg.className)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

type ActionItem = { label: string; icon: React.ReactNode; danger?: boolean; disabled?: boolean; onClick: () => void }

function RowActions({ items }: { items: ActionItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex justify-center">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { if (!item.disabled) { item.onClick(); setOpen(false) } }}
              className={clsx(
                'w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors',
                item.disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : item.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-gray-400">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  )
}

function EmptyRow({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <>
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">{icon}</div>
      <p className="text-base font-medium text-gray-500">{title}</p>
      <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
    </>
  )
}

export default function TenantListPage() {
  return (
    <Suspense>
      <TenantListContent />
    </Suspense>
  )
}
