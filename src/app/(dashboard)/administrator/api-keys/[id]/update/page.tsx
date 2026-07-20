'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiKeyApi } from '@/lib/api/api-key.api'
import { customRoleApi } from '@/lib/api/custom-role.api'
import { userApi } from '@/lib/api/user.api'
import type { ApiKeyItem, UpdateApiKeyPayload, CustomRoleItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'

interface SystemRole {
  id: string
  name: string
  description?: string
}

export default function UpdateApiKeyPage() {
  const { t } = useLang()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [apiKey, setApiKey] = useState<ApiKeyItem | null>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [customRoleId, setCustomRoleId] = useState('')
  const [customRoles, setCustomRoles] = useState<CustomRoleItem[]>([])
  const [availableRoles, setAvailableRoles] = useState<SystemRole[]>([])
  const [selectedRoles, setSelectedRoles] = useState<SystemRole[]>([])
  const [availableChecked, setAvailableChecked] = useState<Set<string>>(new Set())
  const [selectedChecked, setSelectedChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  useEffect(() => {
    Promise.all([
      apiKeyApi.getApiKeyById(id),
      customRoleApi.getCustomRoles({ limit: 100 }),
      userApi.getRoles().catch(() => ({ data: { roles: [] } })),
    ])
      .then(([keyRes, rolesRes, sysRolesRes]) => {
        const k = keyRes.data.apiKey as any
        setApiKey(k)
        setName(k.keyName ?? '')
        setDesc(k.keyDescription ?? '')

        const customRaw = rolesRes.data
        const loadedRoles: CustomRoleItem[] = Array.isArray(customRaw) ? customRaw : (customRaw?.customRoles ?? [])
        setCustomRoles(loadedRoles)

        const idCandidates = [
          k.customRoleId, k.CustomRoleId,
          k.customRole?.roleId, k.CustomRole?.RoleId,
          k.customRole?.id, k.CustomRole?.Id,
        ].filter(Boolean).map(String)
        let resolvedId = idCandidates.find(id => loadedRoles.find(r => r.roleId === id)) ?? ''
        if (!resolvedId) {
          const nameCandidates = [
            k.customRoleName, k.CustomRoleName,
            k.customRole?.roleName, k.CustomRole?.RoleName,
            k.customRole?.name, k.CustomRole?.Name,
          ].filter(Boolean).map(String)
          for (const name of nameCandidates) {
            const found = loadedRoles.find(r => r.roleName === name)
            if (found) { resolvedId = found.roleId; break }
          }
        }
        setCustomRoleId(resolvedId)

        const rawRoles: { roleId: string; roleName: string; roleDescription?: string }[] =
          Array.isArray(sysRolesRes.data) ? sysRolesRes.data : ((sysRolesRes.data as { roles?: unknown[] })?.roles ?? []) as { roleId: string; roleName: string; roleDescription?: string }[]
        const allRoles: SystemRole[] = rawRoles.map(r => ({ id: r.roleId, name: r.roleName, description: r.roleDescription }))
          .filter(r => r.id && r.name && r.id !== 'string' && r.name !== 'string')

        const rolesFromArray: string[] = Array.isArray(k.roles)
          ? (k.roles as string[]).filter(Boolean)
          : []
        const rolesFromList: string[] = k.rolesList
          ? k.rolesList.split(',').map((r: string) => r.trim()).filter(Boolean)
          : []
        const currentList = rolesFromArray.length ? rolesFromArray : rolesFromList

        const preSelected = allRoles.filter(r =>
          currentList.includes(r.id) || currentList.includes(r.name)
        )
        const preSelectedIds = new Set(preSelected.map(r => r.id))
        setSelectedRoles(preSelected)
        setAvailableRoles(allRoles.filter(r => !preSelectedIds.has(r.id)))
      })
      .catch(() => {
        toast.error(t.apiKeys.failedToLoadKey)
        router.push(`/administrator/api-keys?highlight=${id}`)
      })
      .finally(() => setLoading(false))
  }, [id, router])

  const toggleAvailable = (roleId: string) =>
    setAvailableChecked(prev => { const s = new Set(prev); s.has(roleId) ? s.delete(roleId) : s.add(roleId); return s })

  const toggleSelected = (roleId: string) =>
    setSelectedChecked(prev => { const s = new Set(prev); s.has(roleId) ? s.delete(roleId) : s.add(roleId); return s })

  const moveToSelected = () => {
    const moving = availableRoles.filter(r => availableChecked.has(r.id))
    setSelectedRoles(prev => [...prev, ...moving])
    setAvailableRoles(prev => prev.filter(r => !availableChecked.has(r.id)))
    setAvailableChecked(new Set())
    setIsDirty(true)
  }

  const moveToAvailable = () => {
    const moving = selectedRoles.filter(r => selectedChecked.has(r.id))
    setAvailableRoles(prev => [...prev, ...moving])
    setSelectedRoles(prev => prev.filter(r => !selectedChecked.has(r.id)))
    setSelectedChecked(new Set())
    setIsDirty(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error(t.apiKeys.keyNameRequired); return }
    if (!isDirty) { router.push(`/administrator/api-keys?highlight=${id}`); return }
    setSaving(true)
    try {
      const payload: UpdateApiKeyPayload = {
        keyDescription: desc.trim() || undefined,
        customRoleId: customRoleId || undefined,
        CustomRoleId: customRoleId || undefined,
        Roles: selectedRoles.length ? selectedRoles.map(r => r.name) : undefined,
      }
      await apiKeyApi.updateApiKeyById(id, payload)
      setIsDirty(false)
      toast.success(t.apiKeys.updatedSuccess)
      router.push(`/administrator/api-keys?highlight=${id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.apiKeys.failedToUpdate
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {t.admin.loading}
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push(`/administrator/api-keys?highlight=${id}`))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.apiKeys.editTitle}</h1>
          <p className="text-base text-gray-500 mt-0.5">{t.apiKeys.editSubtitle} &quot;{apiKey?.keyName || id.slice(0, 8)}&quot;</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{t.apiKeys.keyInfoSection}</SectionHeader>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t.apiKeys.fieldKeyName} required>
              <input
                value={name}
                readOnly
                className={clsx(inputCls, 'bg-gray-50 text-gray-500 cursor-not-allowed')}
              />
            </FormField>
            <FormField label={t.apiKeys.fieldDescription}>
              <input
                value={desc}
                onChange={e => { setDesc(e.target.value); setIsDirty(true) }}
                placeholder={t.apiKeys.fieldDescPlaceholder}
                className={inputCls}
              />
            </FormField>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{t.admin.rolesAndPermissions}</SectionHeader>

          <div className="mb-5 max-w-sm">
            <FormField label={t.admin.customRoleOptional}>
              <select value={customRoleId} onChange={e => { setCustomRoleId(e.target.value); setIsDirty(true) }} className={inputCls}>
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
          <button type="button" onClick={() => guardNavigation(() => router.push(`/administrator/api-keys?highlight=${id}`))} className={cancelBtnCls}>
            {t.admin.cancel}
          </button>
          <button type="submit" disabled={saving} className={primaryBtnCls}>
            {saving ? <><Spinner /> {t.admin.saving}</> : t.admin.saveChanges}
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
