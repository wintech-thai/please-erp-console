import { client } from '@/lib/axios'

function getBase() {
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : ''
  return `/api/DocumentNumber/org/${orgId}/action`
}

export interface DocumentNumberConfig {
  id: string
  orgId: string
  documentType: string
  documentFormat: string
  tags?: string | null
  seqDigit: number
  resetType: string      // 'Monthly' | 'Yearly'
  yearOffset: number
  currentSequenceKey?: string | null
  currentSequenceNo: number
  createdDate?: string | null
}

export interface GetDocumentNumberConfigsPayload {
  fullTextSearch?: string
  documentType?: string
  offset?: number
  limit?: number
}

export interface AddDocumentNumberConfigPayload {
  documentType: string
  documentFormat: string
  seqDigit: number
  resetType: string
  yearOffset: number
  tags?: string
}

export interface UpdateDocumentNumberSequencePayload {
  currentSequenceNo: number
  currentSequenceKey: string
}

export const documentNumberApi = {
  getConfigs: (payload: GetDocumentNumberConfigsPayload = {}) =>
    client.post<DocumentNumberConfig[]>(`${getBase()}/GetDocumentNumberConfigs`, payload),

  getConfigCount: (payload: GetDocumentNumberConfigsPayload = {}) =>
    client.post<number>(`${getBase()}/GetDocumentNumberConfigCount`, payload),

  getConfigById: (configId: string) =>
    client.get<DocumentNumberConfig>(`${getBase()}/GetDocumentNumberConfigById/${configId}`),

  addConfig: (payload: AddDocumentNumberConfigPayload) =>
    client.post<DocumentNumberConfig>(`${getBase()}/AddDocumentNumberConfig`, payload),

  updateConfigById: (configId: string, payload: Partial<AddDocumentNumberConfigPayload>) =>
    client.post<DocumentNumberConfig>(`${getBase()}/UpdateDocumentNumberConfigById/${configId}`, payload),

  deleteConfigById: (configId: string) =>
    client.delete<DocumentNumberConfig>(`${getBase()}/DeleteDocumentNumberConfigById/${configId}`),

  getDocumentNumber: (docType: string) =>
    client.get<{ documentNumber: string }>(`${getBase()}/GetDocumentNumber/${docType}`),

  updateSequence: (configId: string, payload: UpdateDocumentNumberSequencePayload) =>
    client.post<DocumentNumberConfig>(`${getBase()}/UpdateDocumentNumberSequence/${configId}`, payload),
}
