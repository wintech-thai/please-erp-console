'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { MoreHorizontal, Plus, Trash2, FileText, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { documentNumberApi, type DocumentNumberConfig } from '@/lib/api/document-number.api'

// ─── Delete modal ─────────────────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel, deleting }: {
  name?: string; onConfirm: () => void; onCancel: () => void; deleting: boolean
}) {
  const { t } = useLang()
  const dn = t.documentNumber
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
        <h3 className="text-lg font-bold text-white mb-1">{dn.deleteTitle}</h3>
        {name && <p className="text-sm font-semibold text-white/90 mb-2">&ldquo;{name}&rdquo;</p>}
        <p className="text-sm text-white/60 mb-7">{dn.deleteCannotUndo}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase">
            {dn.cancel}
          </button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600/80 rounded-xl hover:bg-red-600 disabled:opacity-60 transition-colors uppercase">
            {deleting ? dn.deleting : dn.deleteBtn}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Get doc number modal ─────────────────────────────────────────────────────

function GetDocNumberModal({ config, onClose, onSaved }: { config: DocumentNumberConfig | null; onClose: () => void; onSaved?: () => void }) {
  const { t } = useLang()
  const dn = t.documentNumber
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => { if (!config) { setResult(null); setLoading(false) } }, [config])

  async function handleConfirm() {
    if (!config) return
    setLoading(true)
    try {
      const res = await documentNumberApi.getDocumentNumber(config.documentType)
      setResult((res.data as { documentNumber?: string; DocumentNumber?: string }).documentNumber
        || (res.data as { documentNumber?: string; DocumentNumber?: string }).DocumentNumber
        || String(res.data))
      onSaved?.()
    } catch { toast.error(dn.getDocError); onClose() } finally { setLoading(false) }
  }

  if (!config) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        {result === null ? (
          <>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">{dn.getDocTitle}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{config.documentType}</p>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              {dn.getDocWarning} <span className="font-semibold text-red-600">{dn.getDocWarningBold}</span> {dn.getDocConfirmDesc}
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">{dn.cancel}</button>
              <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
                {loading ? dn.getDocConfirming : dn.getDocConfirm}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">{dn.getDocResultTitle}</h2>
                <p className="text-xs text-gray-500">{config.documentType}</p>
              </div>
            </div>
            <div className="bg-primary-50 rounded-xl px-5 py-4 text-center mb-5">
              <span className="text-2xl font-bold text-primary-700 font-mono tracking-wider">{result}</span>
            </div>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700">{dn.close}</button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Manage sequence modal ────────────────────────────────────────────────────

function ManageSequenceModal({ config, onClose, onSaved }: { config: DocumentNumberConfig | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useLang()
  const dn = t.documentNumber
  const [seqNo, setSeqNo] = useState(0)
  const [seqKey, setSeqKey] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config) { setSeqNo(config.currentSequenceNo ?? 0); setSeqKey(config.currentSequenceKey ?? '') }
  }, [config])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return
    setSaving(true)
    try {
      await documentNumberApi.updateSequence(config.id, { currentSequenceNo: seqNo, currentSequenceKey: seqKey })
      toast.success(dn.updateSeqSuccess); onSaved(); onClose()
    } catch { toast.error(dn.updateSeqError) } finally { setSaving(false) }
  }

  if (!config) return null
  const tags = config.tags ? config.tags.split(',').filter(Boolean) : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{dn.manageSeqTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 pt-4 pb-2">
          <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-3">{dn.configInfo}</p>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">{dn.colDocType}</span><span className="font-medium text-gray-800">{config.documentType}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{dn.colFormat}</span><span className="text-gray-800">{config.documentFormat}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{dn.digitReset}</span><span className="text-gray-800">{config.seqDigit} {dn.digit} / {config.resetType === 'Monthly' ? dn.monthly : dn.yearly}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{dn.colYearOffset}</span><span className="text-gray-800">{config.yearOffset ?? 0}</span></div>
            {tags.length > 0 && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-500 shrink-0">{dn.fieldTags}</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {tags.map(tag => <span key={tag} className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">{tag}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
        <form onSubmit={handleSave} className="px-6 pt-4 pb-5 space-y-4">
          <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">{dn.editSeq}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sequence No.</label>
              <input type="number" min={0} value={seqNo} onChange={e => setSeqNo(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sequence Key</label>
              <input type="text" value={seqKey} onChange={e => setSeqKey(e.target.value)} placeholder={dn.seqKeyPlaceholder}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">{dn.cancel}</button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
              {saving ? dn.saving : dn.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Action menu ──────────────────────────────────────────────────────────────

function ActionMenu({ onGetDocNumber, onManageSequence }: { onGetDocNumber: () => void; onManageSequence: () => void }) {
  const { t } = useLang()
  const dn = t.documentNumber
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-48 rounded-xl bg-white shadow-lg border border-gray-100 py-1 overflow-hidden">
            <button onClick={() => { setOpen(false); onGetDocNumber() }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700">{dn.menuGetDoc}</button>
            <button onClick={() => { setOpen(false); onManageSequence() }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700">{dn.menuManageSeq}</button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function DocumentNumberContent() {
  const { t } = useLang()
  const dn = t.documentNumber
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')
  const SS_KEY = 'doc_number_highlight'
  const [configs, setConfigs] = useState<DocumentNumberConfig[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [checkedId, setCheckedId] = useState<string | null>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem(SS_KEY) ?? null
    return null
  })
  const [getDocModal, setGetDocModal] = useState<DocumentNumberConfig | null>(null)
  const [manageSeqModal, setManageSeqModal] = useState<DocumentNumberConfig | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; config?: DocumentNumberConfig }>({ open: false })
  const [deleting, setDeleting] = useState(false)

  const fetchConfigs = useCallback(async (p = page, perPage = itemsPerPage, search = searchTerm) => {
    setLoading(true)
    try {
      const offset = (p - 1) * perPage + 1
      const [listRes, countRes] = await Promise.allSettled([
        documentNumberApi.getConfigs({ offset, limit: perPage, fullTextSearch: search || undefined }),
        documentNumberApi.getConfigCount({ fullTextSearch: search || undefined }),
      ])
      if (listRes.status === 'fulfilled') setConfigs(Array.isArray(listRes.value.data) ? listRes.value.data : [])
      if (countRes.status === 'fulfilled') { const raw = countRes.value.data as unknown; setTotal(typeof raw === 'number' ? raw : 0) }
    } catch { toast.error(dn.loadError) } finally { setLoading(false) }
  }, [dn.loadError, page, itemsPerPage, searchTerm])

  useEffect(() => { fetchConfigs() }, [page, itemsPerPage])

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    sessionStorage.setItem(SS_KEY, highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname)
    const timer = setTimeout(() => {
      document.getElementById(`doc-number-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightIdParam])

  function selectRow(id: string) {
    const next = selectedRowId === id ? null : id
    setSelectedRowId(next)
    if (next) sessionStorage.setItem(SS_KEY, next)
    else sessionStorage.removeItem(SS_KEY)
  }

  function handleSearch() { setPage(1); fetchConfigs(1, itemsPerPage, searchTerm) }

  async function handleDelete() {
    if (!deleteModal.config) return
    setDeleting(true)
    try {
      await documentNumberApi.deleteConfigById(deleteModal.config.id)
      toast.success(dn.deleteSuccess)
      setDeleteModal({ open: false }); setCheckedId(null)
      fetchConfigs()
    } catch { toast.error(dn.deleteError) } finally { setDeleting(false) }
  }

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.nav.documentNumber}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{dn.subtitle}</p>
        </div>
        <button
          onClick={() => router.push('/business/document-number/add')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {dn.addBtn}
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
            placeholder={dn.searchPlaceholder}
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); fetchConfigs(1, itemsPerPage, '') }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <button onClick={handleSearch} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
          {t.admin.search}
        </button>
        <button
          onClick={() => { const cfg = configs.find(c => c.id === checkedId); setDeleteModal({ open: true, config: cfg }) }}
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
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{dn.colDocType}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{dn.colFormat}</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{dn.colSeqDigit}</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{dn.colYearOffset}</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{dn.colResetType}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{dn.colCurrentSeq}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{dn.colLastDocNo}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{dn.fieldTags}</th>
                <th className="w-14 px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                    <span className="text-sm text-gray-400">{t.admin.loading}</span>
                  </div>
                </td></tr>
              ) : configs.length === 0 ? (
                <tr><td colSpan={10} className="py-16 text-center">
                  <FileText className="w-7 h-7 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400">{dn.noData}</p>
                </td></tr>
              ) : configs.map((cfg, idx) => {
                const highlighted = selectedRowId === cfg.id
                const isChecked = checkedId === cfg.id
                return (
                  <tr
                    key={cfg.id}
                    id={`doc-number-row-${cfg.id}`}
                    onClick={() => selectRow(cfg.id)}
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
                        onChange={() => setCheckedId(prev => prev === cfg.id ? null : cfg.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/business/document-number/${cfg.id}/update`)}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-50 text-primary-700 hover:bg-primary-100 hover:text-primary-800 transition-colors"
                      >
                        {cfg.documentType}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{cfg.documentFormat}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{cfg.seqDigit}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{cfg.yearOffset ?? 0}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={clsx(
                        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium',
                        cfg.resetType === 'Monthly' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                      )}>
                        {cfg.resetType === 'Monthly' ? dn.monthly : dn.yearly}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-500 text-xs">
                        {cfg.currentSequenceKey
                          ? <>{cfg.currentSequenceKey} / {cfg.currentSequenceNo}</>
                          : <span className="text-gray-300">—</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {cfg.lastDocumentNumber
                        ? <span className="text-xs font-mono font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded whitespace-nowrap">{cfg.lastDocumentNumber}</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {cfg.tags
                          ? cfg.tags.split(',').filter(Boolean).map(tag => (
                            <span key={tag} className="px-2.5 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-[10px] font-semibold">{tag.trim()}</span>
                          ))
                          : <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                      <ActionMenu
                        onGetDocNumber={() => setGetDocModal(cfg)}
                        onManageSequence={() => setManageSeqModal(cfg)}
                      />
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
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
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
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <GetDocNumberModal config={getDocModal} onClose={() => setGetDocModal(null)} onSaved={fetchConfigs} />
      <ManageSequenceModal config={manageSeqModal} onClose={() => setManageSeqModal(null)} onSaved={fetchConfigs} />
      {deleteModal.open && (
        <DeleteModal
          name={deleteModal.config?.documentType}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal({ open: false })}
          deleting={deleting}
        />
      )}
    </div>
  )
}

export default function DocumentNumberPage() {
  return (
    <Suspense>
      <DocumentNumberContent />
    </Suspense>
  )
}
