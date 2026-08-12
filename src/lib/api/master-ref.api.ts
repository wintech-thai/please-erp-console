import { client } from '@/lib/axios'

function getBase() {
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : ''
  return `/api/MasterRef/org/${orgId}/action`
}

export interface MasterRefItem {
  id: string
  orgId: string
  code: string
  description: string
  refType: string
  tags?: string | null
  createdDate?: string | null
  updatedDate?: string | null
}

export interface GetMasterRefsPayload {
  fullTextSearch?: string
  refType?: string
  offset?: number
  limit?: number
}

export interface SaveMasterRefPayload {
  code: string
  description: string
  refType: string
  tags?: string
}

export const masterRefApi = {
  getRefs: (payload: GetMasterRefsPayload = {}) =>
    client.post<MasterRefItem[]>(`${getBase()}/GetMasterRefs`, payload),

  getRefCount: (payload: GetMasterRefsPayload = {}) =>
    client.post<number>(`${getBase()}/GetMasterRefCount`, payload),

  getRefById: (refId: string) =>
    client.get<MasterRefItem>(`${getBase()}/GetMasterRefById/${refId}`),

  addRef: (payload: SaveMasterRefPayload) =>
    client.post<MasterRefItem>(`${getBase()}/AddMasterRef`, payload),

  updateRefById: (refId: string, payload: Partial<SaveMasterRefPayload>) =>
    client.post<MasterRefItem>(`${getBase()}/UpdateMasterRefById/${refId}`, payload),

  deleteRefById: (refId: string) =>
    client.delete<MasterRefItem>(`${getBase()}/DeleteMasterRefById/${refId}`),
}
