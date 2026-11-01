import { client } from '@/lib/axios'

export interface AuditTrack {
  id?: string | null
  orgId?: string | null
  trackModel?: string | null
  rowId?: string | null
  actionName?: string | null
  actionRequested?: string | null
  actionBy?: string | null
  ipAddress?: string | null
  ipAddress2?: string | null
  oldValue?: string | null
  newValue?: string | null
  apiName?: string | null
  createdDate?: string | null
}

function getOrgId() {
  return typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : ''
}

// x013 ข้อ 9 ปรับแก้ : reuse x088's org-scoped AuditTrail endpoint (field-level diff via
// EF SaveChangesInterceptor on AuditedTables — see AuditTrailInterceptor.cs in onix-v2-api),
// same backend please-payment-admin uses, instead of the generic AuditLogs/ES system.
export const auditTrailApi = {
  getByRowId: (rowId: string) =>
    client.get<AuditTrack[]>(`/api/AuditTrail/org/${getOrgId()}/action/GetAuditTrailByRowId/${rowId}`),
}
