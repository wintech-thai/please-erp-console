'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { tenantApi } from '@/lib/api/tenant.api'
import type { MerchantItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, X } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'

function parseCsv(value: string | null | undefined): string[] {
  if (!value) return []
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

function TenantUpdateContent() {
  const { t } = useLang()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [tenant, setTenant] = useState<MerchantItem | null>(null)
  const [name, setName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  const [initName, setInitName] = useState('')
  const [initEmail, setInitEmail] = useState('')
  const [initPhone, setInitPhone] = useState('')
  const [initTags, setInitTags] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await tenantApi.getTenantById(id)
        const raw = res.data
        const m: MerchantItem = (raw as { merchant?: MerchantItem }).merchant ?? (raw as unknown as MerchantItem)
        setTenant(m)
        const n = m.name ?? ''
        const e = m.contactEmail ?? ''
        const p = m.contactPhone ?? ''
        const tg = parseCsv(m.tags)
        setName(n); setInitName(n)
        setContactEmail(e); setInitEmail(e)
        setContactPhone(p); setInitPhone(p)
        setTags(tg); setInitTags(tg)
      } catch {
        toast.error(t.tenant.failedToLoadTenant)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim()
      if (!tags.includes(tag)) { setTags(prev => [...prev, tag]); setIsDirty(true) }
      setTagInput('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pendingTag = tagInput.trim()
    const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags

    const noChanges =
      name.trim() === initName &&
      contactEmail.trim() === initEmail &&
      contactPhone.trim() === initPhone &&
      finalTags.join(',') === initTags.join(',')

    if (noChanges) {
      router.push('/business-setup/tenant')
      return
    }

    setSaving(true)
    try {
      await tenantApi.updateTenantById(id, {
        Code: tenant?.code || undefined,
        Name: name.trim() || undefined,
        ContactEmail: contactEmail.trim() || undefined,
        ContactPhone: contactPhone.trim() || undefined,
        Tags: finalTags.length ? finalTags.join(',') : '',
      })
      toast.success(t.tenant.updatedSuccess)
      setIsDirty(false)
      router.push('/business-setup/tenant')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.tenant.failedToUpdate)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-gray-400">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">{t.admin.loading}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}

      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push('/business-setup/tenant'))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.tenant.editTitle}</h1>
          <p className="text-base text-gray-500 mt-0.5">{tenant?.code || id}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{t.tenant.tenantInfoSection}</SectionHeader>

            {/* Read-only org ID */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                {t.tenant.fieldOrgId}
              </label>
              <div className="px-4 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-500">
                {tenant?.code || '—'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FormField label={t.tenant.fieldName} required>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setIsDirty(true) }}
                  placeholder={t.tenant.fieldNamePlaceholder}
                  className={inputCls}
                />
              </FormField>
              <FormField label={t.tenant.fieldEmail}>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => { setContactEmail(e.target.value); setIsDirty(true) }}
                  placeholder={t.tenant.fieldEmailPlaceholder}
                  className={inputCls}
                />
              </FormField>
              <FormField label={t.tenant.fieldPhone}>
                <input
                  value={contactPhone}
                  onChange={e => { setContactPhone(e.target.value); setIsDirty(true) }}
                  placeholder={t.tenant.fieldPhonePlaceholder}
                  className={inputCls}
                />
              </FormField>
            </div>

            <FormField label={t.admin.tags}>
              <div className="flex flex-wrap gap-1.5 px-3 py-2 min-h-[42px] border border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-primary-50 text-primary-700 rounded-full">
                    {tag}
                    <button type="button" onClick={() => { setTags(p => p.filter(t => t !== tag)); setIsDirty(true) }}>
                      <X className="w-3 h-3 text-primary-400 hover:text-primary-700" />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? t.admin.typeAndPressEnterToAddTags : ''}
                  className="flex-1 min-w-24 text-sm outline-none bg-transparent"
                />
              </div>
            </FormField>
          </div>
        </div>

        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={() => guardNavigation(() => router.push('/business-setup/tenant'))}
            className={cancelBtnCls}
          >
            {t.admin.cancel}
          </button>
          <button type="submit" disabled={saving} className={primaryBtnCls}>
            {saving ? <><Spinner />{t.admin.saving}</> : t.admin.save}
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

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin inline mr-2" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

const inputCls = 'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white'
const cancelBtnCls = 'px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'
const primaryBtnCls = 'flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors'

export default function TenantUpdatePage() {
  return (
    <Suspense>
      <TenantUpdateContent />
    </Suspense>
  )
}
