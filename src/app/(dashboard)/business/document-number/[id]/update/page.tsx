'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, X } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { documentNumberApi } from '@/lib/api/document-number.api'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'

const RESET_TYPES = ['Monthly', 'Yearly'] as const
const LIST_PATH = '/business/document-number'

export default function UpdateDocumentNumberPage() {
  const { t } = useLang()
  const dn = t.documentNumber
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const itemId = params.id ?? ''

  const [docType, setDocType] = useState('')
  const [format, setFormat] = useState('')
  const [seqDigit, setSeqDigit] = useState(4)
  const [resetType, setResetType] = useState('Monthly')
  const [yearOffset, setYearOffset] = useState(0)
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
        const res = await documentNumberApi.getConfigById(itemId)
        const item = res.data
        if (!item?.id) throw new Error(dn.loadError)
        setDocType(item.documentType ?? '')
        setFormat(item.documentFormat ?? '')
        setSeqDigit(item.seqDigit ?? 4)
        setResetType(item.resetType ?? 'Monthly')
        setYearOffset(item.yearOffset ?? 0)
        setTags(item.tags ? item.tags.split(',').map(s => s.trim()).filter(Boolean) : [])
        setLoading(false)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : dn.loadError)
        router.push(LIST_PATH)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!format) { toast.error(dn.requiredFields); return }
    setSaving(true)
    try {
      const pendingTag = tagInput.trim()
      const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags
      await documentNumberApi.updateConfigById(itemId, {
        documentFormat: format,
        seqDigit,
        resetType,
        yearOffset,
        tags: finalTags.join(','),
      })
      setIsDirty(false)
      toast.success(dn.updateSuccess)
      router.push(`${LIST_PATH}?highlight=${itemId}`)
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || dn.updateError)
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

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push(LIST_PATH))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{dn.editTitle}</h1>
            {docType && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">{docType}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{t.nav.documentNumber}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2">

          {/* Config section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{dn.editTitle}</SectionHeader>

            <div className="grid grid-cols-2 gap-4 mb-5">
              {/* Document Type — read-only */}
              <FormField label={dn.fieldDocType}>
                <input value={docType} readOnly className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
              </FormField>

              <FormField label={dn.fieldFormat}>
                <input
                  type="text"
                  value={format}
                  onChange={e => { setFormat(e.target.value); markDirty() }}
                  placeholder={dn.formatPlaceholder}
                  className={`${inputCls} font-mono`}
                />
                <p className="mt-1 text-xs text-gray-400">
                  {dn.formatHint}{' '}
                  <code className="text-primary-600">${'{yyyy}'}</code>{' '}
                  <code className="text-primary-600">${'{mm}'}</code>{' '}
                  <code className="text-primary-600">${'{seq}'}</code>
                </p>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <FormField label={dn.fieldSeqDigit}>
                <input
                  type="number"
                  min={1} max={10}
                  value={seqDigit}
                  onChange={e => { setSeqDigit(Number(e.target.value)); markDirty() }}
                  className={inputCls}
                />
              </FormField>
              <FormField label={dn.fieldYearOffset}>
                <input
                  type="number"
                  value={yearOffset}
                  onChange={e => { setYearOffset(Number(e.target.value)); markDirty() }}
                  className={inputCls}
                />
              </FormField>
            </div>

            <FormField label={dn.fieldResetType}>
              <div className="flex gap-3">
                {RESET_TYPES.map(rt => (
                  <label key={rt} className={clsx(
                    'px-8 flex items-center justify-center py-2.5 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium',
                    resetType === rt
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}>
                    <input type="radio" className="sr-only" value={rt} checked={resetType === rt} onChange={() => { setResetType(rt); markDirty() }} />
                    {rt === 'Monthly' ? dn.monthly : dn.yearly}
                  </label>
                ))}
              </div>
            </FormField>
          </div>

          {/* Tags section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{dn.fieldTags}</SectionHeader>
            <FormField label={dn.fieldTags}>
              <div
                className="flex flex-wrap gap-1.5 px-3 py-2 min-h-[42px] border border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent cursor-text"
                onClick={() => document.getElementById('doc-number-update-tag-input')?.focus()}
              >
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-primary-50 text-primary-700 rounded-full">
                    {tag}
                    <button type="button" onClick={() => { setTags(p => p.filter(tg => tg !== tag)); markDirty() }}>
                      <X className="w-3 h-3 text-primary-400 hover:text-primary-700" />
                    </button>
                  </span>
                ))}
                <input
                  id="doc-number-update-tag-input"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? dn.tagsPlaceholder : ''}
                  className="flex-1 min-w-24 text-sm outline-none bg-transparent"
                />
              </div>
            </FormField>
          </div>

        </div>

        {/* Action bar */}
        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button type="button" onClick={() => guardNavigation(() => router.push(LIST_PATH))} className={cancelBtnCls}>
            {dn.cancel}
          </button>
          <button type="submit" disabled={saving} className={primaryBtnCls}>
            {saving ? dn.saving : dn.save}
          </button>
        </div>
      </form>
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white'
const cancelBtnCls = 'px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'
const primaryBtnCls = 'flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors'
