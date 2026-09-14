'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { ChevronLeft } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'
import { inventoryLocationApi } from '@/lib/api/inventory-location.api'
import { useMasterRefOptions } from '@/hooks/useMasterRefOptions'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'

export default function AddInventoryLocationPage() {
  const { t } = useLang()
  const il = t.inventoryLocation
  const router = useRouter()
  const { options: locationTypes } = useMasterRefOptions('LocationType')

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [locationType, setLocationType] = useState('')
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  function markDirty() { if (!isDirty) setIsDirty(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code || !name || !locationType) { toast.error(il.requiredFields); return }
    setSaving(true)
    try {
      const res = await inventoryLocationApi.addLocation({ code, name, locationType })
      const body = res.data
      toast.success(il.addSuccess)
      setIsDirty(false)
      const newId = body.inventoryLocation?.id
      router.push(newId ? `/business/inventory/locations?highlight=${newId}` : '/business/inventory/locations')
    } catch (err) {
      // axios interceptor แปลง response ที่ status ไม่ใช่ OK ให้กลายเป็น rejected promise
      // โดยเก็บ status ไว้ใน err.code และ description ไว้ใน err.message
      const axiosErr = err as AxiosError
      if (axiosErr.code === 'DUPLICATE') {
        toast.error(axiosErr.message?.toLowerCase().includes('name') ? il.duplicateName : il.duplicateCode)
      } else {
        toast.error(axiosErr.message || il.failedToAdd)
      }
    } finally {
      setSaving(false)
    }
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
        <h1 className="text-2xl font-bold text-gray-900">{il.createTitle}</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6 flex-1">
            <div className="max-w-2xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label={il.fieldCode} required>
                  <input
                    type="text"
                    value={code}
                    onChange={e => { setCode(e.target.value); markDirty() }}
                    placeholder={il.fieldCodePlaceholder}
                    className={inputCls}
                  />
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
const cancelBtnCls = 'px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'
const primaryBtnCls = 'flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors'
