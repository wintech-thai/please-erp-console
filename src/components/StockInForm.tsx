'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { ChevronLeft, Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { useMasterRefOptions } from '@/hooks/useMasterRefOptions'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import SearchableSelect from '@/components/SearchableSelect'
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

// ─── Item modal ────────────────────────────────────────────────────────────────

function ItemModal({ initial, itemOptions, projectOptions, onSave, onClose }: {
  initial: LocalItem | null
  itemOptions: InventoryItemItem[]
  projectOptions: { code: string; description: string }[]
  onSave: (item: LocalItem) => void
  onClose: () => void
}) {
  const { t } = useLang()
  const si = t.stockIn

  const [itemId, setItemId] = useState(initial?.itemId || '')
  const [quantity, setQuantity] = useState(initial?.itemQuantity?.toString() || '')
  const [unitPrice, setUnitPrice] = useState(initial?.itemUnitPrice?.toString() || '')
  const [lotId, setLotId] = useState(initial?.lotId || '')
  const [project, setProject] = useState(initial?.project || '')

  const total = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0)

  const itemSelectOptions = useMemo(
    () => itemOptions.map(i => ({ code: i.id, label: i.code, sublabel: i.nameTh })),
    [itemOptions]
  )
  const projectSelectOptions = useMemo(
    () => projectOptions.map(p => ({ code: p.code, label: p.description || p.code })),
    [projectOptions]
  )

  function handleItemSelect(id: string) {
    setItemId(id)
    const picked = itemOptions.find(i => i.id === id)
    if (picked && !unitPrice && picked.price != null) setUnitPrice(String(picked.price))
  }

  function handleSave() {
    const qty = parseFloat(quantity)
    if (!itemId || !qty || qty <= 0) { toast.error(si.itemRequiredFields); return }
    const picked = itemOptions.find(i => i.id === itemId)
    onSave({
      localKey: initial?.localKey || newLocalKey(),
      id: initial?.id,
      itemId,
      itemCode: picked?.code,
      itemName: picked?.nameTh,
      itemQuantity: qty,
      itemUnitPrice: parseFloat(unitPrice) || 0,
      itemAmount: total,
      lotId: lotId || undefined,
      project: project || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl bg-white overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{initial ? si.itemModalTitleEdit : si.itemModalTitleAdd}</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <FormField label={si.itemFieldItem} required>
            <SearchableSelect
              options={itemSelectOptions}
              value={itemId}
              onChange={handleItemSelect}
              placeholder={si.itemFieldItemPlaceholder}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={si.itemFieldQuantity} required>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className={inputCls} min={0} step="any" />
            </FormField>
            <FormField label={si.itemFieldUnitPrice}>
              <input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className={inputCls} min={0} step="any" />
            </FormField>
          </div>
          <FormField label={si.itemFieldTotalAmount}>
            <input type="text" value={fmtNumber(total)} readOnly className={clsx(inputCls, 'bg-gray-50 text-gray-500')} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={si.itemFieldLot}>
              <input type="text" value={lotId} onChange={e => setLotId(e.target.value)} className={inputCls} />
            </FormField>
            <FormField label={si.itemFieldProject}>
              <SearchableSelect
                options={projectSelectOptions}
                value={project}
                onChange={setProject}
                placeholder={si.itemFieldProjectPlaceholder}
              />
            </FormField>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className={cancelBtnCls}>{si.itemModalCancel}</button>
          <button onClick={handleSave} className={primaryBtnCls}>{si.itemModalOk}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Approve/Cancel confirm modal ──────────────────────────────────────────────

function ConfirmModal({ title, desc, confirmLabel, confirmingLabel, cancelLabel, confirming, danger, onConfirm, onCancel }: {
  title: string; desc: string; confirmLabel: string; confirmingLabel: string; cancelLabel: string
  confirming: boolean; danger?: boolean; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
          {danger ? <XCircle className="w-7 h-7 text-white" /> : <CheckCircle2 className="w-7 h-7 text-white" />}
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-white/60 mb-7">{desc}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className={clsx('flex-1 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60 transition-colors uppercase',
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700')}
          >
            {confirming ? confirmingLabel : confirmLabel}
          </button>
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

export default function StockInForm({ mode, inventoryDocId }: Props) {
  const { t } = useLang()
  const si = t.stockIn
  const router = useRouter()

  const { options: projectOptions } = useMasterRefOptions('Project')
  const [locations, setLocations] = useState<InventoryLocationItem[]>([])
  const [itemOptions, setItemOptions] = useState<InventoryItemItem[]>([])

  const [loading, setLoading] = useState(mode === 'edit')
  const [doc, setDoc] = useState<InventoryDocItem | null>(null)
  const [description, setDescription] = useState('')
  const [toLocationId, setToLocationId] = useState('')
  const [items, setItems] = useState<LocalItem[]>([])
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [itemModal, setItemModal] = useState<{ open: boolean; editing: LocalItem | null }>({ open: false, editing: null })
  const [confirmAction, setConfirmAction] = useState<'approve' | 'cancel' | null>(null)
  const [actioning, setActioning] = useState(false)

  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  const isPending = mode === 'add' || doc?.documentStatus === 'Pending'
  const readOnly = mode === 'edit' && !isPending

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
        setToLocationId(d.toLocationId || '')
        setItems((d.items || []).map(it => ({ ...it, localKey: newLocalKey() })))
      })
      .catch(() => toast.error(si.loadDocFailed))
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
    const location = locations.find(l => l.id === toLocationId)
    if (!toLocationId) { toast.error(si.requiredFields); return }

    const payload = {
      description: description || undefined,
      toLocationId,
      toLocationCode: location?.code,
      toLocationName: location?.name,
      items: items.map(({ localKey, ...rest }) => rest),
    }

    setSaving(true)
    try {
      if (mode === 'add') {
        const res = await inventoryDocApi.addStockIn(payload)
        toast.success(si.addSuccess)
        setIsDirty(false)
        const newId = res.data.inventoryDoc?.id
        router.push(newId ? `/business/inventory/stock-in?highlight=${newId}` : '/business/inventory/stock-in')
      } else if (inventoryDocId) {
        const res = await inventoryDocApi.updateStockInById(inventoryDocId, payload)
        if (res.data.status !== 'OK') { toast.error(res.data.description || si.failedToUpdate); return }
        toast.success(si.updateSuccess)
        setIsDirty(false)
        router.push(`/business/inventory/stock-in?highlight=${inventoryDocId}`)
      }
    } catch (err) {
      const axiosErr = err as AxiosError
      toast.error(axiosErr.message || (mode === 'add' ? si.failedToAdd : si.failedToUpdate))
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction || !inventoryDocId) return
    setActioning(true)
    try {
      if (confirmAction === 'approve') {
        await inventoryDocApi.approveStockInById(inventoryDocId)
        toast.success(si.approveSuccess)
      } else {
        await inventoryDocApi.cancelStockInById(inventoryDocId)
        toast.success(si.cancelDocSuccess)
      }
      setConfirmAction(null)
      setIsDirty(false)
      router.push(`/business/inventory/stock-in?highlight=${inventoryDocId}`)
    } catch {
      toast.error(confirmAction === 'approve' ? si.failedToApprove : si.failedToCancelDoc)
    } finally {
      setActioning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100dvh-5rem)]">
        <div className="w-7 h-7 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <div className="flex-none flex items-center gap-3 mb-6">
        <button onClick={() => guardNavigation(() => router.back())} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'add' ? si.createTitle : si.editTitle}
          </h1>
          {doc?.documentNo && <p className="text-sm text-gray-500 mt-0.5">{doc.documentNo}</p>}
        </div>
      </div>

      {readOnly && (
        <div className="flex-none mb-4 px-4 py-3 rounded-lg bg-amber-50 text-amber-700 text-sm border border-amber-100">
          {si.readOnlyNotice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="max-w-2xl space-y-4">
              <FormField label={si.fieldToLocation} required>
                <SearchableSelect
                  options={locationSelectOptions}
                  value={toLocationId}
                  onChange={v => { setToLocationId(v); markDirty() }}
                  placeholder={si.fieldToLocationPlaceholder}
                  disabled={readOnly}
                />
              </FormField>
              <FormField label={si.fieldDescription}>
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
              <h3 className="text-sm font-bold text-gray-900">{si.itemsTitle}</h3>
              {!readOnly && (
                <button type="button" onClick={handleAddItem} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  {si.addItemBtn}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{si.colItem}</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{si.colItemName}</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{si.colQuantity}</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{si.colUnitPrice}</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{si.colTotalAmount}</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{si.colLot}</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{si.colProject}</th>
                    {!readOnly && <th className="w-20 px-5 py-2.5" />}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={readOnly ? 7 : 8} className="py-10 text-center text-sm text-gray-400">{si.noItems}</td></tr>
                  ) : items.map((item, idx) => (
                    <tr key={item.localKey} className={clsx('border-b border-gray-50', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40')}>
                      <td className="px-5 py-3 font-medium text-gray-800">{item.itemCode || '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{item.itemName || '—'}</td>
                      <td className="px-5 py-3 text-right font-mono text-gray-800">{fmtNumber(item.itemQuantity)}</td>
                      <td className="px-5 py-3 text-right font-mono text-gray-600">{fmtNumber(item.itemUnitPrice)}</td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-gray-900">{fmtNumber(item.itemAmount)}</td>
                      <td className="px-5 py-3 text-gray-500">{item.lotId || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {projectOptions.find(p => p.code === item.project)?.description || item.project || '—'}
                      </td>
                      {!readOnly && (
                        <td className="px-5 py-3">
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
                  ))}
                </tbody>
                {items.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-100">
                      <td colSpan={4} className="px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide text-right">{si.colTotalAmount}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-gray-900">{fmtNumber(totalAmount)}</td>
                      <td colSpan={readOnly ? 2 : 3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          {mode === 'edit' && isPending && (
            <>
              <button type="button" onClick={() => setConfirmAction('cancel')} className="px-5 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                {si.cancelDocBtn}
              </button>
              <button type="button" onClick={() => setConfirmAction('approve')} className="px-5 py-2.5 text-sm font-medium text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
                {si.approveBtn}
              </button>
            </>
          )}
          <button type="button" onClick={() => guardNavigation(() => router.back())} className={cancelBtnCls}>
            {si.cancel}
          </button>
          {!readOnly && (
            <button type="submit" disabled={saving} className={primaryBtnCls}>
              {saving ? si.saving : si.save}
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

      {confirmAction && (
        <ConfirmModal
          title={confirmAction === 'approve' ? si.approveConfirmTitle : si.cancelDocConfirmTitle}
          desc={confirmAction === 'approve' ? si.approveConfirmDesc : si.cancelDocConfirmDesc}
          confirmLabel={confirmAction === 'approve' ? si.approveBtn : si.confirm}
          confirmingLabel={confirmAction === 'approve' ? si.approving : si.cancelling}
          cancelLabel={si.cancel}
          confirming={actioning}
          danger={confirmAction === 'cancel'}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}
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
