import { client } from '@/lib/axios'
import { isAdmin } from '@/lib/web-role'
import type { ApiKeyItem, GetApiKeysPayload, AddApiKeyPayload, UpdateApiKeyPayload } from './types'

function getBase() {
  if (isAdmin) return '/admin-api/AdminApiKey/org/global/action'
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : ''
  return `/api/ApiKey/org/${orgId}/action`
}

export const apiKeyApi = {
  getApiKeys: (payload: GetApiKeysPayload = {}) =>
    client.post<{ apiKeys: ApiKeyItem[] }>(`${getBase()}/GetApiKeys`, payload),

  getApiKeyCount: (payload: GetApiKeysPayload = {}) =>
    client.post<{ count: number }>(`${getBase()}/GetApiKeyCount`, payload),

  getApiKeyById: (keyId: string) =>
    client.get<{ apiKey: ApiKeyItem }>(`${getBase()}/GetApiKeyById/${keyId}`),

  addApiKey: (payload: AddApiKeyPayload) =>
    client.post<{ apiKey: ApiKeyItem }>(`${getBase()}/AddApiKey`, payload),

  updateApiKeyById: (keyId: string, payload: UpdateApiKeyPayload) =>
    client.post(`${getBase()}/UpdateApiKeyById/${keyId}`, payload),

  enableApiKeyById: (keyId: string) =>
    client.post(`${getBase()}/EnableApiKeyById/${keyId}`, {}),

  disableApiKeyById: (keyId: string) =>
    client.post(`${getBase()}/DisableApiKeyById/${keyId}`, {}),

  deleteApiKeyById: (keyId: string) =>
    client.delete(`${getBase()}/DeleteApiKeyById/${keyId}`),
}
