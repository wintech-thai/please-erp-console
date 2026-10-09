'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { ChevronLeft, Plus, Pencil, Trash2, PackageMinus, MapPin, ListChecks, FileJson } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { useMasterRefOptions } from '@/hooks/useMasterRefOptions'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import SearchableSelect from '@/components/SearchableSelect'
import JsonViewerModal from '@/components/JsonViewerModal'
import { inventoryLocationApi, type InventoryLocationItem } from '@/lib/api/inventory-location.api'
import { inventoryItemApi, type InventoryItemItem } from '@/lib/api/inventory-item.api'
import { inventoryDocApi, type InventoryDocItemRow, type InventoryDocItem } from '@/lib/api/inventory-doc.api'

type LocalItem = InventoryDocItemRow & { localKey: string }

function newLocalKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k${Date.now()}-${Math.random()}`
}

function fmtNumber(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function DocStatusBadge({ status, label }: { status?: string | null; label: string }) {
  const styles = status === 'Approved'
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    : status === 'Cancelled'
      ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
      : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  return <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold', styles)}>{label}</span>
}

// ─── Item modal ────────────────────────────────────────────────────────────────
// Unlike Stock-In, unit price/total are never entered here — the server fills
// them in from the item's live stock cost at approve time (per spec).

function ItemModal({ initial, itemOptions, projectOptions, onSave, onClose }: {
  initial: LocalItem | null
  itemOptions: InventoryItemItem[]
  projectOptions: { code: string; description: string }[]
  onSave: (item: LocalItem) => void
  onClose: () => void
}) {
  const { t } = useLang()
  const so = t.stockOut

  const [itemId, setItemId] = useState(initial?.itemId || '')
  const [quantity, setQuantity] = useState(initial?.itemQuantity?.toString() || '')
  const [lotId, setLotId] = useState(initial?.lotId || '')
  const [project, setProject] = useState(initial?.project || '')

  const itemSelectOptions = useMemo(
    () => itemOptions.map(i => ({ code: i.id, label: i.code, sublabel: i.nameTh })),
    [itemOptions]
  )
  const projectSelectOptions = useMemo(
    () => projectOptions.map(p => ({ code: p.code, label: p.description || p.code })),
    [projectOptions]
  )

  function handleSave() {
    const qty = parseFloat(quantity)
    if (!itemId || !qty || qty <= 0) { toast.error(so.itemRequiredFields); return }
    const picked = itemOptions.find(i => i.id === itemId)
    onSave({
      localKey: initial?.localKey || newLocalKey(),
      id: initial?.id,
      itemId,
      itemCode: picked?.code,
      itemName: picked?.nameTh,
      itemQuantity: qty,
      itemUnitPrice: initial?.itemUnitPrice ?? undefined,
      itemAmount: initial?.itemAmount ?? undefined,
      lotId: lotId || undefined,
      project: project || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl bg-white overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{initial ? so.itemModalTitleEdit : so.itemModalTitleAdd}</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <FormField label={so.itemFieldItem} required>
            <SearchableSelect
              options={itemSelectOptions}
              value={itemId}
              onChange={setItemId}
              placeholder={so.itemFieldItemPlaceholder}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={so.itemFieldQuantity} required>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className={inputCls} min={0} step="any" />
            </FormField>
            <FormField label={so.itemFieldUnitPrice}>
              <input type="text" value={so.priceCalcNotice} readOnly className={clsx(inputCls, 'bg-gray-50 text-gray-400 italic')} />
            </FormField>
          </div>
          <FormField label={so.itemFieldTotalAmount}>
            <input type="text" value={so.priceCalcNotice} readOnly className={clsx(inputCls, 'bg-gray-50 text-gray-400 italic')} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={so.itemFieldLot}>
              <input type="text" value={lotId} onChange={e => setLotId(e.target.value)} className={inputCls} />
            </FormField>
            <FormField label={so.itemFieldProject}>
              <SearchableSelect
                options={projectSelectOptions}
                value={project}
                onChange={setProject}
                placeholder={so.itemFieldProjectPlaceholder}
              />
            </FormField>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className={cancelBtnCls}>{so.itemModalCancel}</button>
          <button onClick={handleSave} className={primaryBtnCls}>{so.itemModalOk}</button>
        </div>
      </div>
    </div>
  )
}


// ─── Main form ─────────────────────────────────────────────────────────────────

interface Props {
  mode: 'add' | 'edit'
  inventoryDocId?: string
}

export default function StockOutForm({ mode, inventoryDocId }: Props) {
  const { t } = useLang()
  const so = t.stockOut
  const router = useRouter()

  const { options: projectOptions } = useMasterRefOptions('Project')
  const [locations, setLocations] = useState<InventoryLocationItem[]>([])
  const [itemOptions, setItemOptions] = useState<InventoryItemItem[]>([])

  const [loading, setLoading] = useState(mode === 'edit')
  const [doc, setDoc] = useState<InventoryDocItem | null>(null)
  const [description, setDescription] = useState('')
  const [fromLocationId, setFromLocationId] = useState('')
  const [items, setItems] = useState<LocalItem[]>([])
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [itemModal, setItemModal] = useState<{ open: boolean; editing: LocalItem | null }>({ open: false, editing: null })
  const [jsonModalOpen, setJsonModalOpen] = useState(false)

  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  const isPending = mode === 'add' || doc?.documentStatus === 'Pending'
  const readOnly = mode === 'edit' && !isPending
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null)

  useEffect(() => {
    inventoryLocationApi.getLocations({ limit: 100 }).then(res => {
      setLocations(Array.isArray(res.data) ? res.data : [])
    }).catch(() => setLocations([]))
    inventoryItemApi.getItems({ limit: 100 }).then(res => {
      setItemOptions(Array.isArray(res.data) ? res.data : [])
    }).catch(() => setItemOptions([]))
  }, [])

  useEffect(() => {
    if (mode !== 'edit' || !inventoryDocId) return
    setLoading(true)
    inventoryDocApi.getDocById(inventoryDocId)
      .then(res => {
        const d = res.data
        setDoc(d)
        setDescription(d.description || '')
        setFromLocationId(d.fromLocationId || '')
        setItems((d.items || []).map(it => ({ ...it, localKey: newLocalKey() })))
      })
      .catch(() => toast.error(so.loadDocFailed))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, inventoryDocId])

  function markDirty() { if (!isDirty) setIsDirty(true) }

  const locationSelectOptions = useMemo(
    () => locations.map(l => ({ code: l.id, label: l.name, sublabel: l.code })),
    [locations]
  )

  function handleAddItem() { setItemModal({ open: true, editing: null }) }
  function handleEditItem(item: LocalItem) { setItemModal({ open: true, editing: item }) }
  function handleRemoveItem(localKey: string) { setItems(prev => prev.filter(i => i.localKey !== localKey)); markDirty() }

  function handleItemModalSave(item: LocalItem) {
    setItems(prev => {
      const exists = prev.some(i => i.localKey === item.localKey)
      return exists ? prev.map(i => (i.localKey === item.localKey ? item : i)) : [...prev, item]
    })
    setItemModal({ open: false, editing: null })
    markDirty()
  }

  const totalAmount = items.reduce((s, i) => s + (i.itemAmount || 0), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const location = locations.find(l => l.id === fromLocationId)
    if (!fromLocationId) { toast.error(so.requiredFields); return }

    const payload = {
      description: description || undefined,
      fromLocationId,
      fromLocationCode: location?.code,
      fromLocationName: location?.name,
      items: items.map(({ localKey, itemUnitPrice, itemAmount, ...rest }) => rest),
    }

    setSaving(true)
    try {
      if (mode === 'add') {
        const res = await inventoryDocApi.addStockOut(payload)
        toast.success(so.addSuccess)
        setIsDirty(false)
        const newId = res.data.inventoryDoc?.id
        router.push(newId ? `/business/inventory/stock-out?highlight=${newId}` : '/business/inventory/stock-out')
      } else if (inventoryDocId) {
        const res = await inventoryDocApi.updateStockOutById(inventoryDocId, payload)
        if (res.data.status !== 'OK') { toast.error(res.data.description || so.failedToUpdate); return }
        toast.success(so.updateSuccess)
        setIsDirty(false)
        router.push(`/business/inventory/stock-out?highlight=${inventoryDocId}`)
      }
    } catch (err) {
      const axiosErr = err as AxiosError
      toast.error(axiosErr.message || (mode === 'add' ? so.failedToAdd : so.failedToUpdate))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100dvh-5rem)]">
        <div className="w-7 h-7 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const statusLabel = doc?.documentStatus === 'Approved' ? so.statusApproved
    : doc?.documentStatus === 'Cancelled' ? so.statusCancelled
    : so.statusPending

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <div className="flex-none bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3 text-white shadow-sm">
        <button onClick={() => guardNavigation(() => router.back())} className="p-2 rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors flex-none">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-none">
          <PackageMinus className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">
            {mode === 'add' ? so.createTitle : so.editTitle}
          </h1>
          {doc?.documentNo && <p className="text-xs text-primary-100 mt-0.5">{doc.documentNo}</p>}
        </div>
        {mode === 'edit' && doc && (
          <button
            type="button"
            onClick={() => setJsonModalOpen(true)}
            title={t.common.rawJson}
            className="p-2 rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors flex-none"
          >
            <FileJson className="w-5 h-5" />
          </button>
        )}
        {mode === 'edit' && <DocStatusBadge status={doc?.documentStatus} label={statusLabel} />}
      </div>

      {readOnly && (
        <div className="flex-none mb-4 px-4 py-3 rounded-lg bg-amber-50 text-amber-700 text-sm border border-amber-100">
          {so.readOnlyNotice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-none">
                <MapPin className="w-3.5 h-3.5 text-primary-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">{so.docInfoTitle}</h3>
            </div>
            <div className="max-w-2xl space-y-4">
              <FormField label={so.fieldFromLocation} required>
                <SearchableSelect
                  options={locationSelectOptions}
                  value={fromLocationId}
                  onChange={v => { setFromLocationId(v); markDirty() }}
                  placeholder={so.fieldFromLocationPlaceholder}
                  disabled={readOnly}
                />
              </FormField>
              <FormField label={so.fieldDescription}>
                <textarea
                  value={description}
                  onChange={e => { setDescription(e.target.value); markDirty() }}
                  disabled={readOnly}
                  rows={2}
                  className={clsx(inputCls, readOnly && 'bg-gray-50 text-gray-500')}
                />
              </FormField>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1">
            <div className="px-7 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-none">
                  <ListChecks className="w-3.5 h-3.5 text-primary-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">{so.itemsTitle}</h3>
              </div>
              {!readOnly && (
                <button type="button" onClick={handleAddItem} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  {so.addItemBtn}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{so.colItem}</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{so.colItemName}</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{so.colQuantity}</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{so.colUnitPrice}</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{so.colTotalAmount}</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{so.colLot}</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{so.colProject}</th>
                    {!readOnly && <th className="w-20 px-5 py-2.5" />}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={readOnly ? 7 : 8} className="py-10 text-center text-sm text-gray-400">{so.noItems}</td></tr>
                  ) : items.map((item, idx) => {
                    const highlighted = highlightedKey === item.localKey
                    return (
                    <tr
                      key={item.localKey}
                      onClick={() => setHighlightedKey(prev => prev === item.localKey ? null : item.localKey)}
                      className={clsx(
                        'border-b border-gray-50 cursor-pointer transition-colors',
                        highlighted
                          ? '!bg-primary-100 border-l-[3px] border-l-primary-500'
                          : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                      )}
                    >
                      <td className="px-5 py-3 font-medium text-gray-800">{item.itemCode || '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{item.itemName || '—'}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-800">{fmtNumber(item.itemQuantity)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-400 italic">
                        {item.itemUnitPrice != null ? fmtNumber(item.itemUnitPrice) : so.priceCalcNotice}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-gray-400 italic">
                        {item.itemAmount != null ? fmtNumber(item.itemAmount) : so.priceCalcNotice}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{item.lotId || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {projectOptions.find(p => p.code === item.project)?.description || item.project || '—'}
                      </td>
                      {!readOnly && (
                        <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => handleEditItem(item)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => handleRemoveItem(item.localKey)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    )
                  })}
                </tbody>
                {items.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-primary-100 bg-primary-50/60">
                      <td colSpan={4} className="px-5 py-3 text-xs font-bold text-primary-700 uppercase tracking-wide text-right">{so.colTotalAmount}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-bold text-primary-800">{fmtNumber(totalAmount)}</td>
                      <td colSpan={readOnly ? 2 : 3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button type="button" onClick={() => guardNavigation(() => router.back())} className={cancelBtnCls}>
            {so.cancel}
          </button>
          {!readOnly && (
            <button type="submit" disabled={saving} className={primaryBtnCls}>
              {saving ? so.saving : so.save}
            </button>
          )}
        </div>
      </form>

      {itemModal.open && (
        <ItemModal
          initial={itemModal.editing}
          itemOptions={itemOptions}
          projectOptions={projectOptions}
          onSave={handleItemModalSave}
          onClose={() => setItemModal({ open: false, editing: null })}
        />
      )}

      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}

      {jsonModalOpen && doc && (
        <JsonViewerModal data={doc} title={`${t.common.rawJson} — ${doc.documentNo ?? ''}`} onClose={() => setJsonModalOpen(false)} />
      )}
    </div>
  )
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white'
const cancelBtnCls = 'px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'
const primaryBtnCls = 'flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors'
