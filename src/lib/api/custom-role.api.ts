import { client } from '@/lib/axios'
import { isAdmin } from '@/lib/web-role'
import type { CustomRoleItem, GetCustomRolesPayload, AddCustomRolePayload, UpdateCustomRolePayload, ControllerPermissions } from './types'

function getBase() {
  if (isAdmin) return '/admin-api/AdminCustomRole/org/global/action'
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : ''
  return `/api/CustomRole/org/${orgId}/action`
}

export const customRoleApi = {
  getCustomRoles: (payload: GetCustomRolesPayload = {}) =>
    client.post<{ customRoles: CustomRoleItem[] }>(`${getBase()}/GetCustomRoles`, payload),

  getCustomRoleCount: (payload: GetCustomRolesPayload = {}) =>
    client.post<{ count: number }>(`${getBase()}/GetCustomRoleCount`, payload),

  getCustomRoleById: (customRoleId: string) =>
    client.get<{ customRole: CustomRoleItem }>(`${getBase()}/GetCustomRoleById/${customRoleId}`),

  getInitialUserRolePermissions: () =>
    client.get<{ permissions: ControllerPermissions[] }>(`${getBase()}/GetInitialUserRolePermissions`),

  addCustomRole: (payload: AddCustomRolePayload) =>
    client.post(`${getBase()}/AddCustomRole`, payload),

  updateCustomRoleById: (customRoleId: string, payload: UpdateCustomRolePayload) =>
    client.post(`${getBase()}/UpdateCustomRoleById/${customRoleId}`, payload),

  deleteCustomRoleById: (customRoleId: string) =>
    client.delete(`${getBase()}/DeleteCustomRoleById/${customRoleId}`),
}
