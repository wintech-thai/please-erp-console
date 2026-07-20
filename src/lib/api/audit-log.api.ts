import { client } from '@/lib/axios'

export interface AuditLogDocument {
  id: string
  '@timestamp': string
  user_name: string
  id_type: string
  role: string
  action: string
  path: string
  resource: string
  status_code: number
  client_ip: string
  [key: string]: unknown
}

export interface AuditLogPayload {
  limit?: number
  offset?: number
  search?: string
  sortBy?: string
  sortDesc?: boolean
  from?: string
  to?: string
  [key: string]: unknown
}

const getOrgId = () => (typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : '')

export const auditLogApi = {
  getAuditLogs: (payload: AuditLogPayload = {}) =>
    client.post(`/api/AuditLog/org/${getOrgId()}/action/GetAuditLogs`, { ApplicationType: 'PLEASE-ERP', ...payload }),

  getAuditLogCount: (payload: AuditLogPayload = {}) =>
    client.post(`/api/AuditLog/org/${getOrgId()}/action/GetAuditLogCount`, { ApplicationType: 'PLEASE-ERP', ...payload }),

  getAuditLogById: (id: string) =>
    client.get(`/api/AuditLog/org/${getOrgId()}/action/GetAuditLogById/${id}`),
}
