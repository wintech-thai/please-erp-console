import { client } from '@/lib/axios'
import { isAdmin } from '@/lib/web-role'
import type { CompanyProfile, UpdateCompanyProfilePayload } from './types'

function getOrgId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('orgId') || ''
}

function getBase() {
  if (isAdmin) return '/admin-api/AdminOrganization/org/global/action'
  return `/api/Organization/org/${getOrgId()}/action`
}

export const organizationApi = {
  getCompanyProfile: () =>
    client.get<CompanyProfile>(`${getBase()}/company-profile`),

  updateCompanyProfile: (payload: UpdateCompanyProfilePayload) =>
    client.post(`${getBase()}/company-profile/update`, payload),
}
