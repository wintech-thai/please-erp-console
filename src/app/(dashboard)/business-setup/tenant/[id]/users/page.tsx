'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { tenantApi } from '@/lib/api/tenant.api'
import type { MerchantItem, OrgUserItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, Plus, Copy, Check, Ban, CheckCircle, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

function processRegistrationUrl(raw: string): string {
  if (typeof window === 'undefined') return raw
  const erpDomain = window.location.hostname
  return raw.replace('<REGISTER_SERVICE_DOMAIN>', erpDomain)
}

function StatusBadge({ status }: { status?: string | null }) {
  const lower = status?.toLowerCase()
  const cfg =
    lower === 'active'
      ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
      : lower === 'pending'
        ? { bg: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400' }
        : { bg: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', cfg.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {status ?? 'Unknown'}
    </span>
  )
}

function SectionHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900">
        <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
        {children}
      </h2>
      {action}
    </div>
  )
}

function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex-shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? copiedLabel : label}
    </button>
  )
}

function ConfirmDialog({ title, onConfirm, onCancel, cancelLabel, confirmLabel }: {
  title: string; onConfirm: () => void; onCancel: () => void
  cancelLabel: string; confirmLabel: string
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}>
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-7">{title}</h3>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors uppercase">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function TenantUsersContent() {
  const { t } = useLang()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [tenant, setTenant] = useState<MerchantItem | null>(null)
  const [users, setUsers] = useState<OrgUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteErrors, setInviteErrors] = useState<{ username?: string; email?: string }>({})
  const [inviting, setInviting] = useState(false)
  const [registrationUrl, setRegistrationUrl] = useState<string | null>(null)

  // Confirm dialog
  const [confirm, setConfirm] = useState<{ title: string; onConfirm: () => void } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const tenantRes = await tenantApi.getTenantById(id)
      const raw = tenantRes.data
      const m: MerchantItem = (raw as { merchant?: MerchantItem }).merchant ?? (raw as unknown as MerchantItem)
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
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  const refreshUsers = async (code: string) => {
    const res = await tenantApi.getOrgUsers(code)
    const data = res.data
    setUsers(Array.isArray(data) ? data : (data?.users ?? []))
  }

  const handleToggleUser = (user: OrgUserItem) => {
    const isActive = user.userStatus?.toLowerCase() === 'active'
    setConfirm({
      title: isActive ? t.tenant.confirmDisableUser : t.tenant.confirmEnableUser,
      onConfirm: async () => {
        setConfirm(null)
        try {
          if (!tenant?.code) return
          if (isActive) {
            await tenantApi.disableOrgUser(tenant.code, user.orgUserId)
            toast.success(t.tenant.userDisabledSuccess)
          } else {
            await tenantApi.enableOrgUser(tenant.code, user.orgUserId)
            toast.success(t.tenant.userEnabledSuccess)
          }
          await refreshUsers(tenant.code)
        } catch {
          toast.error(t.tenant.failedToToggleUser)
        }
      },
    })
  }

  const handleDeleteUser = (user: OrgUserItem) => {
    setConfirm({
      title: t.tenant.confirmDeleteUser,
      onConfirm: async () => {
        setConfirm(null)
        try {
          if (!tenant?.code) return
          await tenantApi.deleteOrgUser(tenant.code, user.orgUserId)
          toast.success(t.tenant.deleteUserSuccess)
          await refreshUsers(tenant.code)
        } catch {
          toast.error(t.tenant.failedToDeleteUser)
        }
      },
    })
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: { username?: string; email?: string } = {}
    if (!inviteUsername.trim()) errs.username = t.tenant.inviteUsernameRequired
    if (!inviteEmail.trim()) errs.email = t.tenant.inviteEmailRequired
    setInviteErrors(errs)
    if (Object.keys(errs).length) return

    setInviting(true)
    try {
      const res = await tenantApi.inviteOrgUser(tenant!.code!, {
        UserName: inviteUsername.trim(),
        UserEmail: inviteEmail.trim(),
      })
      const data = res.data as Record<string, unknown>
      const rawUrl = (data?.registrationUrl ?? data?.RegistrationUrl ?? '') as string
      setRegistrationUrl(rawUrl ? processRegistrationUrl(rawUrl) : rawUrl)
      toast.success(t.tenant.invitedSuccess)
    } catch {
      toast.error(t.tenant.failedToInvite)
    } finally {
      setInviting(false)
    }
  }

  const closeInviteModal = () => {
    setShowInviteModal(false)
    setInviteUsername('')
    setInviteEmail('')
    setInviteErrors({})
    setRegistrationUrl(null)
    if (tenant?.code) refreshUsers(tenant.code).catch(() => {})
  }

  const formatDate = (d?: string | null) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
    catch { return d }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="w-6 h-6 animate-spin mr-2 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {t.admin.loading}
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
          cancelLabel={t.admin.cancel}
          confirmLabel={t.admin.yes}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">{t.tenant.inviteModalTitle}</h3>
            </div>

            {registrationUrl ? (
              <div className="px-6 py-5">
                <p className="text-sm font-semibold text-gray-700 mb-1">{t.tenant.inviteLinkLabel}</p>
                <p className="text-xs text-gray-500 mb-3">{t.tenant.inviteLinkDesc}</p>
                <textarea
                  readOnly
                  value={registrationUrl}
                  rows={6}
                  className="w-full px-3 py-2.5 text-xs font-mono border border-gray-200 rounded-lg bg-gray-50 resize-none focus:outline-none"
                />
                <div className="flex justify-end gap-3 mt-4">
                  <CopyButton text={registrationUrl} label={t.tenant.inviteLinkCopy} copiedLabel={t.tenant.inviteLinkCopied} />
                  <button onClick={closeInviteModal} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
                    {t.tenant.inviteDone}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="px-6 py-5">
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      {t.tenant.colUsername} <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={inviteUsername}
                      onChange={e => { setInviteUsername(e.target.value); setInviteErrors(p => ({ ...p, username: '' })) }}
                      placeholder={t.tenant.inviteUsernamePlaceholder}
                      className={clsx('w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent',
                        inviteErrors.username ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500')}
                      autoFocus
                    />
                    {inviteErrors.username && <p className="text-red-500 text-xs mt-1">{inviteErrors.username}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      {t.tenant.colUserEmail} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => { setInviteEmail(e.target.value); setInviteErrors(p => ({ ...p, email: '' })) }}
                      placeholder={t.tenant.inviteEmailPlaceholder}
                      className={clsx('w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent',
                        inviteErrors.email ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500')}
                    />
                    {inviteErrors.email && <p className="text-red-500 text-xs mt-1">{inviteErrors.email}</p>}
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                  <button type="button" onClick={closeInviteModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    {t.admin.cancel}
                  </button>
                  <button type="submit" disabled={inviting} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-colors">
                    {inviting && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                    {t.tenant.inviteModalTitle}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/business-setup/tenant')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.tenant.usersTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenant ? `${tenant.name || tenant.code}` : id}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

        {/* Tenant info card */}
        {tenant && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{t.tenant.tenantInfoSection}</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
              <InfoField label={t.tenant.fieldOrgId} value={tenant.code} />
              <InfoField label={t.tenant.fieldName} value={tenant.name} />
              <InfoField label={t.tenant.fieldEmail} value={tenant.contactEmail} />
              <InfoField label={t.tenant.fieldPhone} value={tenant.contactPhone} />
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t.admin.tags}</p>
                <div className="flex flex-wrap gap-1">
                  {parseCsv(tenant.tags).length
                    ? parseCsv(tenant.tags).map(tag => <TagBadge key={tag}>{tag}</TagBadge>)
                    : <span className="text-sm text-gray-400">—</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t.tenant.colStatus}</p>
                <TenantStatusBadge status={tenant.status || ''} />
              </div>
            </div>
          </div>
        )}

        {/* Users section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader
            action={
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t.tenant.inviteUser}
              </button>
            }
          >
            {t.tenant.usersTitle}
          </SectionHeader>

          {users.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{t.tenant.noUsersFound}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0 min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50">
                    {[t.tenant.colUsername, t.tenant.colUserEmail, t.admin.tags, t.tenant.colRole, t.tenant.colInitialUser, t.tenant.colCreated, t.tenant.colUserStatus, t.tenant.colAction].map((col, i) => (
                      <th key={col} className={clsx('px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap', i === 0 && 'rounded-tl-xl')}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => {
                    const isActive = user.userStatus?.toLowerCase() === 'active'
                    const isPending = user.userStatus?.toLowerCase() === 'pending'
                    const displayEmail = user.userEmail ?? user.tmpUserEmail
                    const isHighlighted = selectedUserId === user.orgUserId
                    return (
                      <tr
                        key={user.orgUserId}
                        onClick={() => setSelectedUserId(prev => prev === user.orgUserId ? null : user.orgUserId)}
                        className={clsx(
                          'cursor-pointer transition-colors',
                          isHighlighted ? 'bg-primary-100' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                        )}
                      >
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm font-semibold text-gray-900">{user.userName ?? '—'}</td>
                        <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap">{displayEmail ?? '—'}</td>
                        <td className="px-4 py-3 border-b border-gray-100">
                          {user.tags
                            ? user.tags.split(',').map(tag => (
                                <span key={tag} className="inline-flex mr-1 mb-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium">{tag.trim()}</span>
                              ))
                            : <span className="text-sm text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                          {user.rolesList
                            ? <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-[10px] font-bold rounded-full uppercase">{user.rolesList}</span>
                            : <span className="text-sm text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                          {user.isOrgInitialUser === 'YES'
                            ? <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">YES</span>
                            : <span className="text-sm text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.createdDate ?? user.invitedDate)}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                          <StatusBadge status={user.userStatus} />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          {isPending ? (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ring-1 transition-colors text-red-600 bg-red-50 ring-red-200 hover:bg-red-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {t.tenant.deleteUser}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleUser(user)}
                              className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ring-1 transition-colors',
                                isActive
                                  ? 'text-red-600 bg-red-50 ring-red-200 hover:bg-red-100'
                                  : 'text-emerald-600 bg-emerald-50 ring-emerald-200 hover:bg-emerald-100'
                              )}
                            >
                              {isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              {isActive ? t.tenant.disableUser : t.tenant.enableUser}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-sm text-gray-900">{value || '—'}</p>
    </div>
  )
}

function TenantStatusBadge({ status }: { status: string }) {
  const key = status?.toLowerCase()
  const map: Record<string, { label: string; cls: string }> = {
    active:   { label: 'Active',   cls: 'bg-emerald-50 text-emerald-700' },
    disabled: { label: 'Disabled', cls: 'bg-gray-100 text-gray-500' },
    pending:  { label: 'Pending',  cls: 'bg-amber-50 text-amber-600' },
  }
  const cfg = map[key] ?? { label: status || '—', cls: 'bg-gray-100 text-gray-500' }
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

function TagBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-primary-50 text-primary-700 rounded-md">{children}</span>
}

function parseCsv(value: string | null | undefined): string[] {
  if (!value) return []
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

export default function TenantUsersPage() {
  return (
    <Suspense>
      <TenantUsersContent />
    </Suspense>
  )
}
