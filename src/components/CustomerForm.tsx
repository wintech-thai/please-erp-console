'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { ChevronLeft, Plus, Pencil, Trash2, User, MapPin } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { useMasterRefOptions } from '@/hooks/useMasterRefOptions'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { customerApi, type CustomerAddress } from '@/lib/api/customer.api'

type LocalAddress = { localKey: string; id?: string; addressType: string; address: string }

function newLocalKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k${Date.now()}-${Math.random()}`
}

// ─── Address modal ──────────────────────────────────────────────────────────────

function AddressModal({ initial, addressTypeOptions, onSave, onClose }: {
  initial: LocalAddress | null
  addressTypeOptions: { id: string; code: string; description: string }[]
  onSave: (addr: LocalAddress) => void
  onClose: () => void
}) {
  const { t } = useLang()
  const cu = t.customer
  const [addressType, setAddressType] = useState(initial?.addressType || '')
  const [address, setAddress] = useState(initial?.address || '')

  function handleSave() {
    if (!addressType || !address) { toast.error(cu.requiredFields); return }
    onSave({ localKey: initial?.localKey || newLocalKey(), id: initial?.id, addressType, address })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl bg-white overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{cu.addAddressBtn}</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <FormField label={cu.fieldAddressType} required>
            <select value={addressType} onChange={e => setAddressType(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {addressTypeOptions.map(o => <option key={o.id} value={o.id}>{o.description || o.code}</option>)}
            </select>
          </FormField>
          <FormField label={cu.fieldAddress} required>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder={cu.fieldAddressPlaceholder}
              rows={3}
              className={inputCls}
            />
          </FormField>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className={cancelBtnCls}>{cu.cancel}</button>
          <button onClick={handleSave} className={primaryBtnCls}>{cu.save}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main form ───────────────────────────────────────────────────────────────────

interface Props {
  mode: 'add' | 'edit'
  entityId?: string
}

export default function CustomerForm({ mode, entityId }: Props) {
  const { t } = useLang()
  const cu = t.customer
  const router = useRouter()

  const { options: customerTypes } = useMasterRefOptions('CustomerType')
  const { options: customerGroups } = useMasterRefOptions('CustomerGroup')
  const { options: addressTypes } = useMasterRefOptions('AddressType')

  const [loading, setLoading] = useState(mode === 'edit')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [entityCategory, setEntityCategory] = useState('')
  const [customerTypeId, setCustomerTypeId] = useState('')
  const [customerGroupId, setCustomerGroupId] = useState('')
  const [nationalCardId, setNationalCardId] = useState('')
  const [primaryPhone, setPrimaryPhone] = useState('')
  const [primaryEmail, setPrimaryEmail] = useState('')
  const [taxId, setTaxId] = useState('')
  const [creditTermDay, setCreditTermDay] = useState('')
  const [creditAmount, setCreditAmount] = useState('')

  const [addresses, setAddresses] = useState<LocalAddress[]>([])
  const [removedAddressIds, setRemovedAddressIds] = useState<string[]>([])
  const [addressModal, setAddressModal] = useState<{ open: boolean; editing: LocalAddress | null }>({ open: false, editing: null })

  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  function markDirty() { if (!isDirty) setIsDirty(true) }

  useEffect(() => {
    if (mode !== 'edit' || !entityId) return
    setLoading(true)
    customerApi.getCustomerById(entityId)
      .then(res => {
        const d = res.data
        setCode(d.code || '')
        setName(d.name || '')
        setEntityCategory(d.entityCategory ? String(d.entityCategory) : '')
        setCustomerTypeId(d.customerTypeId || '')
        setCustomerGroupId(d.customerGroupId || '')
        setNationalCardId(d.nationalCardId || '')
        setPrimaryPhone(d.primaryPhone || '')
        setPrimaryEmail(d.primaryEmail || '')
        setTaxId(d.taxId || '')
        setCreditTermDay(d.creditTermDay != null ? String(d.creditTermDay) : '')
        setCreditAmount(d.creditAmount != null ? String(d.creditAmount) : '')
        setAddresses((d.addresses || []).map((a: CustomerAddress) => ({
          localKey: newLocalKey(), id: a.id, addressType: a.addressType || '', address: a.address || '',
        })))
      })
      .catch(() => toast.error(cu.loadFailed))
      .finally(() => setLoading(false))
  }, [mode, entityId, cu.loadFailed])

  const customerTypeOptions = useMemo(() => customerTypes, [customerTypes])
  const customerGroupOptions = useMemo(() => customerGroups, [customerGroups])

  function handleAddAddress() { setAddressModal({ open: true, editing: null }) }
  function handleEditAddress(addr: LocalAddress) { setAddressModal({ open: true, editing: addr }) }
  function handleRemoveAddress(addr: LocalAddress) {
    setAddresses(prev => prev.filter(a => a.localKey !== addr.localKey))
    if (addr.id) setRemovedAddressIds(prev => [...prev, addr.id!])
    markDirty()
  }
  function handleAddressModalSave(addr: LocalAddress) {
    setAddresses(prev => {
      const exists = prev.some(a => a.localKey === addr.localKey)
      return exists ? prev.map(a => (a.localKey === addr.localKey ? addr : a)) : [...prev, addr]
    })
    setAddressModal({ open: false, editing: null })
    markDirty()
  }

  async function syncAddresses(id: string) {
    await Promise.all([
      ...removedAddressIds.map(addrId => customerApi.deleteCustomerAddressById(id, addrId)),
      ...addresses.map(a => {
        const payload = { addressType: a.addressType, address: a.address }
        return a.id
          ? customerApi.updateCustomerAddressById(id, a.id, payload)
          : customerApi.addCustomerAddress(id, payload)
      }),
    ])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code || !name) { toast.error(cu.requiredFields); return }

    if (mode === 'edit' && entityId && !isDirty) {
      router.push(`/business/sale-management/customer-data?highlight=${entityId}`)
      return
    }

    const payload = {
      code,
      name,
      entityCategory: entityCategory ? Number(entityCategory) : null,
      customerTypeId: customerTypeId || null,
      customerGroupId: customerGroupId || null,
      nationalCardId: nationalCardId || null,
      taxId: taxId || null,
      creditTermDay: creditTermDay ? Number(creditTermDay) : null,
      creditAmount: creditAmount ? Number(creditAmount) : null,
    }

    setSaving(true)
    try {
      if (mode === 'add') {
        const res = await customerApi.addCustomer({ ...payload, primaryPhone: primaryPhone || null, primaryEmail: primaryEmail || null })
        if (res.data.status !== 'OK') { toast.error(res.data.description || cu.failedToAdd); return }
        const newId = res.data.entity?.id
        if (newId && addresses.length > 0) await syncAddresses(newId)
        toast.success(cu.addSuccess)
        setIsDirty(false)
        router.push(newId ? `/business/sale-management/customer-data?highlight=${newId}` : '/business/sale-management/customer-data')
      } else if (entityId) {
        const res = await customerApi.updateCustomerById(entityId, payload)
        if (res.data.status !== 'OK') { toast.error(res.data.description || cu.failedToUpdate); return }
        await syncAddresses(entityId)
        toast.success(cu.updateSuccess)
        setIsDirty(false)
        router.push(`/business/sale-management/customer-data?highlight=${entityId}`)
      }
    } catch (err) {
      const axiosErr = err as AxiosError
      if (axiosErr.code === 'CODE_DUPLICATE') toast.error(cu.duplicateCode)
      else if (axiosErr.code === 'EMAIL_DUPLICATE') toast.error(cu.duplicateEmail)
      else toast.error(axiosErr.message || (mode === 'add' ? cu.failedToAdd : cu.failedToUpdate))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100dvh-5rem)]">
        <div className="w-7 h-7 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <div className="flex-none flex items-center gap-3 mb-6">
        <button onClick={() => guardNavigation(() => router.back())} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{mode === 'add' ? cu.createTitle : cu.editTitle}</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-none">
                <User className="w-3.5 h-3.5 text-primary-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">{cu.title}</h3>
            </div>
            <div className="max-w-3xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label={cu.fieldCode} required>
                  <input type="text" value={code} onChange={e => { setCode(e.target.value); markDirty() }} placeholder={cu.fieldCodePlaceholder} className={inputCls} />
                </FormField>
                <FormField label={cu.fieldName} required>
                  <input type="text" value={name} onChange={e => { setName(e.target.value); markDirty() }} placeholder={cu.fieldNamePlaceholder} className={inputCls} />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField label={cu.fieldCategory}>
                  <select value={entityCategory} onChange={e => { setEntityCategory(e.target.value); markDirty() }} className={inputCls}>
                    <option value="">—</option>
                    <option value="1">{cu.categoryPersonal}</option>
                    <option value="2">{cu.categoryCompany}</option>
                  </select>
                </FormField>
                <FormField label={cu.fieldType}>
                  <select value={customerTypeId} onChange={e => { setCustomerTypeId(e.target.value); markDirty() }} className={inputCls}>
                    <option value="">—</option>
                    {customerTypeOptions.map(o => <option key={o.id} value={o.id}>{o.description || o.code}</option>)}
                  </select>
                </FormField>
                <FormField label={cu.fieldGroup}>
                  <select value={customerGroupId} onChange={e => { setCustomerGroupId(e.target.value); markDirty() }} className={inputCls}>
                    <option value="">—</option>
                    {customerGroupOptions.map(o => <option key={o.id} value={o.id}>{o.description || o.code}</option>)}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={cu.fieldNationalCardId}>
                  <input type="text" value={nationalCardId} onChange={e => { setNationalCardId(e.target.value); markDirty() }} className={inputCls} />
                </FormField>
                <FormField label={cu.fieldTaxId}>
                  <input type="text" value={taxId} onChange={e => { setTaxId(e.target.value); markDirty() }} className={inputCls} />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={cu.fieldPhone}>
                  <input
                    type="text" value={primaryPhone}
                    onChange={e => { setPrimaryPhone(e.target.value); markDirty() }}
                    disabled={mode === 'edit'}
                    className={clsx(inputCls, mode === 'edit' && 'bg-gray-50 text-gray-500')}
                  />
                </FormField>
                <FormField label={cu.fieldEmail}>
                  <input
                    type="email" value={primaryEmail}
                    onChange={e => { setPrimaryEmail(e.target.value); markDirty() }}
                    disabled={mode === 'edit'}
                    className={clsx(inputCls, mode === 'edit' && 'bg-gray-50 text-gray-500')}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={cu.fieldCreditTermDay}>
                  <input type="number" value={creditTermDay} onChange={e => { setCreditTermDay(e.target.value); markDirty() }} className={inputCls} min={0} step="1" />
                </FormField>
                <FormField label={cu.fieldCreditAmount}>
                  <input type="number" value={creditAmount} onChange={e => { setCreditAmount(e.target.value); markDirty() }} className={inputCls} min={0} step="any" />
                </FormField>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1">
            <div className="px-7 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-none">
                  <MapPin className="w-3.5 h-3.5 text-primary-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">{cu.addressSectionTitle}</h3>
              </div>
              <button type="button" onClick={handleAddAddress} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" />
                {cu.addAddressBtn}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{cu.fieldAddressType}</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{cu.fieldAddress}</th>
                    <th className="w-20 px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {addresses.length === 0 ? (
                    <tr><td colSpan={3} className="py-10 text-center text-sm text-gray-400">{cu.noAddress}</td></tr>
                  ) : addresses.map((addr, idx) => (
                    <tr key={addr.localKey} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {addressTypes.find(o => o.id === addr.addressType)?.description || addr.addressType}
                      </td>
                      <td className="px-5 py-3 text-gray-600 max-w-md"><span className="line-clamp-2">{addr.address}</span></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleEditAddress(addr)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => handleRemoveAddress(addr)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button type="button" onClick={() => guardNavigation(() => router.back())} className={cancelBtnCls}>
            {cu.cancel}
          </button>
          <button type="submit" disabled={saving} className={primaryBtnCls}>
            {saving ? cu.saving : cu.save}
          </button>
        </div>
      </form>

      {addressModal.open && (
        <AddressModal
          initial={addressModal.editing}
          addressTypeOptions={addressTypes}
          onSave={handleAddressModalSave}
          onClose={() => setAddressModal({ open: false, editing: null })}
        />
      )}

      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}
    </div>
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
