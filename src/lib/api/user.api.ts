import { client } from '@/lib/axios'
import { isAdmin } from '@/lib/web-role'
import type { UserItem, GetUsersPayload, InviteUserPayload, InviteUserWithLinkPayload, UpdateUserPayload } from './types'

const BASE = isAdmin
  ? '/admin-api/AdminUser/org/global/action'
  : '/api/OrgUser/org/global/action'

const REG_BASE = isAdmin
  ? '/admin-api/RegistrationAdmin/org'
  : '/api/Registration/org'

export const userApi = {
  getUsers: (payload: GetUsersPayload = {}) =>
    client.post<{ users: UserItem[] }>(`${BASE}/GetUsers`, payload),

  getUserCount: (payload: GetUsersPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetUserCount`, payload),

  getUserById: (userId: string) =>
    client.get<{ user: UserItem }>(`${BASE}/GetUserById/${userId}`),

  inviteUser: (payload: InviteUserPayload) =>
    client.post(`${BASE}/InviteUser`, payload),

  inviteUserWithLink: (payload: InviteUserWithLinkPayload) =>
    client.post(`${BASE}/InviteUserWithLink`, payload),

  updateUserById: (userId: string, payload: UpdateUserPayload) =>
    client.post(`${BASE}/UpdateUserById/${userId}`, payload),

  enableUserById: (userId: string) =>
    client.post(`${BASE}/EnableUserById/${userId}`, {}),

  disableUserById: (userId: string) =>
    client.post(`${BASE}/DisableUserById/${userId}`, {}),

  deleteUserById: (userId: string) =>
    client.delete(`${BASE}/DeleteUserById/${userId}`),

  getForgotPasswordLink: (userId: string) =>
    client.get<{ forgotPasswordUrl?: string; resetLink?: string }>(`${BASE}/GetForgotPasswordLink/${userId}`),

  getRoles: () =>
    client.post<{ roles: { id: string; name: string; description?: string }[] }>(
      `${isAdmin ? '/admin-api/AdminRole' : '/api/Role'}/org/global/action/GetRoles`,
      { offset: 0, limit: 100 }
    ),

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
