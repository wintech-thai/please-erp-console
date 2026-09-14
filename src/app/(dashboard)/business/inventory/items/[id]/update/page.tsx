'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { ChevronLeft, ImagePlus, X } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'
import { inventoryItemApi, type InventoryItemItem } from '@/lib/api/inventory-item.api'
import { useMasterRefOptions } from '@/hooks/useMasterRefOptions'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'

const listPath = '/business/inventory/items'

async function compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function UpdateInventoryItemPage() {
  const { t } = useLang()
  const ii = t.inventoryItem
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const itemId = params.id ?? ''
  const { options: itemTypes } = useMasterRefOptions('ItemType')
  const { options: itemUnits } = useMasterRefOptions('ItemUnit')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [code, setCode] = useState('')
  const [referenceCode, setReferenceCode] = useState('')
  const [nameTh, setNameTh] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [itemType, setItemType] = useState('')
  const [unit, setUnit] = useState('')
  const [itemGroup, setItemGroup] = useState('')
  const [remark, setRemark] = useState('')
  const [minimumQuantity, setMinimumQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [isVatIncluded, setIsVatIncluded] = useState(true)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)
  const markDirty = () => { if (!isDirty) setIsDirty(true) }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await inventoryItemApi.getItemById(itemId)
        const raw = res.data as unknown
        const item: InventoryItemItem = (raw as { inventoryItem?: InventoryItemItem })?.inventoryItem ?? (raw as InventoryItemItem)
        if (!item?.id) throw new Error(ii.loadFailed)
        setCode(item.code ?? '')
        setReferenceCode(item.referenceCode ?? '')
        setNameTh(item.nameTh ?? '')
        setNameEn(item.nameEn ?? '')
        setItemType(item.itemType ?? '')
        setUnit(item.unit ?? '')
        setItemGroup(item.itemGroup ?? '')
        setRemark(item.remark ?? '')
        setMinimumQuantity(item.minimumQuantity != null ? String(item.minimumQuantity) : '')
        setPrice(item.price != null ? String(item.price) : '')
        setIsVatIncluded(item.isVatIncluded ?? true)
        setImagePreview(item.previewUrl ?? null)
        setLoading(false)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : ii.loadFailed)
        router.push(listPath)
      }
    }
    load()
  }, [itemId])

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { toast.error(ii.imageTooLarge); return }
    try {
      const base64 = await compressImage(file)
      setImageBase64(base64)
      setImagePreview(URL.createObjectURL(file))
      markDirty()
    } catch {
      toast.error(ii.imageTooLarge)
    }
  }

  function removeImage() {
    setImageBase64(undefined)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    markDirty()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nameTh || !itemType || !unit) { toast.error(ii.requiredFields); return }

    if (!isDirty) {
      // ไม่มีการเปลี่ยนแปลง -> กลับไปหน้า list เฉยๆ ไม่ต้องยิง API หรือขึ้น toast
      router.push(`${listPath}?highlight=${itemId}`)
      return
    }

    setSaving(true)
    try {
      const res = await inventoryItemApi.updateItemById(itemId, {
        referenceCode: referenceCode || undefined,
        nameTh,
        nameEn: nameEn || undefined,
        itemType,
        unit,
        itemGroup: itemGroup || undefined,
        remark: remark || undefined,
        minimumQuantity: minimumQuantity ? Number(minimumQuantity) : undefined,
        price: price ? Number(price) : undefined,
        isVatIncluded,
        imageBase64,
      })
      toast.success(ii.updateSuccess)
      setIsDirty(false)
      router.push(`${listPath}?highlight=${itemId}`)
    } catch (err) {
      const axiosErr = err as AxiosError
      toast.error(axiosErr.message || ii.failedToUpdate)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-5rem)]">
        <div className="w-7 h-7 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.back())}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{ii.editTitle}</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6 flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label={ii.fieldCode}>
                    <input type="text" value={code} disabled className={inputCls + ' bg-gray-50 text-gray-400 cursor-not-allowed'} />
                  </FormField>
                  <FormField label={ii.fieldReferenceCode}>
                    <input type="text" value={referenceCode} onChange={e => { setReferenceCode(e.target.value); markDirty() }} className={inputCls} />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label={ii.fieldNameTh} required>
                    <input type="text" value={nameTh} onChange={e => { setNameTh(e.target.value); markDirty() }} className={inputCls} />
                  </FormField>
                  <FormField label={ii.fieldNameEn}>
                    <input type="text" value={nameEn} onChange={e => { setNameEn(e.target.value); markDirty() }} className={inputCls} />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label={ii.fieldType} required>
                    <select value={itemType} onChange={e => { setItemType(e.target.value); markDirty() }} className={inputCls}>
                      <option value="">—</option>
                      {itemTypes.map(o => <option key={o.code} value={o.code}>{o.description || o.code}</option>)}
                    </select>
                  </FormField>
                  <FormField label={ii.fieldUnit} required>
                    <select value={unit} onChange={e => { setUnit(e.target.value); markDirty() }} className={inputCls}>
                      <option value="">—</option>
                      {itemUnits.map(o => <option key={o.code} value={o.code}>{o.description || o.code}</option>)}
                    </select>
                  </FormField>
                </div>

                <FormField label={ii.fieldGroup}>
                  <input type="text" value={itemGroup} onChange={e => { setItemGroup(e.target.value); markDirty() }} className={inputCls} />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label={ii.fieldMinimumQuantity}>
                    <input type="number" step="0.01" value={minimumQuantity} onChange={e => { setMinimumQuantity(e.target.value); markDirty() }} className={inputCls} />
                  </FormField>
                  <FormField label={ii.fieldPrice}>
                    <input type="number" step="0.01" value={price} onChange={e => { setPrice(e.target.value); markDirty() }} className={inputCls} />
                  </FormField>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={isVatIncluded} onChange={e => { setIsVatIncluded(e.target.checked); markDirty() }} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4" />
                  {ii.fieldVat}
                </label>

                <FormField label={ii.fieldRemark}>
                  <textarea value={remark} onChange={e => { setRemark(e.target.value); markDirty() }} rows={3} className={inputCls} />
                </FormField>
              </div>

              <div>
                <FormField label={ii.fieldImage}>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl aspect-square flex items-center justify-center relative overflow-hidden bg-gray-50">
                    {imagePreview ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={removeImage} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-gray-400 hover:text-gray-500">
                        <ImagePlus className="w-8 h-8" />
                        <span className="text-xs">{ii.fieldImage}</span>
                      </button>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </FormField>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button type="button" onClick={() => guardNavigation(() => router.back())} className={cancelBtnCls}>
            {ii.cancel}
          </button>
          <button type="submit" disabled={saving} className={primaryBtnCls}>
            {saving ? ii.saving : ii.save}
          </button>
        </div>
      </form>

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
