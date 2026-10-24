'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { ChevronLeft, Plus, Pencil, Trash2, Receipt, ListChecks, Users, FileJson } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { useMasterRefOptions } from '@/hooks/useMasterRefOptions'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import JsonViewerModal from '@/components/JsonViewerModal'
import SearchableSelect from '@/components/SearchableSelect'
import { accountDocApi, type AccountDocItemRow, type AccountDocItem, type ProductType, type ItemDiscountType } from '@/lib/api/account-doc.api'
import { customerApi, type CustomerItem } from '@/lib/api/customer.api'
import { inventoryItemApi, type InventoryItemItem } from '@/lib/api/inventory-item.api'

type SaleType = 'cash' | 'credit'
type LocalItem = AccountDocItemRow & { localKey: string }

function newLocalKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k${Date.now()}-${Math.random()}`
}

function fmtNumber(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Mirrors AccountDocRepository.CalculateItemAmounts (onix-v2-api) so the UI preview matches
// what gets persisted on save — server recalculates authoritatively either way.
function calcItemAmounts(item: Pick<LocalItem, 'quantity' | 'unitPrice' | 'itemDiscountType' | 'itemDiscountValue' | 'vatEnabled' | 'withholdingTaxEnabled' | 'withholdingTaxRate'>, vatRate: number) {
  const gross = (item.quantity || 0) * (item.unitPrice || 0)
  const discountAmount = item.itemDiscountType === 'Percent'
    ? gross * ((item.itemDiscountValue || 0) / 100)
    : item.itemDiscountType === 'Amount'
      ? (item.itemDiscountValue || 0)
      : 0
  const netAmount = gross - discountAmount
  const vatAmount = item.vatEnabled ? netAmount * (vatRate / 100) : 0
  const withholdingTaxAmount = item.withholdingTaxEnabled ? netAmount * ((item.withholdingTaxRate || 0) / 100) : 0
  return { gross, discountAmount, netAmount, vatAmount, withholdingTaxAmount }
}

function toDateInputValue(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
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

function ItemModal({ initial, serviceOptions, itemOptions, vatRate, onSave, onClose }: {
  initial: LocalItem | null
  serviceOptions: { id: string; code: string; description: string }[]
  itemOptions: InventoryItemItem[]
  vatRate: number
  onSave: (item: LocalItem) => void
  onClose: () => void
}) {
  const { t } = useLang()
  const sd = t.salesDoc

  const [productType, setProductType] = useState<ProductType>((initial?.productType as ProductType) || 'Service')
  const [productId, setProductId] = useState(initial?.productId || '')
  const [customName, setCustomName] = useState(productType === 'Custom' ? (initial?.productDesc || '') : '')
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() || '1')
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice?.toString() || '')
  const [discountType, setDiscountType] = useState<ItemDiscountType | ''>((initial?.itemDiscountType as ItemDiscountType) || '')
  const [discountValue, setDiscountValue] = useState(initial?.itemDiscountValue?.toString() || '')
  const [vatEnabled, setVatEnabled] = useState(!!initial?.vatEnabled)
  const [whtEnabled, setWhtEnabled] = useState(!!initial?.withholdingTaxEnabled)
  const [whtRate, setWhtRate] = useState(initial?.withholdingTaxRate?.toString() || '3')

  const total = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0)
  const calc = calcItemAmounts({
    quantity: parseFloat(quantity) || 0,
    unitPrice: parseFloat(unitPrice) || 0,
    itemDiscountType: discountType || null,
    itemDiscountValue: parseFloat(discountValue) || 0,
    vatEnabled,
    withholdingTaxEnabled: whtEnabled,
    withholdingTaxRate: parseFloat(whtRate) || 0,
  }, vatRate)

  const serviceSelectOptions = useMemo(
    () => serviceOptions.map(s => ({ code: s.id, label: s.description || s.code, sublabel: s.code })),
    [serviceOptions]
  )
  const itemSelectOptions = useMemo(
    () => itemOptions.map(i => ({ code: i.id, label: i.code, sublabel: i.nameTh })),
    [itemOptions]
  )

  function handleTypeChange(type: ProductType) {
    setProductType(type)
    setProductId('')
    if (type !== 'Custom') setCustomName('')
  }

  function handleServiceSelect(id: string) {
    setProductId(id)
    const picked = serviceOptions.find(s => s.id === id)
    if (picked) setCustomName(picked.description || picked.code)
  }

  function handleItemSelect(id: string) {
    setProductId(id)
    const picked = itemOptions.find(i => i.id === id)
    if (picked) {
      setCustomName(picked.nameTh)
      if (!unitPrice && picked.price != null) setUnitPrice(String(picked.price))
    }
  }

  function handleSave() {
    const qty = parseFloat(quantity)
    if (!qty || qty <= 0 || !customName) { toast.error(sd.itemRequiredFields); return }
    if (productType !== 'Custom' && !productId) { toast.error(sd.itemRequiredFields); return }

    let productCode: string | undefined
    if (productType === 'Service') productCode = serviceOptions.find(s => s.id === productId)?.code
    else if (productType === 'InventoryItem') productCode = itemOptions.find(i => i.id === productId)?.code

    onSave({
      localKey: initial?.localKey || newLocalKey(),
      id: initial?.id,
      productType,
      productId: productType === 'Custom' ? undefined : productId,
      productCode,
      productDesc: customName,
      quantity: qty,
      unitPrice: parseFloat(unitPrice) || 0,
      totalPrice: total,
      itemDiscountType: discountType || null,
      itemDiscountValue: parseFloat(discountValue) || 0,
      itemDiscountAmount: calc.discountAmount,
      netAmount: calc.netAmount,
      vatEnabled: productType === 'Service' ? vatEnabled : false,
      vatAmount: productType === 'Service' ? calc.vatAmount : 0,
      withholdingTaxEnabled: productType === 'Service' ? whtEnabled : false,
      withholdingTaxRate: productType === 'Service' ? (parseFloat(whtRate) || 0) : null,
      withholdingTaxAmount: productType === 'Service' ? calc.withholdingTaxAmount : 0,
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl bg-white overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{initial ? sd.itemModalTitleEdit : sd.itemModalTitleAdd}</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <FormField label={sd.fieldProductType} required>
            <select value={productType} onChange={e => handleTypeChange(e.target.value as ProductType)} className={inputCls}>
              <option value="Service">{sd.productTypeService}</option>
              <option value="InventoryItem">{sd.productTypeInventoryItem}</option>
              <option value="Custom">{sd.productTypeCustom}</option>
            </select>
          </FormField>

          {productType === 'Service' && (
            <FormField label={sd.fieldProduct} required>
              <SearchableSelect options={serviceSelectOptions} value={productId} onChange={handleServiceSelect} placeholder={sd.fieldProductPlaceholder} />
            </FormField>
          )}
          {productType === 'InventoryItem' && (
            <FormField label={sd.fieldProduct} required>
              <SearchableSelect options={itemSelectOptions} value={productId} onChange={handleItemSelect} placeholder={sd.fieldProductPlaceholder} />
            </FormField>
          )}
          {productType === 'Custom' && (
            <FormField label={sd.fieldCustomName} required>
              <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder={sd.fieldCustomNamePlaceholder} className={inputCls} />
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label={sd.fieldQuantity} required>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className={inputCls} min={0} step="any" />
            </FormField>
            <FormField label={sd.fieldUnitPrice}>
              <input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className={inputCls} min={0} step="any" />
            </FormField>
          </div>
          <FormField label={sd.fieldTotalAmount}>
            <input type="text" value={fmtNumber(total)} readOnly className={clsx(inputCls, 'bg-gray-50 text-gray-500')} />
          </FormField>

          {/* ปรับแก้ #6: ส่วนลดระดับ item เลือกได้ % หรือจำนวนเงิน */}
          <FormField label={sd.fieldItemDiscount}>
            <div className="flex gap-2">
              <select value={discountType} onChange={e => setDiscountType(e.target.value as ItemDiscountType | '')} className={clsx(inputCls, 'w-32 flex-none')}>
                <option value="">{sd.discountTypeNone}</option>
                <option value="Percent">%</option>
                <option value="Amount">{sd.discountTypeAmount}</option>
              </select>
              <input
                type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                disabled={!discountType} className={clsx(inputCls, !discountType && 'bg-gray-50 text-gray-400')}
                min={0} step="any"
              />
            </div>
            {discountType && <p className="mt-1 text-xs text-gray-400">{sd.discountAmountLabel}: {fmtNumber(calc.discountAmount)}</p>}
          </FormField>

          {/* ปรับแก้ #7: VAT / หัก ณ ที่จ่าย เฉพาะ item ประเภทสินค้าและบริการทั่วไป */}
          {productType === 'Service' && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={vatEnabled} onChange={e => setVatEnabled(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                {sd.fieldVatEnabled}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={whtEnabled} onChange={e => setWhtEnabled(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                {sd.fieldWithholdingTaxEnabled}
              </label>
              {whtEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">%</span>
                  <input type="number" value={whtRate} onChange={e => setWhtRate(e.target.value)} className={clsx(inputCls, 'w-20 py-1.5')} min={0} step="any" />
                </div>
              )}
            </div>
          )}

          {(discountType || vatEnabled || whtEnabled) && (
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-600 space-y-1">
              <div className="flex justify-between"><span>{sd.netAmountLabel}</span><span className="font-semibold text-gray-800">{fmtNumber(calc.netAmount)}</span></div>
              {vatEnabled && <div className="flex justify-between"><span>{sd.vatAmountLabel}</span><span className="font-semibold text-gray-800">{fmtNumber(calc.vatAmount)}</span></div>}
              {whtEnabled && <div className="flex justify-between"><span>{sd.withholdingAmountLabel}</span><span className="font-semibold text-gray-800">{fmtNumber(calc.withholdingTaxAmount)}</span></div>}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className={cancelBtnCls}>{sd.itemModalCancel}</button>
          <button onClick={handleSave} className={primaryBtnCls}>{sd.itemModalOk}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main form ─────────────────────────────────────────────────────────────────

interface Props {
  mode: 'add' | 'edit'
  saleType: SaleType
  accountDocId?: string
}

export default function SalesDocForm({ mode, saleType, accountDocId }: Props) {
  const { t } = useLang()
  const sd = t.salesDoc
  const tt = saleType === 'cash' ? t.cashSale : t.creditSale
  const basePath = `/business/sale-management/${saleType === 'cash' ? 'cash-sale' : 'credit-sale'}`
  const router = useRouter()

  const { options: serviceOptions } = useMasterRefOptions('Service')
  const [customers, setCustomers] = useState<CustomerItem[]>([])
  const [itemOptions, setItemOptions] = useState<InventoryItemItem[]>([])

  const [loading, setLoading] = useState(mode === 'edit')
  const [doc, setDoc] = useState<AccountDocItem | null>(null)
  const [entityId, setEntityId] = useState('')
  const [documentDate, setDocumentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paidAmount, setPaidAmount] = useState('')
  const [vatRate, setVatRate] = useState('0')
  const [items, setItems] = useState<LocalItem[]>([])
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [itemModal, setItemModal] = useState<{ open: boolean; editing: LocalItem | null }>({ open: false, editing: null })
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null)
  const [jsonModalOpen, setJsonModalOpen] = useState(false)

  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  const isPending = mode === 'add' || doc?.status === 'Pending'
  const readOnly = mode === 'edit' && !isPending

  useEffect(() => {
    customerApi.getCustomers({ limit: 100 }).then(res => {
      setCustomers(Array.isArray(res.data) ? res.data : [])
    }).catch(() => setCustomers([]))
    inventoryItemApi.getItems({ limit: 100 }).then(res => {
      setItemOptions(Array.isArray(res.data) ? res.data : [])
    }).catch(() => setItemOptions([]))
  }, [])

  useEffect(() => {
    if (mode !== 'edit' || !accountDocId) return
    setLoading(true)
    accountDocApi.getDocById(accountDocId)
      .then(res => {
        const d = res.data.accountDoc
        if (!d) { toast.error(sd.loadDocFailed); return }
        setDoc(d)
        setEntityId(d.entityId || '')
        setDocumentDate(toDateInputValue(d.documentDate) || new Date().toISOString().slice(0, 10))
        setDescription(d.description || '')
        setDueDate(toDateInputValue(d.dueDate))
        setPaymentMethod(d.paymentMethod || 'Cash')
        setPaidAmount(d.paidAmount != null ? String(d.paidAmount) : '')
        setVatRate(d.vatRate != null ? String(d.vatRate) : '0')
        setItems((d.items || []).map(it => ({ ...it, localKey: newLocalKey() })))
      })
      .catch(() => toast.error(sd.loadDocFailed))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, accountDocId])

  function markDirty() { if (!isDirty) setIsDirty(true) }

  const customerSelectOptions = useMemo(
    () => customers.map(c => ({ code: c.id, label: c.name, sublabel: c.code })),
    [customers]
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

  // ปรับแก้ #7: สรุปยอดฝั่งหน้าเอกสารแม่ — mirror ของ server (AccountDocRepository.SyncAccountDocItems)
  const totals = useMemo(() => {
    const rate = parseFloat(vatRate) || 0
    let totalPrice = 0, discountAmount = 0, vatAmount = 0, withholdingTaxAmount = 0
    for (const item of items) {
      const calc = calcItemAmounts({
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        itemDiscountType: item.itemDiscountType ?? null,
        itemDiscountValue: item.itemDiscountValue || 0,
        vatEnabled: !!item.vatEnabled,
        withholdingTaxEnabled: !!item.withholdingTaxEnabled,
        withholdingTaxRate: item.withholdingTaxRate || 0,
      }, rate)
      totalPrice += calc.gross
      discountAmount += calc.discountAmount
      vatAmount += calc.vatAmount
      withholdingTaxAmount += calc.withholdingTaxAmount
    }
    const netAmount = totalPrice - discountAmount
    const totalWithVat = netAmount + vatAmount
    const grandTotal = totalWithVat - withholdingTaxAmount
    return { totalPrice, discountAmount, netAmount, vatAmount, totalWithVat, withholdingTaxAmount, grandTotal }
  }, [items, vatRate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!entityId || items.length === 0) { toast.error(sd.requiredFields); return }

    if (mode === 'edit' && accountDocId && !isDirty) {
      router.push(`${basePath}?highlight=${accountDocId}`)
      return
    }

    const payload = {
      entityId,
      description: description || undefined,
      documentDate: documentDate ? new Date(documentDate).toISOString() : undefined,
      dueDate: saleType === 'credit' && dueDate ? new Date(dueDate).toISOString() : undefined,
      paymentMethod: saleType === 'cash' ? paymentMethod : undefined,
      paidAmount: saleType === 'cash' && paidAmount ? parseFloat(paidAmount) : undefined,
      vatRate: parseFloat(vatRate) || 0,
      items: items.map(({ localKey, ...rest }) => rest),
    }

    setSaving(true)
    try {
      if (mode === 'add') {
        const res = saleType === 'cash' ? await accountDocApi.addCashSale(payload) : await accountDocApi.addCreditSale(payload)
        if (res.data.status !== 'OK') { toast.error(res.data.description || sd.failedToAdd); return }
        toast.success(sd.addSuccess)
        setIsDirty(false)
        const newId = res.data.accountDoc?.id
        router.push(newId ? `${basePath}?highlight=${newId}` : basePath)
      } else if (accountDocId) {
        const res = await accountDocApi.updateDocById(accountDocId, payload)
        if (res.data.status !== 'OK') { toast.error(res.data.description || sd.failedToUpdate); return }
        toast.success(sd.updateSuccess)
        setIsDirty(false)
        router.push(`${basePath}?highlight=${accountDocId}`)
      }
    } catch (err) {
      const axiosErr = err as AxiosError
      toast.error(axiosErr.message || (mode === 'add' ? sd.failedToAdd : sd.failedToUpdate))
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

  const statusLabel = doc?.status === 'Approved' ? sd.statusApproved
    : doc?.status === 'Cancelled' ? sd.statusCancelled
    : sd.statusPending

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <div className="flex-none bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3 text-white shadow-sm">
        <button onClick={() => guardNavigation(() => router.back())} className="p-2 rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors flex-none">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-none">
          <Receipt className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{mode === 'add' ? tt.createTitle : tt.editTitle}</h1>
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
        {mode === 'edit' && <DocStatusBadge status={doc?.status} label={statusLabel} />}
      </div>

      {readOnly && (
        <div className="flex-none mb-4 px-4 py-3 rounded-lg bg-amber-50 text-amber-700 text-sm border border-amber-100">
          {sd.readOnlyNotice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-none">
                <Users className="w-3.5 h-3.5 text-primary-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">{sd.docInfoTitle}</h3>
            </div>
            <div className="max-w-2xl space-y-4">
              <FormField label={sd.fieldCustomer} required>
                <SearchableSelect
                  options={customerSelectOptions}
                  value={entityId}
                  onChange={v => { setEntityId(v); markDirty() }}
                  placeholder={sd.fieldCustomerPlaceholder}
                  disabled={readOnly}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={sd.fieldDocDate}>
                  <input type="date" value={documentDate} onChange={e => { setDocumentDate(e.target.value); markDirty() }} disabled={readOnly} className={clsx(inputCls, readOnly && 'bg-gray-50 text-gray-500')} />
                </FormField>
                {saleType === 'credit' && (
                  <FormField label={sd.fieldDueDate}>
                    <input type="date" value={dueDate} onChange={e => { setDueDate(e.target.value); markDirty() }} disabled={readOnly} className={clsx(inputCls, readOnly && 'bg-gray-50 text-gray-500')} />
                  </FormField>
                )}
                {saleType === 'cash' && (
                  <FormField label={sd.fieldPaymentMethod}>
                    <select value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); markDirty() }} disabled={readOnly} className={clsx(inputCls, readOnly && 'bg-gray-50 text-gray-500')}>
                      <option value="Cash">{sd.paymentMethodCash}</option>
                      <option value="Transfer">{sd.paymentMethodTransfer}</option>
                      <option value="Qr">{sd.paymentMethodQr}</option>
                    </select>
                  </FormField>
                )}
              </div>
              {saleType === 'cash' && (
                <FormField label={sd.fieldPaidAmount}>
                  <input type="number" value={paidAmount} onChange={e => { setPaidAmount(e.target.value); markDirty() }} disabled={readOnly} className={clsx(inputCls, readOnly && 'bg-gray-50 text-gray-500')} min={0} step="any" />
                </FormField>
              )}
              <FormField label={sd.fieldDescription}>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-7 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-none">
                  <ListChecks className="w-3.5 h-3.5 text-primary-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">{sd.itemsTitle}</h3>
              </div>
              {!readOnly && (
                <button type="button" onClick={handleAddItem} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  {sd.addItemBtn}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{sd.colProduct}</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{sd.colQuantity}</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{sd.colUnitPrice}</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{sd.colTotalAmount}</th>
                    {!readOnly && <th className="w-20 px-5 py-2.5" />}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={readOnly ? 4 : 5} className="py-10 text-center text-sm text-gray-400">{sd.noItems}</td></tr>
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
                        <td className="px-5 py-3 font-medium text-gray-800">{item.productDesc || item.productCode || '—'}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-gray-800">{fmtNumber(item.quantity)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-gray-600">{fmtNumber(item.unitPrice)}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold text-gray-900">{fmtNumber(item.totalPrice)}</td>
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
              </table>
            </div>

            {/* ปรับแก้ #7: สรุปยอด VAT / ส่วนลด / หัก ณ ที่จ่าย ของทั้งเอกสาร — สไตล์ใบเสร็จ แยกกลุ่มด้วยเส้นคั่น */}
            {items.length > 0 && (
              <div className="px-7 py-5 border-t border-gray-100 flex justify-end">
                <div className="w-full max-w-sm rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 space-y-1.5 text-sm">
                    <SummaryRow label={sd.summaryAmount} value={totals.totalPrice} />
                    <SummaryRow label={sd.summaryDiscount} value={totals.discountAmount} />
                  </div>
                  <div className="px-5 py-3 border-t border-gray-200 bg-white/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{sd.summaryNetAmount}</span>
                    <span className="tabular-nums font-bold text-gray-900">{fmtNumber(totals.netAmount)}</span>
                  </div>
                  <div className="px-5 py-4 border-t border-gray-200 space-y-1.5 text-sm">
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-gray-500">{sd.fieldVatRate}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" value={vatRate} onChange={e => { setVatRate(e.target.value); markDirty() }}
                          disabled={readOnly} min={0} step="any"
                          className={clsx('w-20 px-2 py-1 text-right text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-500', readOnly && 'bg-gray-50 text-gray-500')}
                        />
                        <span className="text-gray-400">%</span>
                      </div>
                    </div>
                    <SummaryRow label={sd.summaryVatAmount} value={totals.vatAmount} />
                    <SummaryRow label={sd.summaryTotalWithVat} value={totals.totalWithVat} bold />
                    <SummaryRow label={sd.summaryWithholdingTax} value={totals.withholdingTaxAmount} />
                  </div>
                  <div className="px-5 py-4 border-t border-gray-200 bg-primary-50/60 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary-800">{sd.summaryGrandTotal}</span>
                    <span className="text-lg font-bold text-primary-700 tabular-nums">{fmtNumber(totals.grandTotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button type="button" onClick={() => guardNavigation(() => router.back())} className={cancelBtnCls}>
            {sd.cancel}
          </button>
          {!readOnly && (
            <button type="submit" disabled={saving} className={primaryBtnCls}>
              {saving ? sd.saving : sd.save}
            </button>
          )}
        </div>
      </form>

      {itemModal.open && (
        <ItemModal
          initial={itemModal.editing}
          serviceOptions={serviceOptions}
          itemOptions={itemOptions}
          vatRate={parseFloat(vatRate) || 0}
          onSave={handleItemModalSave}
          onClose={() => setItemModal({ open: false, editing: null })}
        />
      )}

      {jsonModalOpen && doc && (
        <JsonViewerModal data={doc} title={`${t.common.rawJson} — ${doc.documentNo ?? ''}`} onClose={() => setJsonModalOpen(false)} />
      )}

      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}
    </div>
  )
}

function SummaryRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={clsx('text-gray-500', bold && 'font-semibold text-gray-700')}>{label}</span>
      <span className={clsx('tabular-nums', bold ? 'font-bold text-gray-900' : 'text-gray-700')}>
        {fmtNumber(value)}
      </span>
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
