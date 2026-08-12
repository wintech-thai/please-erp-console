'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, X } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'
import { masterRefApi, type MasterRefItem } from '@/lib/api/master-ref.api'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'

const REF_TYPE_LABEL_MAP: Record<string, 'locationType' | 'itemType' | 'itemUnit'> = {
  LocationType: 'locationType',
  ItemType: 'itemType',
  ItemUnit: 'itemUnit',
}

export default function UpdateMasterDataPage() {
  const { t } = useLang()
  const md = t.masterData
  const router = useRouter()
  const params = useParams<{ refType: string; id: string }>()
  const refType = params.refType ?? ''
  const itemId = params.id ?? ''
  const labelKey = REF_TYPE_LABEL_MAP[refType]
  const refTypeLabel = labelKey ? md[labelKey] : refType
  const listPath = `/business/master-data?type=${refType}`

  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)
  const markDirty = () => { if (!isDirty) setIsDirty(true) }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await masterRefApi.getRefById(itemId)
        const raw = res.data as unknown
        const item: MasterRefItem = (raw as { masterRef?: MasterRefItem })?.masterRef ?? (raw as MasterRefItem)
        if (!item?.id) throw new Error(md.loadFailed)
        setCode(item.code ?? '')
        setDescription(item.description ?? '')
        setTags(item.tags ? item.tags.split(',').map(s => s.trim()).filter(Boolean) : [])
        setLoading(false)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : md.loadFailed)
        router.push(listPath)
      }
    }
    load()
  }, [itemId])

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const val = tagInput.trim()
      if (!tags.includes(val)) { setTags(prev => [...prev, val]); markDirty() }
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => { setTags(prev => prev.filter(t => t !== tag)); markDirty() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await masterRefApi.updateRefById(itemId, { description, tags: tags.join(',') })
      setIsDirty(false)
      toast.success(md.updateSuccess)
      router.push(`${listPath}&highlight=${itemId}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : md.failedToUpdate)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="w-6 h-6 animate-spin mr-2 rounded-full border-2 border-primary-500 border-t-transparent" />
        {t.admin.loading}
      </div>
    )
  }

  const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push(listPath))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{md.editTitle}</h1>
            {code && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">{code}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{refTypeLabel}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto pb-2 flex flex-col">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 max-w-2xl">
              {/* Code — read-only */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">{md.fieldCode}</label>
                <input value={code} readOnly className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">{md.fieldDescription}</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => { setDescription(e.target.value); markDirty() }}
                  placeholder={md.fieldDescPlaceholder}
                  className={inputCls}
                />
              </div>

              {/* Tags */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">{md.fieldTags}</label>
                <div
                  className="w-full min-h-[42px] px-3 py-1.5 flex flex-wrap gap-1.5 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent cursor-text"
                  onClick={() => document.getElementById('master-data-update-tag-input')?.focus()}
                >
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-xs font-semibold">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="master-data-update-tag-input"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? md.tagsPlaceholder : ''}
                    className="flex-1 min-w-28 text-sm bg-transparent outline-none placeholder-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={() => guardNavigation(() => router.push(listPath))}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {md.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-colors"
          >
            {saving ? md.saving : md.save}
          </button>
        </div>
      </form>
    </div>
  )
}
