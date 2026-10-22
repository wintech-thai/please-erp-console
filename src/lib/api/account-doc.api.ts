import { client } from '@/lib/axios'

function getBase() {
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : ''
  return `/api/AccountDoc/org/${orgId}/action`
}

export type ProductType = 'Service' | 'InventoryItem' | 'Custom'

export interface AccountDocItemRow {
  id?: string | null
  accountDocId?: string | null
  productId?: string | null
  productType?: ProductType | string | null
  productCode?: string | null
  productDesc?: string | null
  quantity?: number | null
  unitPrice?: number | null
  totalPrice?: number | null
  tags?: string | null
}

export interface AccountDocItem {
  id: string
  orgId: string
  documentNo: string
  documentType: string
  description?: string | null
  entityId?: string | null
  entityCode?: string | null
  entityName?: string | null
  documentDate?: string | null
  dueDate?: string | null
  totalPrice?: number | null
  paymentMethod?: string | null
  paidAmount?: number | null
  status: string
  createdDate?: string | null
  approvedDate?: string | null
  statusDate?: string | null
  items?: AccountDocItemRow[] | null
}

export interface AccountDocResponse {
  status: string
  description: string
  accountDoc?: AccountDocItem
}

export interface GetAccountDocsPayload {
  fullTextSearch?: string
  documentStatus?: string
  entityId?: string
  fromDate?: string
  toDate?: string
  offset?: number
  limit?: number
}

export interface SaveAccountDocPayload {
  entityId: string
  description?: string
  documentDate?: string
  dueDate?: string
  paymentMethod?: string
  paidAmount?: number
  items?: AccountDocItemRow[]
}

export const accountDocApi = {
  getCashSales: (payload: GetAccountDocsPayload = {}) =>
    client.post<AccountDocItem[]>(`${getBase()}/GetAccountDocCashInvoices`, payload),
  getCashSaleCount: (payload: GetAccountDocsPayload = {}) =>
    client.post<number>(`${getBase()}/GetAccountDocCashInvoiceCount`, payload),
  addCashSale: (payload: SaveAccountDocPayload) =>
    client.post<AccountDocResponse>(`${getBase()}/AddAccountDocCashInvoice`, payload),

  getCreditSales: (payload: GetAccountDocsPayload = {}) =>
    client.post<AccountDocItem[]>(`${getBase()}/GetAccountDocCreditInvoices`, payload),
  getCreditSaleCount: (payload: GetAccountDocsPayload = {}) =>
    client.post<number>(`${getBase()}/GetAccountDocCreditInvoiceCount`, payload),
  addCreditSale: (payload: SaveAccountDocPayload) =>
    client.post<AccountDocResponse>(`${getBase()}/AddAccountDocCreditInvoice`, payload),

  // GetAccountDocById returns the MVAccountDoc envelope (status/description/accountDoc),
  // not the document directly — unlike CustomerApi.getCustomerById.
  getDocById: (id: string) =>
    client.get<AccountDocResponse>(`${getBase()}/GetAccountDocById/${id}`),

  updateDocById: (id: string, payload: SaveAccountDocPayload) =>
    client.post<AccountDocResponse>(`${getBase()}/UpdateAccountDocById/${id}`, payload),

  approveDocById: (id: string) =>
    client.post<AccountDocResponse>(`${getBase()}/ApproveAccountDocById/${id}`),

  cancelDocById: (id: string) =>
    client.post<AccountDocResponse>(`${getBase()}/CancelAccountDocById/${id}`),
}
