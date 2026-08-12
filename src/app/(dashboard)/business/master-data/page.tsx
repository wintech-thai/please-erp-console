'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Search, Plus, Trash2, Database, ChevronLeft, ChevronRight as ChevronRightIcon, MoreHorizontal } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { masterRefApi, type MasterRefItem } from '@/lib/api/master-ref.api'

const REF_TYPE_GROUPS = [
  {
    groupKey: 'inventory' as const,
    items: [
      { refType: 'LocationType', labelKey: 'locationType' as const },
      { refType: 'ItemType',     labelKey: 'itemType'     as const },
      { refType: 'ItemUnit',     labelKey: 'itemUnit'     as const },
    ],
  },
]

// ─── Delete modal ─────────────────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel, deleting }: {
  name?: string; onConfirm: () => void; onCancel: () => void; deleting: boolean
}) {
  const { t } = useLang()
  const md = t.masterData
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
        <h3 className="text-lg font-bold text-white mb-1">{md.deleteTitle}</h3>
        {name && <p className="text-sm font-semibold text-white/90 mb-2">&ldquo;{name}&rdquo;</p>}
        <p className="text-sm text-white/60 mb-7">{md.deleteDesc} {md.deleteCannotUndo}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase">
            {md.cancel}
          </button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600/80 rounded-xl hover:bg-red-600 disabled:opacity-60 transition-colors uppercase">
            {deleting ? md.deleting : md.deleteBtn}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main content ─────────────────────────────────────────────────────────────

function MasterDataContent() {
  const { t } = useLang()
  const md = t.masterData
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type') ?? 'LocationType'
  const highlightIdParam = searchParams.get('highlight')

  const getRefTypeInfo = () => {
    for (const group of REF_TYPE_GROUPS) {
      const found = group.items.find(i => i.refType === typeParam)
      if (found) return { refType: found.refType, label: t.masterData[found.labelKey] }
    }
    return { refType: 'LocationType', label: t.masterData.locationType }
  }

  const selectedRefType = getRefTypeInfo()
  const ssKey = (rt: string) => `master_data_${rt}_highlight`

  const [refs, setRefs] = useState<MasterRefItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [checkedId, setCheckedId] = useState<string | null>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem(ssKey(typeParam)) ?? null
    return null
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id?: string; name?: string }>({ open: false })
  const [deleting, setDeleting] = useState(false)

  const fetchRefs = useCallback(async (refType: string, search = searchTerm, p = page, perPage = itemsPerPage) => {
    setLoading(true)
    try {
      const offset = (p - 1) * perPage + 1
      const [listRes, countRes] = await Promise.allSettled([
        masterRefApi.getRefs({ refType, fullTextSearch: search || undefined, offset, limit: perPage }),
        masterRefApi.getRefCount({ refType, fullTextSearch: search || undefined }),
      ])
      if (listRes.status === 'fulfilled') setRefs(Array.isArray(listRes.value.data) ? listRes.value.data : [])
      if (countRes.status === 'fulfilled') { const raw = countRes.value.data as unknown; setTotal(typeof raw === 'number' ? raw : 0) }
    } catch { toast.error(md.loadFailed) } finally { setLoading(false) }
  }, [md.loadFailed, searchTerm, page, itemsPerPage])

  // Reset state when refType changes via sidebar nav
  useEffect(() => {
    setRefs([]); setCheckedId(null); setPage(1); setSearchTerm('')
    setSelectedRowId(sessionStorage.getItem(ssKey(typeParam)) ?? null)
  }, [typeParam])

  useEffect(() => {
    fetchRefs(selectedRefType.refType)
  }, [typeParam, page, itemsPerPage])

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    sessionStorage.setItem(ssKey(typeParam), highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname)
    const timer = setTimeout(() => {
      document.getElementById(`master-data-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightIdParam])

  function selectRow(id: string) {
    const next = selectedRowId === id ? null : id
    setSelectedRowId(next)
    if (next) sessionStorage.setItem(ssKey(typeParam), next)
    else sessionStorage.removeItem(ssKey(typeParam))
  }

  function handleSearch() { setPage(1); fetchRefs(selectedRefType.refType, searchTerm, 1) }

  async function handleDelete() {
    if (!deleteModal.id) return
    setDeleting(true)
    try {
      await masterRefApi.deleteRefById(deleteModal.id)
      toast.success(md.deletedSuccess)
      setDeleteModal({ open: false }); setCheckedId(null)
      fetchRefs(selectedRefType.refType)
    } catch { toast.error(md.failedToDelete) } finally { setDeleting(false) }
  }

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{selectedRefType.label}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{selectedRefType.refType}</p>
        </div>
        <button
          onClick={() => router.push(`/business/master-data/${selectedRefType.refType}/add`)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {md.addRef}
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
            placeholder={md.searchPlaceholder}
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); fetchRefs(selectedRefType.refType, '', 1) }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <button onClick={handleSearch} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
          {t.admin.search}
        </button>
        <button
          onClick={() => { const item = refs.find(r => r.id === checkedId); setDeleteModal({ open: true, id: checkedId ?? undefined, name: item?.code }) }}
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
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{md.colCode}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{md.colDescription}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{md.colTags}</th>
                <th className="w-14 px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{md.colAction}</th>
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
              ) : refs.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center">
                  <Database className="w-7 h-7 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400">{md.noData}</p>
                </td></tr>
              ) : refs.map((ref, idx) => {
                const highlighted = selectedRowId === ref.id
                const isChecked = checkedId === ref.id
                return (
                  <tr
                    key={ref.id}
                    id={`master-data-row-${ref.id}`}
                    onClick={() => selectRow(ref.id)}
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
                        onChange={() => setCheckedId(prev => prev === ref.id ? null : ref.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/business/master-data/${selectedRefType.refType}/${ref.id}/update`)}
                        className="font-semibold text-primary-600 hover:text-primary-800 hover:underline underline-offset-2 transition-colors"
                      >
                        {ref.code}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs">
                      <span className="line-clamp-1">{ref.description || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {ref.tags
                          ? ref.tags.split(',').filter(Boolean).map(tag => (
                            <span key={tag} className="px-2.5 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-[10px] font-semibold">{tag.trim()}</span>
                          ))
                          : <span className="text-gray-400">—</span>}
                      </div>
                    </td>
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

export default function MasterDataPage() {
  return (
    <Suspense>
      <MasterDataContent />
    </Suspense>
  )
}
