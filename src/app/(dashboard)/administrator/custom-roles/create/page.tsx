'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { customRoleApi } from '@/lib/api/custom-role.api'
import type { AddCustomRolePayload, ControllerPermissions } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, Search, X } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'

export default function CreateCustomRolePage() {
  const { t } = useLang()
  const router = useRouter()

  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [permGroups, setPermGroups] = useState<ControllerPermissions[]>([])
  const [permSearch, setPermSearch] = useState('')
  const [loadingPerms, setLoadingPerms] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  useEffect(() => {
    customRoleApi.getInitialUserRolePermissions()
      .then(res => setPermGroups(res.data.permissions ?? []))
      .catch(() => toast.error(t.customRoles.failedToLoadPerms))
      .finally(() => setLoadingPerms(false))
  }, [])

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const t = tagInput.trim()
      if (!tags.includes(t)) setTags(prev => [...prev, t])
      setTagInput('')
    }
  }

  const togglePermission = (controllerName: string, apiName: string) => {
    setPermGroups(prev => prev.map(g =>
      g.controllerName !== controllerName ? g : {
        ...g,
        apiPermissions: g.apiPermissions.map(p =>
          p.apiName !== apiName ? p : { ...p, isAllowed: !p.isAllowed }
        ),
      }
    ))
  }

  const toggleController = (controllerName: string, value: boolean) => {
    setPermGroups(prev => prev.map(g =>
      g.controllerName !== controllerName ? g : {
        ...g,
        apiPermissions: g.apiPermissions.map(p => ({ ...p, isAllowed: value })),
      }
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error(t.customRoles.roleNameRequired); return }
    setSaving(true)
    try {
      const pendingTag = tagInput.trim()
      const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags
      const payload: AddCustomRolePayload = {
        roleName: name.trim(),
        roleDescription: desc.trim() || undefined,
        tags: finalTags.length ? finalTags.join(',') : undefined,
        permissions: permGroups,
      }
      const res = await customRoleApi.addCustomRole(payload)
      const newId = (res.data as any)?.customRole?.roleId ?? (res.data as any)?.roleId ?? null
      setIsDirty(false)
      toast.success(t.customRoles.createdSuccess)
      router.push(newId ? `/administrator/custom-roles?highlight=${newId}` : '/administrator/custom-roles')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.customRoles.failedToCreate
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const q = permSearch.toLowerCase()
  const filteredGroups = permGroups
    .map(g => ({
      ...g,
      apiPermissions: q
        ? g.apiPermissions.filter(p => p.apiName.toLowerCase().includes(q))
        : g.apiPermissions,
    }))
    .filter(g => g.apiPermissions.length > 0 || g.controllerName.toLowerCase().includes(q))

  const totalSelected = permGroups.reduce((s, g) => s + g.apiPermissions.filter(p => p.isAllowed).length, 0)
  const totalPerms = permGroups.reduce((s, g) => s + g.apiPermissions.length, 0)

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push('/administrator/custom-roles'))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.customRoles.createTitle}</h1>
          <p className="text-base text-gray-500 mt-0.5">{t.customRoles.createSubtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">
        {/* Role Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{t.customRoles.roleInfoSection}</SectionHeader>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <FormField label={t.customRoles.fieldRoleName} required>
              <input
                value={name}
                onChange={e => { setName(e.target.value); setIsDirty(true) }}
                placeholder={t.customRoles.fieldRoleNamePlaceholder}
                className={inputCls}
              />
            </FormField>
            <FormField label={t.customRoles.fieldDescription} required>
              <input
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder={t.customRoles.fieldDescPlaceholder}
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
                placeholder={tags.length === 0 ? t.customRoles.typeAndPressEnterToAddTag : ''}
                className="flex-1 min-w-24 text-sm outline-none bg-transparent"
              />
            </div>
          </FormField>
        </div>

        {/* Permissions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <div className="flex items-center justify-between mb-5">
            <SectionHeader noMargin>{t.customRoles.permissionsSection}</SectionHeader>
            {totalPerms > 0 && (
              <span className="text-xs text-gray-400">{totalSelected} / {totalPerms} {t.customRoles.selectedCount}</span>
            )}
          </div>

          {/* Search */}
          <div className="relative max-w-sm mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={permSearch}
              onChange={e => setPermSearch(e.target.value)}
              placeholder={t.customRoles.searchPermissions}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            />
          </div>

          {loadingPerms ? (
            <div className="flex items-center gap-2 py-8 text-gray-400">
              <Spinner /> <span className="text-sm">{t.customRoles.loadingPermissions}</span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">{t.customRoles.noPermissionsFound}</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto divide-y divide-gray-100">
              {filteredGroups.map(group => {
                const allChecked = group.apiPermissions.length > 0 && group.apiPermissions.every(p => p.isAllowed)
                const someChecked = group.apiPermissions.some(p => p.isAllowed) && !allChecked
                return (
                  <div key={group.controllerName}>
                    <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={el => { if (el) el.indeterminate = someChecked }}
                        onChange={() => toggleController(group.controllerName, !allChecked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                      />
                      <span className="text-sm font-bold text-gray-800">{group.controllerName}</span>
                    </label>
                    {group.apiPermissions.map(perm => (
                      <label
                        key={perm.apiName}
                        className="flex items-center gap-3 px-4 py-2.5 pl-11 cursor-pointer hover:bg-gray-50 transition-colors border-t border-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={perm.isAllowed}
                          onChange={() => togglePermission(group.controllerName, perm.apiName)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">{perm.apiName}</span>
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        </div>
        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button type="button" onClick={() => guardNavigation(() => router.push('/administrator/custom-roles'))} className={cancelBtnCls}>
            {t.admin.cancel}
          </button>
          <button type="submit" disabled={saving} className={primaryBtnCls}>
            {saving ? <><Spinner /> {t.admin.creating}</> : t.admin.save}
          </button>
        </div>
      </form>
    </div>
  )
}

function SectionHeader({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <h2 className={clsx('flex items-center gap-2.5 text-sm font-bold text-gray-900', !noMargin && 'mb-5')}>
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
