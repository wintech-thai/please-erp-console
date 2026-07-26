'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { tenantApi } from '@/lib/api/tenant.api'
import type { MerchantItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Search, Plus, MoreHorizontal, Ban, CheckCircle, Users, Building2, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

function StatusBadge({ status }: { status?: string | null }) {
  const lower = status?.toLowerCase()
  const cfg =
    lower === 'active'
      ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
      : lower === 'pending'
        ? { bg: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400' }
        : { bg: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', cfg.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {status ?? 'Unknown'}
    </span>
  )
}

function ConfirmDialog({ title, desc, confirmLabel, onConfirm, onCancel }: {
  title: string; desc: string; confirmLabel: string
  onConfirm: () => void; onCancel: () => void
}) {
  const { t } = useLang()
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}>
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-white/60 mb-7">{desc}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase"
          >
            {t.admin.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors uppercase"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem('erp_tenant_highlight') ?? null
    return null
  })
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'enable' | 'disable'; tenant: MerchantItem } | null>(null)
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (highlightIdParam) {
      setSelectedRowId(highlightIdParam)
      sessionStorage.setItem('erp_tenant_highlight', highlightIdParam)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('highlight')
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    }
  }, [highlightIdParam, pathname, searchParams])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (openMenuId) {
        const ref = menuRefs.current[openMenuId]
        if (ref && !ref.contains(e.target as Node)) setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openMenuId])

  const fetchTenants = async (currentPage: number, status = '', search = '') => {
    setLoading(true)
    try {
      const payload = {
        page: currentPage,
        limit: itemsPerPage,
        Status: status || undefined,
        FullTextSearch: search.trim() || undefined,
      }
      const [listRes, countRes] = await Promise.all([
        tenantApi.getTenants(payload),
        tenantApi.getTenantCount(payload),
      ])
      const raw = listRes.data
      setTenants(Array.isArray(raw) ? raw : ((raw as any)?.merchants ?? []))
      const rawCount = countRes.data
      setTotal(typeof rawCount === 'number' ? rawCount : ((rawCount as any)?.count ?? 0))
    } catch {
      toast.error(t.tenant.failedToLoad)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTenants(page, statusFilter, appliedSearch) }, [page, itemsPerPage, statusFilter, appliedSearch])

  const handleSearch = () => {
    setAppliedSearch(searchTerm)
    setPage(1)
  }

  const handleEnable = async (tenant: MerchantItem) => {
    try {
      await tenantApi.enableTenantById(tenant.id)
      toast.success(t.tenant.enabledSuccess)
      fetchTenants(page, statusFilter, appliedSearch)
    } catch {
      toast.error(t.tenant.failedToEnable)
    }
  }

  const handleDisable = async (tenant: MerchantItem) => {
    try {
      await tenantApi.disableTenantById(tenant.id)
      toast.success(t.tenant.disabledSuccess)
      fetchTenants(page, statusFilter, appliedSearch)
    } catch {
      toast.error(t.tenant.failedToDisable)
    }
  }

  const isActive = (tenant: MerchantItem) => tenant.status?.toLowerCase() === 'active'

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)

  const cols = [
    t.tenant.colCode, t.tenant.colName, t.tenant.colEmail,
    t.tenant.colPhone, t.tenant.colTags, t.tenant.colStatus, t.tenant.colAction,
  ]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.type === 'enable' ? t.tenant.enableConfirmTitle : t.tenant.disableConfirmTitle}
          desc={confirmDialog.type === 'enable' ? t.tenant.enableConfirmDesc : t.tenant.disableConfirmDesc}
          confirmLabel={t.admin.yes}
          onConfirm={() => {
            const ten = confirmDialog.tenant
            confirmDialog.type === 'enable' ? handleEnable(ten) : handleDisable(ten)
            setConfirmDialog(null)
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.tenant.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t.tenant.subtitle}</p>
        </div>
        <Link
          href="/business-setup/tenant/create"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t.tenant.addTenant}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex-none flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-56 max-w-xs bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={t.tenant.searchPlaceholder}
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setAppliedSearch('') }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{t.tenant.filterAll}</option>
          <option value="Active">{t.tenant.filterActive}</option>
          <option value="Pending">{t.tenant.filterPending}</option>
          <option value="Disabled">{t.tenant.filterDisabled}</option>
        </select>

        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          {t.admin.search}
        </button>
      </div>

      {/* Table card */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        {!loading && (
          <div className="flex-none px-4 pt-3 pb-1">
            <span className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{total}</span> {t.tenant.foundCount}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th
                    key={col}
                    className={clsx(
                      'px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap text-left',
                      i === 0 && 'rounded-tl-xl',
                      i === cols.length - 1 && 'rounded-tr-xl text-center'
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm text-gray-400">{t.admin.loading}</span>
                    </div>
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-16 text-center">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Building2 className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">{t.tenant.noTenantsFound}</p>
                    <p className="text-xs text-gray-400 mt-1">{t.tenant.noTenantsSubtitle}</p>
                  </td>
                </tr>
              ) : (
                tenants.map((tenant, idx) => {
                  const highlighted = selectedRowId === tenant.id
                  const tagList = parseCsv(tenant.tags)
                  return (
                    <tr
                      key={tenant.id}
                      onClick={() => {
                        const next = selectedRowId === tenant.id ? null : tenant.id
                        setSelectedRowId(next)
                        if (next) sessionStorage.setItem('erp_tenant_highlight', next)
                        else sessionStorage.removeItem('erp_tenant_highlight')
                      }}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        highlighted
                          ? 'bg-primary-100'
                          : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                      )}
                    >
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <Link
                          href={`/business-setup/tenant/${tenant.id}/update`}
                          onClick={e => e.stopPropagation()}
                          className={clsx('font-semibold text-sm hover:underline', highlighted ? 'text-primary-700' : 'text-gray-800 hover:text-primary-600')}
                        >
                          {tenant.code ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{tenant.name ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap">
                        {tenant.contactEmail ?? '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap">
                        {tenant.contactPhone ?? '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        <div className="flex flex-wrap gap-1">
                          {tagList.length
                            ? tagList.map(tag => <TagBadge key={tag}>{tag}</TagBadge>)
                            : <span className="text-sm text-gray-400">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <StatusBadge status={tenant.status} />
                      </td>

                      {/* 3-dot menu */}
                      <td className="px-4 py-3 border-b border-gray-100 text-center" onClick={e => e.stopPropagation()}>
                        <div className="relative flex justify-center" ref={el => { menuRefs.current[tenant.id] = el }}>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              const spaceBelow = window.innerHeight - rect.bottom
                              const right = window.innerWidth - rect.right
                              if (spaceBelow < 200) {
                                setMenuPos({ bottom: window.innerHeight - rect.top + 4, right })
                              } else {
                                setMenuPos({ top: rect.bottom + 4, right })
                              }
                              setOpenMenuId(prev => prev === tenant.id ? null : tenant.id)
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openMenuId === tenant.id && menuPos && (
                            <div
                              className="fixed w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-[9999]"
                              style={{ top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right }}
                            >
                              {isActive(tenant) ? (
                                <button
                                  onClick={e => { e.stopPropagation(); setOpenMenuId(null); setConfirmDialog({ type: 'disable', tenant }) }}
                                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Ban className="w-4 h-4 flex-shrink-0" />
                                  {t.tenant.disableTenant}
                                </button>
                              ) : (
                                <button
                                  onClick={e => { e.stopPropagation(); setOpenMenuId(null); setConfirmDialog({ type: 'enable', tenant }) }}
                                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                  {t.tenant.enableTenant}
                                </button>
                              )}

                              <div className="border-t border-gray-200 my-1" />

                              <button
                                onClick={e => { e.stopPropagation(); setOpenMenuId(null); sessionStorage.setItem('erp_tenant_highlight', tenant.id); router.push(`/business-setup/tenant/${tenant.id}/users`) }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Users className="w-4 h-4 flex-shrink-0" />
                                {t.tenant.viewUsers}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-gray-100 gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{t.admin.rowsPerPage}</span>
            <select
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
              className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
            >
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
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

export default function TenantListPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="w-6 h-6 animate-spin mr-2 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <TenantListContent />
    </Suspense>
  )
}
