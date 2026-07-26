'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { tenantApi } from '@/lib/api/tenant.api'
import type { MerchantItem, OrgUserItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, Users, X, UserPlus } from 'lucide-react'
import clsx from 'clsx'
import { useLang, Translations } from '@/context/LanguageContext'

function TenantUsersContent() {
  const { t } = useLang()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [tenant, setTenant] = useState<MerchantItem | null>(null)
  const [users, setUsers] = useState<OrgUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const tenantRes = await tenantApi.getTenantById(id)
      const raw = tenantRes.data
      const m: MerchantItem = (raw as { merchant?: MerchantItem }).merchant ?? (raw as MerchantItem)
      setTenant(m)

      if (m.code) {
        const usersRes = await tenantApi.getOrgUsers(m.code)
        const rawUsers = usersRes.data
        setUsers(Array.isArray(rawUsers) ? rawUsers : (rawUsers?.users ?? []))
      }
    } catch {
      toast.error(t.tenant.failedToLoadUsers)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id])

  const handleEnable = async (user: OrgUserItem) => {
    if (!tenant?.code) return
    try {
      await tenantApi.enableOrgUser(tenant.code, user.orgUserId)
      toast.success(t.tenant.userEnabledSuccess)
      loadData()
    } catch {
      toast.error(t.tenant.failedToEnable)
    }
  }

  const handleDisable = async (user: OrgUserItem) => {
    if (!tenant?.code) return
    try {
      await tenantApi.disableOrgUser(tenant.code, user.orgUserId)
      toast.success(t.tenant.userDisabledSuccess)
      loadData()
    } catch {
      toast.error(t.tenant.failedToDisable)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/business-setup/tenant')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.tenant.usersTitle}</h1>
          <p className="text-base text-gray-500 mt-0.5">
            {tenant ? `${tenant.name || tenant.code}` : id}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">{t.tenant.usersSubtitle}</p>
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {t.tenant.inviteUser}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1 min-h-0">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.tenant.colUsername}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.tenant.colUserEmail}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.tags}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.tenant.colInvitedDate}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.tenant.colUserStatus}</th>
                <th className="w-14 px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.tenant.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><LoadingRow label={t.admin.loading} /></td></tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <EmptyRow
                      icon={<Users className="w-7 h-7 text-gray-400" />}
                      title={t.tenant.noUsersFound}
                      subtitle={t.tenant.noUsersSubtitle}
                    />
                  </td>
                </tr>
              ) : (
                users.map(user => {
                  const isActive = user.userStatus?.toLowerCase() === 'active'
                  const tagList = parseCsv(user.tags)
                  return (
                    <tr key={user.orgUserId} className="border-l-[3px] border-l-transparent hover:bg-gray-50/50 transition-all">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{user.userName || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{user.userEmail || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {tagList.length
                            ? tagList.map(tag => <TagBadge key={tag}>{tag}</TagBadge>)
                            : <span className="text-sm text-gray-400">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.invitedDate ? new Date(user.invitedDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <UserStatusBadge status={user.userStatus || ''} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <UserRowActions
                          isActive={isActive}
                          onEnable={() => handleEnable(user)}
                          onDisable={() => handleDisable(user)}
                          enableLabel={t.tenant.enableUser}
                          disableLabel={t.tenant.disableUser}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {inviteOpen && tenant?.code && (
        <InviteModal
          orgCustomId={tenant.code}
          onClose={() => setInviteOpen(false)}
          onSuccess={() => { setInviteOpen(false); loadData() }}
          t={t}
        />
      )}
    </div>
  )
}

function InviteModal({ orgCustomId, onClose, onSuccess, t }: {
  orgCustomId: string
  onClose: () => void
  onSuccess: () => void
  t: Translations
}) {
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userName.trim() || !userEmail.trim()) {
      toast.error(t.tenant.usernameAndEmailRequired)
      return
    }
    setSaving(true)
    try {
      await tenantApi.inviteOrgUser(orgCustomId, {
        UserName: userName.trim(),
        UserEmail: userEmail.trim(),
      })
      toast.success(t.tenant.invitedSuccess)
      onSuccess()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.tenant.failedToInvite)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-700)) 40%, rgb(var(--color-primary-500)) 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-bold text-white">{t.tenant.inviteUser}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              {t.tenant.colUsername} <span className="text-red-500">*</span>
            </label>
            <input
              value={userName}
              onChange={e => setUserName(e.target.value)}
              placeholder={t.tenant.inviteUsernamePlaceholder}
              className={inputCls}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              {t.tenant.colUserEmail} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={e => setUserEmail(e.target.value)}
              placeholder={t.tenant.inviteEmailPlaceholder}
              className={inputCls}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className={clsx(cancelBtnCls, 'flex-1')}>
              {t.admin.cancel}
            </button>
            <button type="submit" disabled={saving} className={clsx(primaryBtnCls, 'flex-1 justify-center')}>
              {saving ? <><Spinner />{t.admin.saving}</> : t.tenant.inviteUser}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UserRowActions({ isActive, onEnable, onDisable, enableLabel, disableLabel }: {
  isActive: boolean
  onEnable: () => void
  onDisable: () => void
  enableLabel: string
  disableLabel: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex justify-center">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM18 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
          <button
            onClick={() => { onDisable(); setOpen(false) }}
            disabled={!isActive}
            className={clsx('w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors',
              !isActive ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50')}
          >
            {disableLabel}
          </button>
          <button
            onClick={() => { onEnable(); setOpen(false) }}
            disabled={isActive}
            className={clsx('w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors',
              isActive ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50')}
          >
            {enableLabel}
          </button>
        </div>
      )}
    </div>
  )
}

function parseCsv(value: string | null | undefined): string[] {
  if (!value) return []
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

function TagBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-primary-50 text-primary-700 rounded-md">{children}</span>
}

function UserStatusBadge({ status }: { status: string }) {
  const key = status?.toLowerCase()
  const map: Record<string, { label: string; cls: string }> = {
    active:   { label: 'Active',   cls: 'text-emerald-600' },
    disabled: { label: 'Disabled', cls: 'text-gray-400' },
    pending:  { label: 'Pending',  cls: 'text-amber-500' },
  }
  const cfg = map[key] ?? { label: status || '—', cls: 'text-gray-500' }
  return <span className={clsx('text-sm font-medium', cfg.cls)}>{cfg.label}</span>
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-gray-400">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  )
}

function EmptyRow({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <>
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">{icon}</div>
      <p className="text-base font-medium text-gray-500">{title}</p>
      <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
    </>
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

export default function TenantUsersPage() {
  return (
    <Suspense>
      <TenantUsersContent />
    </Suspense>
  )
}
