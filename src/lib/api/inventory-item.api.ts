import { client } from '@/lib/axios'

function getBase() {
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : ''
  return `/api/InventoryItem/org/${orgId}/action`
}

export interface InventoryItemItem {
  id: string
  orgId: string
  code: string
  referenceCode?: string | null
  nameTh: string
  nameEn?: string | null
  itemType: string
  unit: string
  itemGroup?: string | null
  remark?: string | null
  minimumQuantity?: number | null
  price?: number | null
  isVatIncluded: boolean
  previewUrl?: string | null
  createdDate?: string | null
  updatedDate?: string | null
}

export interface InventoryItemResponse {
  status: string
  description: string
  inventoryItem?: InventoryItemItem
}

export interface GetInventoryItemsPayload {
  fullTextSearch?: string
  itemType?: string
  offset?: number
  limit?: number
}

export interface SaveInventoryItemPayload {
  code: string
  referenceCode?: string
  nameTh: string
  nameEn?: string
  itemType: string
  unit: string
  itemGroup?: string
  remark?: string
  minimumQuantity?: number
  price?: number
  isVatIncluded: boolean
  imageBase64?: string
}

export const inventoryItemApi = {
  getItems: (payload: GetInventoryItemsPayload = {}) =>
    client.post<InventoryItemItem[]>(`${getBase()}/GetInventoryItems`, payload),

  getItemCount: (payload: GetInventoryItemsPayload = {}) =>
    client.post<number>(`${getBase()}/GetInventoryItemCount`, payload),

  getItemById: (id: string) =>
    client.get<InventoryItemItem>(`${getBase()}/GetInventoryItemById/${id}`),

  addItem: (payload: SaveInventoryItemPayload) =>
    client.post<InventoryItemResponse>(`${getBase()}/AddInventoryItem`, payload),

  updateItemById: (id: string, payload: Partial<SaveInventoryItemPayload>) =>
    client.post<InventoryItemResponse>(`${getBase()}/UpdateInventoryItemById/${id}`, payload),

  deleteItemById: (id: string) =>
    client.delete<InventoryItemResponse>(`${getBase()}/DeleteInventoryItemById/${id}`),
}
