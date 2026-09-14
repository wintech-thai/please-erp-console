'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Search, Plus, Trash2, Database, ChevronLeft, ChevronRight as ChevronRightIcon, MoreHorizontal } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { inventoryLocationApi, type InventoryLocationItem } from '@/lib/api/inventory-location.api'
import { useMasterRefOptions } from '@/hooks/useMasterRefOptions'

const SS_KEY = 'inventory_location_highlight'

function DeleteModal({ name, onConfirm, onCancel, deleting }: {
  name?: string; onConfirm: () => void; onCancel: () => void; deleting: boolean
}) {
  const { t } = useLang()
  const il = t.inventoryLocation
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
          <Trash2 className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{il.deleteTitle}</h3>
        {name && <p className="text-sm font-semibold text-white/90 mb-2">&ldquo;{name}&rdquo;</p>}
        <p className="text-sm text-white/60 mb-7">{il.deleteDesc} {il.deleteCannotUndo}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase">
            {il.cancel}
          </button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600/80 rounded-xl hover:bg-red-600 disabled:opacity-60 transition-colors uppercase">
            {deleting ? il.deleting : il.deleteBtn}
          </button>
        </div>
      </div>
    </div>
  )
}

function InventoryLocationContent() {
  const { t } = useLang()
  const il = t.inventoryLocation
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')
  const { options: locationTypes } = useMasterRefOptions('LocationType')

  const [locations, setLocations] = useState<InventoryLocationItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [checkedId, setCheckedId] = useState<string | null>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem(SS_KEY) ?? null
    return null
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id?: string; name?: string }>({ open: false })
  const [deleting, setDeleting] = useState(false)

  const fetchLocations = useCallback(async (search = searchTerm, type = typeFilter, p = page, perPage = itemsPerPage) => {
    setLoading(true)
    try {
      const offset = (p - 1) * perPage + 1
      const [listRes, countRes] = await Promise.allSettled([
        inventoryLocationApi.getLocations({ fullTextSearch: search || undefined, locationType: type || undefined, offset, limit: perPage }),
        inventoryLocationApi.getLocationCount({ fullTextSearch: search || undefined, locationType: type || undefined }),
      ])
      if (listRes.status === 'fulfilled') setLocations(Array.isArray(listRes.value.data) ? listRes.value.data : [])
      if (countRes.status === 'fulfilled') { const raw = countRes.value.data as unknown; setTotal(typeof raw === 'number' ? raw : 0) }
    } catch { toast.error(il.loadFailed) } finally { setLoading(false) }
  }, [il.loadFailed, searchTerm, typeFilter, page, itemsPerPage])

  useEffect(() => {
    fetchLocations()
  }, [page, itemsPerPage])

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    sessionStorage.setItem(SS_KEY, highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname)
    const timer = setTimeout(() => {
      document.getElementById(`inventory-location-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightIdParam])

  function selectRow(id: string) {
    const next = selectedRowId === id ? null : id
    setSelectedRowId(next)
    if (next) sessionStorage.setItem(SS_KEY, next)
    else sessionStorage.removeItem(SS_KEY)
  }

  function handleSearch() { setPage(1); fetchLocations(searchTerm, typeFilter, 1) }

  function handleTypeFilterChange(value: string) {
    setTypeFilter(value)
    setPage(1)
    fetchLocations(searchTerm, value, 1)
  }

  async function handleDelete() {
    if (!deleteModal.id) return
    setDeleting(true)
    try {
      await inventoryLocationApi.deleteLocationById(deleteModal.id)
      toast.success(il.deletedSuccess)
      setDeleteModal({ open: false }); setCheckedId(null)
      fetchLocations()
    } catch { toast.error(il.failedToDelete) } finally { setDeleting(false) }
  }

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{il.title}</h1>
        <button
          onClick={() => router.push('/business/inventory/locations/add')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {il.addBtn}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex-none flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-56 max-w-xs bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={il.searchPlaceholder}
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setPage(1); fetchLocations('', typeFilter, 1) }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <select
          value={typeFilter}
          onChange={e => handleTypeFilterChange(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{il.allTypes}</option>
          {locationTypes.map(o => <option key={o.code} value={o.code}>{o.description || o.code}</option>)}
        </select>
        <button onClick={handleSearch} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
          {t.admin.search}
        </button>
        <button
          onClick={() => { const item = locations.find(r => r.id === checkedId); setDeleteModal({ open: true, id: checkedId ?? undefined, name: item?.code }) }}
          disabled={!checkedId}
          className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {t.admin.delete}
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="w-12 px-6 py-3.5" />
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{il.colCode}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{il.colName}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{il.colType}</th>
                <th className="w-14 px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{il.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                    <span className="text-sm text-gray-400">{t.admin.loading}</span>
                  </div>
                </td></tr>
              ) : locations.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center">
                  <Database className="w-7 h-7 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400">{il.noData}</p>
                </td></tr>
              ) : locations.map((loc, idx) => {
                const highlighted = selectedRowId === loc.id
                const isChecked = checkedId === loc.id
                const typeLabel = locationTypes.find(o => o.code === loc.locationType)?.description || loc.locationType
                return (
                  <tr
                    key={loc.id}
                    id={`inventory-location-row-${loc.id}`}
                    onClick={() => selectRow(loc.id)}
                    className={clsx(
                      'border-l-[3px] border-b border-gray-100 cursor-pointer transition-colors',
                      highlighted
                        ? '!bg-primary-100 border-l-primary-500'
                        : clsx('border-l-transparent', idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50')
                    )}
                  >
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => setCheckedId(prev => prev === loc.id ? null : loc.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/business/inventory/locations/${loc.id}/update`)}
                        className="font-semibold text-primary-600 hover:text-primary-800 hover:underline underline-offset-2 transition-colors"
                      >
                        {loc.code}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs">
                      <span className="line-clamp-1">{loc.name || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{typeLabel || '—'}</td>
                    <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                      <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
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

      {deleteModal.open && (
        <DeleteModal name={deleteModal.name} onConfirm={handleDelete} onCancel={() => setDeleteModal({ open: false })} deleting={deleting} />
      )}
    </div>
  )
}

export default function InventoryLocationPage() {
  return (
    <Suspense>
      <InventoryLocationContent />
    </Suspense>
  )
}
