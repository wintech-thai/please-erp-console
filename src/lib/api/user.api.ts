import { client } from '@/lib/axios'
import { isAdmin } from '@/lib/web-role'
import type { UserItem, GetUsersPayload, InviteUserPayload, InviteUserWithLinkPayload, UpdateUserPayload } from './types'

function getOrgId() {
  return typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : ''
}

function getBase() {
  if (isAdmin) return '/admin-api/AdminUser/org/global/action'
  return `/api/OrganizationUser/org/${getOrgId()}/action`
}

const REG_BASE = isAdmin
  ? '/admin-api/RegistrationAdmin/org'
  : '/api/Registration/org'

export const userApi = {
  getUsers: (payload: GetUsersPayload = {}) =>
    client.post<{ users: UserItem[] }>(`${getBase()}/GetUsers`, payload),

  getUserCount: (payload: GetUsersPayload = {}) =>
    client.post<{ count: number }>(`${getBase()}/GetUserCount`, payload),

  getUserById: (userId: string) =>
    client.get<{ user: UserItem }>(`${getBase()}/GetUserById/${userId}`),

  inviteUser: (payload: InviteUserPayload) =>
    client.post(`${getBase()}/InviteUser`, payload),

  inviteUserWithLink: (payload: InviteUserWithLinkPayload) =>
    client.post(`${getBase()}/InviteUserWithLink`, payload),

  updateUserById: (userId: string, payload: UpdateUserPayload) =>
    client.post(`${getBase()}/UpdateUserById/${userId}`, payload),

  enableUserById: (userId: string) =>
    client.post(`${getBase()}/EnableUserById/${userId}`, {}),

  disableUserById: (userId: string) =>
    client.post(`${getBase()}/DisableUserById/${userId}`, {}),

  deleteUserById: (userId: string) =>
    client.delete(`${getBase()}/DeleteUserById/${userId}`),

  getForgotPasswordLink: (userId: string) =>
    client.get<{ forgotPasswordUrl?: string; resetLink?: string }>(`${getBase()}/GetForgotPasswordLink/${userId}`),

  getRoles: () => {
    const base = isAdmin
      ? '/admin-api/AdminRole/org/global/action'
      : `/api/Role/org/${getOrgId()}/action`
    return client.post<{ roles: { id: string; name: string; description?: string }[] }>(
      `${base}/GetRoles`,
      { offset: 0, limit: 100 }
    )
  },

  confirmForgotPassword: (orgId: string, token: string, payload: { username: string; email: string; password: string; orgUserId?: string }) =>
    client.post(
      `${REG_BASE}/${orgId}/action/ConfirmForgotPasswordReset/${token}/${payload.username}`,
      { Password: payload.password, UserName: payload.username, Email: payload.email, OrgUserId: payload.orgUserId }
    ),

  confirmInvite: (orgId: string, token: string, payload: { username: string; email: string; password: string; firstName: string; lastName: string; orgUserId?: string }) =>
    client.post(
      `${REG_BASE}/${orgId}/action/ConfirmNewUserInvitation/${token}/${payload.username}`,
      { Email: payload.email, UserName: payload.username, Password: payload.password, Name: payload.firstName, LastName: payload.lastName, OrgUserId: payload.orgUserId }
    ),

  confirmExistingUserInvite: (orgId: string, token: string, payload: { username: string; email: string; orgUserId?: string }) =>
    client.post(
      `${REG_BASE}/${orgId}/action/ConfirmExistingUserInvitation/${token}/${payload.username}`,
      { Email: payload.email, UserName: payload.username, OrgUserId: payload.orgUserId }
    ),
}
