import { client } from '@/lib/axios'

function getBase() {
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : ''
  return `/api/InventoryDoc/org/${orgId}/action`
}

export interface InventoryDocItemRow {
  id?: string | null
  orgId?: string | null
  documentId?: string | null
  documentNo?: string | null
  documentType?: string | null
  note?: string | null
  lotId?: string | null
  project?: string | null
  toLocationId?: string | null
  toLocationCode?: string | null
  toLocationName?: string | null
  fromLocationId?: string | null
  fromLocationCode?: string | null
  fromLocationName?: string | null
  itemId?: string | null
  itemCode?: string | null
  itemName?: string | null
  itemQuantity?: number | null
  itemAmount?: number | null
  itemUnitPrice?: number | null
  createdDate?: string | null
}

export interface InventoryDocItem {
  id: string
  orgId: string
  documentNo: string
  documentType: string
  description?: string | null
  documentStatus: string
  toLocationId?: string | null
  toLocationCode?: string | null
  toLocationName?: string | null
  fromLocationId?: string | null
  fromLocationCode?: string | null
  fromLocationName?: string | null
  createdDate?: string | null
  approvedDate?: string | null
  statusDate?: string | null
  items?: InventoryDocItemRow[] | null
}

export interface InventoryDocResponse {
  status: string
  description: string
  inventoryDoc?: InventoryDocItem
}

export interface GetInventoryDocsPayload {
  documentType?: string
  fullTextSearch?: string
  documentStatus?: string
  fromDate?: string
  toDate?: string
  offset?: number
  limit?: number
}

export interface SaveInventoryDocStockInPayload {
  description?: string
  toLocationId?: string
  toLocationCode?: string
  toLocationName?: string
  items?: InventoryDocItemRow[]
}

export const inventoryDocApi = {
  getDocs: (payload: GetInventoryDocsPayload = {}) =>
    client.post<InventoryDocItem[]>(`${getBase()}/GetInventoryDocs`, payload),

  getDocCount: (payload: GetInventoryDocsPayload = {}) =>
    client.post<number>(`${getBase()}/GetInventoryDocCount`, payload),

  getDocById: (id: string) =>
    client.get<InventoryDocItem>(`${getBase()}/GetInventoryDocById/${id}`),

  addStockIn: (payload: SaveInventoryDocStockInPayload) =>
    client.post<InventoryDocResponse>(`${getBase()}/AddInventoryDocStockIn`, payload),

  updateStockInById: (id: string, payload: SaveInventoryDocStockInPayload) =>
    client.post<InventoryDocResponse>(`${getBase()}/UpdateInventoryDocStockIn/${id}`, payload),

  approveStockInById: (id: string) =>
    client.post<InventoryDocResponse>(`${getBase()}/ApproveInventoryDocStockIn/${id}`),

  cancelStockInById: (id: string) =>
    client.post<InventoryDocResponse>(`${getBase()}/CancelInventoryDocStockIn/${id}`),
}
