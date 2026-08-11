'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, X } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'
import { masterRefApi } from '@/lib/api/master-ref.api'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'

const REF_TYPE_LABEL_MAP: Record<string, 'locationType' | 'itemType' | 'itemUnit'> = {
  LocationType: 'locationType',
  ItemType: 'itemType',
  ItemUnit: 'itemUnit',
}

export default function AddMasterDataPage() {
  const { t } = useLang()
  const md = t.masterData
  const router = useRouter()
  const params = useParams<{ refType: string }>()
  const refType = params.refType ?? ''
  const labelKey = REF_TYPE_LABEL_MAP[refType]
  const refTypeLabel = labelKey ? md[labelKey] : refType

  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  function markDirty() { if (!isDirty) setIsDirty(true) }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const val = tagInput.trim()
      if (!tags.includes(val)) { setTags(prev => [...prev, val]); markDirty() }
      setTagInput('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code || !description) { toast.error(md.requiredFields); return }
    setSaving(true)
    try {
      const pendingTag = tagInput.trim()
      const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags
      await masterRefApi.addRef({ code, description, refType, tags: finalTags.join(',') })
      toast.success(md.addSuccess)
      setIsDirty(false)
      router.push(`/business/master-data?type=${refType}`)
    } catch {
      toast.error(md.failedToAdd)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.back())}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{md.createTitle}</h1>
          <p className="text-base text-gray-500 mt-0.5">{refTypeLabel}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2">

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6 flex-1">
            <SectionHeader>{refTypeLabel}</SectionHeader>

            <div className="max-w-2xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label={md.fieldCode} required>
                  <input
                    type="text"
                    value={code}
                    onChange={e => { setCode(e.target.value); markDirty() }}
                    placeholder={md.fieldCodePlaceholder}
                    className={inputCls}
                  />
                </FormField>
                <FormField label={md.fieldDescription} required>
                  <input
                    type="text"
                    value={description}
                    onChange={e => { setDescription(e.target.value); markDirty() }}
                    placeholder={md.fieldDescPlaceholder}
                    className={inputCls}
                  />
                </FormField>
              </div>

              <FormField label={md.fieldTags}>
                <div className="flex flex-wrap gap-1.5 px-3 py-2 min-h-[42px] border border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-primary-50 text-primary-700 rounded-full">
                      {tag}
                      <button type="button" onClick={() => setTags(p => p.filter(t => t !== tag))}>
                        <X className="w-3 h-3 text-primary-400 hover:text-primary-700" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? md.tagsPlaceholder : ''}
                    className="flex-1 min-w-24 text-sm outline-none bg-transparent"
                  />
                </div>
              </FormField>
            </div>
          </div>

        </div>

        {/* Action bar */}
        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button type="button" onClick={() => guardNavigation(() => router.back())} className={cancelBtnCls}>
            {md.cancel}
          </button>
          <button type="submit" disabled={saving} className={primaryBtnCls}>
            {saving ? md.saving : md.save}
          </button>
        </div>
      </form>

      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
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
