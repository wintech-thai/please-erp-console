'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { apiKeyApi } from '@/lib/api/api-key.api'
import type { ApiKeyItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Search, ChevronLeft, ChevronRight, Trash2, Ban, CheckCircle, MoreHorizontal, Key } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

function ApiKeysContent() {
  const { t } = useLang()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const SS_KEY = 'admin_api_keys_highlight'
  const [selectedRowId, setSelectedRowId] = useState<string | null>(highlightIdParam)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; keyId?: string; keyName?: string; bulk?: boolean }>({ open: false })
  const [deleting, setDeleting] = useState(false)

  const selectRow = (id: string) => {
    setSelectedRowId(id)
    sessionStorage.setItem(SS_KEY, id)
  }

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

  const autoSelectFirstRef = useRef(false)

  const fetchKeys = async (currentPage: number, keyword: string = '') => {
    setLoading(true)
    try {
      const [keysRes, countRes] = await Promise.all([
        apiKeyApi.getApiKeys({ search: keyword || undefined, page: currentPage, limit: itemsPerPage }),
        apiKeyApi.getApiKeyCount({ search: keyword || undefined }),
      ])
      const raw = keysRes.data
      const data: ApiKeyItem[] = Array.isArray(raw) ? raw : (raw?.apiKeys ?? [])
      setKeys(data)
      const rawCount = countRes.data
      setTotal(typeof rawCount === 'number' ? rawCount : (rawCount?.count ?? 0))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.apiKeys.failedToLoad)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys(page, appliedSearch)
  }, [page, itemsPerPage])

  useEffect(() => {
    if (!autoSelectFirstRef.current) return
    autoSelectFirstRef.current = false
    if (keys.length > 0) selectRow(keys[0].keyId)
    else { setSelectedRowId(null); sessionStorage.removeItem(SS_KEY) }
  }, [keys])

  const handleSearchTrigger = () => {
    autoSelectFirstRef.current = true
    setAppliedSearch(searchTerm)
    setPage(1)
    fetchKeys(1, searchTerm)
  }

  const handleToggleActive = async (key: ApiKeyItem) => {
    const active = isKeyActive(key.keyStatus)
    const name = key.keyName || key.keyId.slice(0, 8)
    try {
      if (active) {
        await apiKeyApi.disableApiKeyById(key.keyId)
        toast.success(`"${name}" ${t.apiKeys.disabledSuccess}`)
      } else {
        await apiKeyApi.enableApiKeyById(key.keyId)
        toast.success(`"${name}" ${t.apiKeys.enabledSuccess}`)
      }
      fetchKeys(page, appliedSearch)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.apiKeys.failedToUpdateStatus
      toast.error(msg)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      if (deleteModal.bulk) {
        for (const id of selectedIds) await apiKeyApi.deleteApiKeyById(id)
        toast.success(t.apiKeys.deletedBulk.replace('{count}', String(selectedIds.length)))
        setSelectedIds([])
      } else {
        await apiKeyApi.deleteApiKeyById(deleteModal.keyId!)
        toast.success(t.apiKeys.deletedSingle)
      }
      setDeleteModal({ open: false })
      fetchKeys(page, appliedSearch)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.apiKeys.failedToDelete
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  const q = appliedSearch.toLowerCase()
  const filteredKeys = q
    ? keys.filter(k =>
        (k.keyName || '').toLowerCase().includes(q) ||
        (k.keyDescription || '').toLowerCase().includes(q) ||
        (k.customRoleName || '').toLowerCase().includes(q)
      )
    : keys
  const displayTotal = appliedSearch ? filteredKeys.length : total

  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredKeys.map(k => k.keyId))
    else setSelectedIds([])
  }

  const toggleOne = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const startRow = displayTotal === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, displayTotal)
  const totalPages = Math.ceil(displayTotal / itemsPerPage)
  const createUrl = selectedRowId
    ? `/administrator/api-keys/create?prevHighlight=${selectedRowId}`
    : '/administrator/api-keys/create'

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.apiKeys.title}</h1>
          <p className="text-base text-gray-500 mt-1">{t.apiKeys.subtitle}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 sm:min-w-[140px]">
              <option>{t.apiKeys.filterAll}</option>
              <option>{t.apiKeys.filterName}</option>
              <option>{t.apiKeys.filterDescription}</option>
            </select>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchTrigger()}
              placeholder={t.apiKeys.searchPlaceholder}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 sm:min-w-[220px]"
            />
            <button
              onClick={handleSearchTrigger}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Link href={createUrl}>
              <button className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors uppercase">
                {t.apiKeys.addKey}
              </button>
            </Link>
            <button
              onClick={() => setDeleteModal({ open: true, bulk: true })}
              disabled={selectedIds.length === 0}
              className="px-5 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors uppercase disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.admin.delete}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1 min-h-0">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="w-12 px-6 py-3.5">
                  <input
                    type="checkbox"
                    checked={filteredKeys.length > 0 && selectedIds.length === filteredKeys.length}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                  />
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.apiKeys.colKeyName}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.apiKeys.colDescription}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.apiKeys.colCustomRole}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.apiKeys.colRoles}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.apiKeys.colStatus}</th>
                <th className="w-14 px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.apiKeys.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-20 text-center"><LoadingRow /></td></tr>
              ) : filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <EmptyRow
                      icon={<Key className="w-7 h-7 text-gray-400" />}
                      title={t.apiKeys.noKeysFound}
                      subtitle={t.apiKeys.noKeysSubtitle}
                    />
                  </td>
                </tr>
              ) : (
                filteredKeys.map(key => {
                  const active = isKeyActive(key.keyStatus)
                  const displayName = key.keyName || `Key ${key.keyId.slice(0, 8)}`
                  const roleList = parseCsv(key.rolesList)
                  const isSelected = selectedRowId === key.keyId
                  return (
                    <tr
                      key={key.keyId}
                      onClick={() => selectRow(key.keyId)}
                      className={clsx(
                        'border-l-[3px] transition-all cursor-pointer',
                        isSelected
                          ? '!bg-primary-100 border-l-primary-500'
                          : 'border-l-transparent hover:bg-gray-50/50'
                      )}
                    >
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(key.keyId)}
                          onChange={() => toggleOne(key.keyId)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                        />
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <Link
                          href={`/administrator/api-keys/${key.keyId}/update`}
                          onClick={e => e.stopPropagation()}
                          className={clsx('text-sm font-semibold hover:underline', isSelected ? 'text-primary-700' : 'text-gray-900 hover:text-primary-600')}
                        >
                          {displayName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[240px] truncate">
                        {key.keyDescription || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {key.customRoleName || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {roleList.length
                            ? roleList.map(r => (
                                <span key={r} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary-600 text-white">{r}</span>
                              ))
                            : <span className="text-sm text-gray-400">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx('text-sm font-medium',
                          active ? 'text-emerald-600' : 'text-gray-400'
                        )}>
                          {key.keyStatus || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <RowActions items={[
                          { label: t.apiKeys.disableKey, icon: <Ban className="w-4 h-4" />, disabled: !active, danger: true, onClick: () => handleToggleActive(key) },
                          { label: t.apiKeys.enableKey, icon: <CheckCircle className="w-4 h-4" />, disabled: active, onClick: () => handleToggleActive(key) },
                        ]} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
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
            <span className="text-xs text-gray-400">{displayTotal === 0 ? '0-0' : `${startRow}-${endRow}`} of {displayTotal}</span>
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
                disabled={page >= totalPages || displayTotal === 0 || loading}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false })}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-5 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {deleteModal.bulk ? t.apiKeys.deleteBulkTitle.replace('{count}', String(selectedIds.length)) : t.apiKeys.deleteKeyTitle}
              </h3>
              <p className="text-sm text-gray-500">
                {deleteModal.bulk
                  ? t.apiKeys.deleteBulkDesc.replace('{count}', String(selectedIds.length))
                  : <>{t.apiKeys.deleteSingleDesc} <span className="font-semibold text-gray-700">&ldquo;{deleteModal.keyName}&rdquo;</span>?</>}
                {' '}{t.apiKeys.deleteServiceWarning}
              </p>
            </div>
            <div className="flex gap-2 px-6 pb-5">
              <button onClick={() => setDeleteModal({ open: false })} className={clsx(cancelBtnCls, 'flex-1')}>{t.admin.cancel}</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors">
                {deleting ? t.admin.deleting : t.admin.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function parseCsv(value: string | null | undefined): string[] {
  if (!value) return []
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

function isKeyActive(keyStatus: string | null | undefined): boolean {
  if (!keyStatus) return true
  return keyStatus.toLowerCase() === 'active'
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
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v) }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
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

function LoadingRow() {
  const { t } = useLang()
  return (
    <div className="flex items-center justify-center gap-2 text-gray-400">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm">{t.admin.loading}</span>
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

const cancelBtnCls = 'px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'

export default function ApiKeysPage() {
  return (
    <Suspense>
      <ApiKeysContent />
    </Suspense>
  )
}
