'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { tenantApi } from '@/lib/api/tenant.api'
import { toast } from 'sonner'
import { ChevronLeft, X } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

export default function TenantCreatePage() {
  const { t } = useLang()
  const router = useRouter()

  const [orgCustomId, setOrgCustomId] = useState('')
  const [orgName, setOrgName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim()
      if (!tags.includes(tag)) setTags(prev => [...prev, tag])
      setTagInput('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgCustomId.trim() || !orgName.trim()) {
      toast.error(t.tenant.orgIdRequired)
      return
    }
    setSaving(true)
    try {
      const pendingTag = tagInput.trim()
      const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags
      const res = await tenantApi.addTenant({
        OrgCustomId: orgCustomId.trim(),
        OrgName: orgName.trim(),
        OrgType: 'PLEASE-ERP',
        Tags: finalTags.length ? finalTags.join(',') : undefined,
        Merchant: {
          Code: orgCustomId.trim(),
          Name: orgName.trim(),
          ContactEmail: contactEmail.trim() || undefined,
          ContactPhone: contactPhone.trim() || undefined,
        },
      })
      toast.success(t.tenant.createdSuccess)
      const data = res.data as Record<string, unknown>
      const merchantId =
        (data?.organization as Record<string, unknown>)?.merchantId as string ??
        (data?.merchant as Record<string, unknown>)?.id as string ??
        null
      if (merchantId) {
        sessionStorage.setItem('erp_tenant_highlight', merchantId)
      }
      router.push('/business-setup/tenant')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.tenant.failedToCreate)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/business-setup/tenant')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.tenant.createTitle}</h1>
          <p className="text-base text-gray-500 mt-0.5">{t.tenant.createSubtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{t.tenant.tenantInfoSection}</SectionHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FormField label={t.tenant.fieldOrgId} required>
                <input
                  value={orgCustomId}
                  onChange={e => setOrgCustomId(e.target.value)}
                  placeholder={t.tenant.fieldOrgIdPlaceholder}
                  className={inputCls}
                />
              </FormField>
              <FormField label={t.tenant.fieldName} required>
                <input
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder={t.tenant.fieldNamePlaceholder}
                  className={inputCls}
                />
              </FormField>
              <FormField label={t.tenant.fieldEmail}>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder={t.tenant.fieldEmailPlaceholder}
                  className={inputCls}
                />
              </FormField>
              <FormField label={t.tenant.fieldPhone}>
                <input
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
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
                    <button type="button" onClick={() => setTags(p => p.filter(t => t !== tag))}>
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
            onClick={() => router.push('/business-setup/tenant')}
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
