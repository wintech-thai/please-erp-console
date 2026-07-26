import { client } from '@/lib/axios'
import type { MerchantItem, GetMerchantsPayload, AddMerchantPayload, UpdateMerchantPayload, OrgUserItem, InviteOrgUserPayload } from './types'

const BASE = '/admin-api/AdminMerchant/org/global/action'
const ORG_BASE = '/admin-api/AdminOrganization/org/global/action'

export const tenantApi = {
  getTenants: (payload: GetMerchantsPayload = {}) =>
    client.post<{ merchants: MerchantItem[] }>(`${BASE}/GetMerchants`, payload),

  getTenantCount: (payload: GetMerchantsPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetMerchantCount`, payload),

  getTenantById: (id: string) =>
    client.get<{ merchant: MerchantItem }>(`${BASE}/GetMerchantById/${id}`),

  updateTenantById: (id: string, payload: UpdateMerchantPayload) =>
    client.post(`${BASE}/UpdateMerchantById/${id}`, payload),

  enableTenantById: (id: string) =>
    client.post(`${BASE}/EnableMerchantById/${id}`, {}),

  disableTenantById: (id: string) =>
    client.post(`${BASE}/DisableMerchantById/${id}`, {}),

  addTenant: (payload: AddMerchantPayload) =>
    client.post(`${ORG_BASE}/AddOrganization`, payload),

  getOrgUsers: (orgCustomId: string) =>
    client.get<{ users: OrgUserItem[] }>(`${ORG_BASE}/GetOrgUsers/${orgCustomId}`),

  inviteOrgUser: (orgCustomId: string, payload: InviteOrgUserPayload) =>
    client.post(`${ORG_BASE}/InviteOrganizationUser/${orgCustomId}`, payload),

  enableOrgUser: (orgCustomId: string, orgUserId: string) =>
    client.post(`${ORG_BASE}/EnableOrgUserById/${orgCustomId}/${orgUserId}`, null),

  disableOrgUser: (orgCustomId: string, orgUserId: string) =>
    client.post(`${ORG_BASE}/DisableOrgUserById/${orgCustomId}/${orgUserId}`, null),
}
