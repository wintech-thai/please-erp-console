'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import { AxiosError } from 'axios'
import { useLang } from '@/context/LanguageContext'
import { inventoryLocationApi, type InventoryLocationItem } from '@/lib/api/inventory-location.api'
import { useMasterRefOptions } from '@/hooks/useMasterRefOptions'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'

const listPath = '/business/inventory/locations'

export default function UpdateInventoryLocationPage() {
  const { t } = useLang()
  const il = t.inventoryLocation
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const locationId = params.id ?? ''
  const { options: locationTypes } = useMasterRefOptions('LocationType')

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [locationType, setLocationType] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)
  const markDirty = () => { if (!isDirty) setIsDirty(true) }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await inventoryLocationApi.getLocationById(locationId)
        const raw = res.data as unknown
        const item: InventoryLocationItem = (raw as { inventoryLocation?: InventoryLocationItem })?.inventoryLocation ?? (raw as InventoryLocationItem)
        if (!item?.id) throw new Error(il.loadFailed)
        setCode(item.code ?? '')
        setName(item.name ?? '')
        setLocationType(item.locationType ?? '')
        setLoading(false)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : il.loadFailed)
        router.push(listPath)
      }
    }
    load()
  }, [locationId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !locationType) { toast.error(il.requiredFields); return }

    const noChanges = (() => {
      // ไม่มีการเปลี่ยนแปลง -> ไม่ต้องยิง API แค่กลับไปหน้า list เฉยๆ ไม่ต้องขึ้น toast
      return !isDirty
    })()
    if (noChanges) {
      router.push(`${listPath}?highlight=${locationId}`)
      return
    }

    setSaving(true)
    try {
      await inventoryLocationApi.updateLocationById(locationId, { name, locationType })
      toast.success(il.updateSuccess)
      setIsDirty(false)
      router.push(`${listPath}?highlight=${locationId}`)
    } catch (err) {
      const axiosErr = err as AxiosError
      toast.error(axiosErr.message || il.failedToUpdate)
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
        <h1 className="text-2xl font-bold text-gray-900">{il.editTitle}</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6 flex-1">
            <div className="max-w-2xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label={il.fieldCode}>
                  <input type="text" value={code} disabled className={clsxDisabled} />
                </FormField>
                <FormField label={il.fieldName} required>
                  <input
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); markDirty() }}
                    placeholder={il.fieldNamePlaceholder}
                    className={inputCls}
                  />
                </FormField>
              </div>

              <FormField label={il.fieldType} required>
                <select
                  value={locationType}
                  onChange={e => { setLocationType(e.target.value); markDirty() }}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {locationTypes.map(o => <option key={o.code} value={o.code}>{o.description || o.code}</option>)}
                </select>
              </FormField>
            </div>
          </div>
        </div>

        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button type="button" onClick={() => guardNavigation(() => router.back())} className={cancelBtnCls}>
            {il.cancel}
          </button>
          <button type="submit" disabled={saving} className={primaryBtnCls}>
            {saving ? il.saving : il.save}
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
const clsxDisabled = inputCls + ' bg-gray-50 text-gray-400 cursor-not-allowed'
const cancelBtnCls = 'px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'
const primaryBtnCls = 'flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors'
