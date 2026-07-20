'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { userApi } from '@/lib/api/user.api'
import { customRoleApi } from '@/lib/api/custom-role.api'
import type { InviteUserWithLinkPayload, CustomRoleItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, X, Check, Copy } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'

interface SystemRole {
  id: string
  name: string
  description?: string
}

interface InviteResult {
  registrationUrl: string | null
  userName: string
  userEmail: string
  newId: string | null
}

export default function InviteUserPage() {
  const { t } = useLang()
  const router = useRouter()

  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [customRoleId, setCustomRoleId] = useState('')
  const [customRoles, setCustomRoles] = useState<CustomRoleItem[]>([])
  const [availableRoles, setAvailableRoles] = useState<SystemRole[]>([])
  const [selectedRoles, setSelectedRoles] = useState<SystemRole[]>([])
  const [availableChecked, setAvailableChecked] = useState<Set<string>>(new Set())
  const [selectedChecked, setSelectedChecked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  useEffect(() => {
    customRoleApi.getCustomRoles({ limit: 100 })
      .then(res => {
        const raw = res.data
        setCustomRoles(Array.isArray(raw) ? raw : (raw?.customRoles ?? []))
      })
      .catch(() => {})

    userApi.getRoles()
      .then(res => {
        const raw = res.data
        const arr = (Array.isArray(raw) ? raw : (raw?.roles ?? [])) as { roleId: string; roleName: string; roleDescription?: string }[]
        setAvailableRoles(arr.map(r => ({ id: r.roleId, name: r.roleName, description: r.roleDescription }))
          .filter(r => r.id && r.name && r.id !== 'string' && r.name !== 'string'))
      })
      .catch(() => {})
  }, [])

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const t = tagInput.trim()
      if (!tags.includes(t)) setTags(prev => [...prev, t])
      setTagInput('')
    }
  }

  const toggleAvailable = (id: string) =>
    setAvailableChecked(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const toggleSelected = (id: string) =>
    setSelectedChecked(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const moveToSelected = () => {
    const moving = availableRoles.filter(r => availableChecked.has(r.id))
    setSelectedRoles(prev => [...prev, ...moving])
    setAvailableRoles(prev => prev.filter(r => !availableChecked.has(r.id)))
    setAvailableChecked(new Set())
  }

  const moveToAvailable = () => {
    const moving = selectedRoles.filter(r => selectedChecked.has(r.id))
    setAvailableRoles(prev => [...prev, ...moving])
    setSelectedRoles(prev => prev.filter(r => !selectedChecked.has(r.id)))
    setSelectedChecked(new Set())
  }

  const processRegistrationUrl = (url: string): string => {
    if (!url) return url
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
    if (apiUrl && url.startsWith(apiUrl)) {
      return window.location.origin + url.slice(apiUrl.length)
    }
    try {
      const parsed = new URL(url)
      const current = new URL(window.location.href)
      if (parsed.host !== current.host) {
        parsed.host = current.host
        parsed.protocol = current.protocol
        return parsed.toString()
      }
      return url
    } catch {
      // URL has invalid/placeholder domain (e.g. <REGISTER_SERVICE_DOMAIN>)
      // Extract path+query and prepend current origin
      const pathMatch = url.match(/^https?:\/\/[^/]+(\/.*)?$/)
      if (pathMatch) return window.location.origin + (pathMatch[1] ?? '')
    }
    return url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userName.trim() || !userEmail.trim()) {
      toast.error(t.users.usernameRequired)
      return
    }
    setSaving(true)
    try {
      const pendingTag = tagInput.trim()
      const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags
      const payload: InviteUserWithLinkPayload = {
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        tmpUserEmail: userEmail.trim(),
        customRoleId: customRoleId || undefined,
        Roles: selectedRoles.length ? selectedRoles.map(r => r.name) : undefined,
        tags: finalTags.length ? finalTags.join(',') : undefined,
      }
      const res = await userApi.inviteUserWithLink(payload)
      const data = res.data as Record<string, unknown>
      const adminUser = data?.adminUser as Record<string, unknown> | undefined
      const newId =
        adminUser?.adminUserId as string ??
        (data?.user as Record<string, unknown>)?.adminUserId as string ??
        data?.adminUserId as string ??
        null
      const rawUrl =
        data?.inviteLink as string ??
        data?.registrationUrl as string ??
        adminUser?.registrationUrl as string ??
        adminUser?.inviteLink as string ??
        null

      if (newId && (selectedRoles.length > 0 || customRoleId || finalTags.length > 0)) {
        await userApi.updateUserById(newId, {
          customRoleId: customRoleId || undefined,
          CustomRoleId: customRoleId || undefined,
          Roles: selectedRoles.length ? selectedRoles.map(r => r.name) : undefined,
          tags: finalTags.length ? finalTags.join(',') : undefined,
        }).catch(() => {})
      }

      setIsDirty(false)
      toast.success(t.users.invitedSuccess)

      setInviteResult({
        registrationUrl: rawUrl ? processRegistrationUrl(rawUrl) : null,
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        newId,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.users.failedToInvite
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = () => {
    if (!inviteResult?.registrationUrl) return
    navigator.clipboard.writeText(inviteResult.registrationUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDone = () => {
    const id = inviteResult?.newId
    router.push(id ? `/administrator/users?highlight=${id}` : '/administrator/users')
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">

      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}

      {/* Success modal */}
      {inviteResult && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div
              className="flex flex-col items-center text-center px-8 pt-10 pb-6"
              style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-700)) 40%, rgb(var(--color-primary-500)) 100%)' }}
            >
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-5">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{t.users.inviteSuccessTitle}</h2>
              <p className="text-sm text-orange-100 mb-1">
                <span className="text-white font-medium">{inviteResult.userName}</span>
                {' '}·{' '}
                <span className="text-orange-200">{inviteResult.userEmail}</span>
              </p>
              <p className="text-xs text-orange-200 mt-1">
                {t.users.inviteSuccessSubtitle}
              </p>
            </div>

            <div className="px-8 py-7">
              {inviteResult.registrationUrl ? (
                <>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {t.users.registrationLink}
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 rounded-xl border border-orange-200 mb-6">
                    <span className="flex-1 text-sm text-primary-800 font-mono break-all select-all">
                      {inviteResult.registrationUrl}
                    </span>
                    <button
                      onClick={handleCopy}
                      className={clsx(
                        'flex-shrink-0 p-1.5 rounded-lg transition-colors',
                        copied ? 'text-primary-600' : 'text-gray-400 hover:text-primary-600 hover:bg-orange-100'
                      )}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-500 text-center mb-6">
                  {t.users.noRegistrationLink}
                </p>
              )}
              <button
                onClick={handleDone}
                className="w-full py-3 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
              >
                {t.users.doneAndReturn}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push('/administrator/users'))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.users.createTitle}</h1>
          <p className="text-base text-gray-500 mt-0.5">{t.users.createSubtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">
        {/* User Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{t.users.userInfoSection}</SectionHeader>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <FormField label={t.users.fieldUsername} required>
              <input
                value={userName}
                onChange={e => { setUserName(e.target.value); setIsDirty(true) }}
                placeholder={t.users.fieldUsernamePlaceholder}
                className={inputCls}
              />
            </FormField>
            <FormField label={t.users.fieldEmail} required>
              <input
                type="email"
                value={userEmail}
                onChange={e => { setUserEmail(e.target.value); setIsDirty(true) }}
                placeholder={t.users.fieldEmailPlaceholder}
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

        {/* Roles & Permissions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{t.admin.rolesAndPermissions}</SectionHeader>

          <div className="mb-5 max-w-sm">
            <FormField label={t.admin.customRoleOptional}>
              <select value={customRoleId} onChange={e => setCustomRoleId(e.target.value)} className={inputCls}>
                <option value="">{t.admin.selectCustomRole}</option>
                {customRoles.map(r => <option key={r.roleId} value={r.roleId}>{r.roleName}</option>)}
              </select>
            </FormField>
          </div>

          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">{t.admin.systemRoles}</label>
          <div className="grid grid-cols-[1fr_48px_1fr] gap-2 items-start">
            <RolePanel
              title={t.admin.availableRoles}
              roles={availableRoles}
              checked={availableChecked}
              onToggle={toggleAvailable}
              emptyText={t.admin.noRolesAvailable}
              countColor="bg-gray-400"
            />

            <div className="flex flex-col gap-2 pt-12 items-center">
              <button
                type="button"
                onClick={moveToSelected}
                disabled={availableChecked.size === 0}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
              <button
                type="button"
                onClick={moveToAvailable}
                disabled={selectedChecked.size === 0}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <RolePanel
              title={t.admin.selectedRoles}
              roles={selectedRoles}
              checked={selectedChecked}
              onToggle={toggleSelected}
              emptyText={t.admin.noRolesSelected}
              countColor="bg-primary-500"
            />
          </div>
        </div>

        </div>
        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button type="button" onClick={() => guardNavigation(() => router.push('/administrator/users'))} className={cancelBtnCls}>
            {t.admin.cancel}
          </button>
          <button type="submit" disabled={saving} className={primaryBtnCls}>
            {saving ? <><Spinner /> {t.admin.saving}</> : t.admin.save}
          </button>
        </div>
      </form>
    </div>
  )
}

function RolePanel({ title, roles, checked, onToggle, emptyText, countColor }: {
  title: string
  roles: SystemRole[]
  checked: Set<string>
  onToggle: (id: string) => void
  emptyText: string
  countColor: string
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{title}</span>
        <span className={clsx('text-xs font-bold text-white rounded-full px-2 py-0.5', countColor)}>{roles.length}</span>
      </div>
      <div className="min-h-48 max-h-64 overflow-y-auto divide-y divide-gray-100">
        {roles.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-10">{emptyText}</p>
        ) : (
          roles.map(role => (
            <label key={role.id} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={checked.has(role.id)}
                onChange={() => onToggle(role.id)}
                className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="text-xs font-bold text-gray-900">{role.name}</p>
                {role.description && <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>}
              </div>
            </label>
          ))
        )}
      </div>
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
    <svg className="w-4 h-4 animate-spin inline" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

const inputCls = 'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white'
const cancelBtnCls = 'px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'
const primaryBtnCls = 'flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors'
