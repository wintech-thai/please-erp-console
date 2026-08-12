'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { client } from '@/lib/axios'

export interface AllowedOrg {
  orgId?: string | null
  orgCustomId?: string | null
  orgName?: string | null
  orgType?: string | null
  userStatus?: string | null
}

interface TenantContextValue {
  allowedOrgs: AllowedOrg[]
  selectedOrg: AllowedOrg | null
  setSelectedOrg: (org: AllowedOrg) => void
  loading: boolean
  reload: () => void
}

const TenantContext = createContext<TenantContextValue>({
  allowedOrgs: [],
  selectedOrg: null,
  setSelectedOrg: () => {},
  loading: true,
  reload: () => {},
})

export function TenantProvider({ children }: { children: ReactNode }) {
  const [allowedOrgs, setAllowedOrgs] = useState<AllowedOrg[]>([])
  const [selectedOrg, setSelectedOrgState] = useState<AllowedOrg | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const orgId = localStorage.getItem('orgId') || 'global'
      const res = await client.get<AllowedOrg[] | { organizations?: AllowedOrg[] }>(
        `/api/OnlyUser/org/${orgId}/action/GetUserAllowedOrganization/PLEASE-ERP`
      )
      const data = res.data
      const orgs: AllowedOrg[] = Array.isArray(data) ? data : ((data as { organizations?: AllowedOrg[] }).organizations ?? [])
      const activeOrgs = orgs.filter(o => o.userStatus?.toLowerCase() === 'active' || !o.userStatus)
      setAllowedOrgs(activeOrgs)

      const savedId = localStorage.getItem('selectedTenantOrgId')
      const saved = savedId ? activeOrgs.find(o => (o.orgCustomId ?? o.orgId) === savedId) : null
      const initial = saved ?? activeOrgs[0] ?? null
      setSelectedOrgState(initial)
      if (initial) {
        const orgKey = initial.orgCustomId || initial.orgId || ''
        localStorage.setItem('orgId', orgKey)
        localStorage.setItem('selectedTenantOrgId', orgKey)
      }
    } catch {
      setAllowedOrgs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setSelectedOrg = useCallback((org: AllowedOrg) => {
    setSelectedOrgState(org)
    const orgKey = org.orgCustomId || org.orgId || ''
    localStorage.setItem('selectedTenantOrgId', orgKey)
    localStorage.setItem('orgId', orgKey)
  }, [])

  return (
    <TenantContext.Provider value={{ allowedOrgs, selectedOrg, setSelectedOrg, loading, reload: load }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  return useContext(TenantContext)
}
