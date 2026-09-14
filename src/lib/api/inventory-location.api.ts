import { client } from '@/lib/axios'

function getBase() {
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : ''
  return `/api/InventoryLocation/org/${orgId}/action`
}

export interface InventoryLocationItem {
  id: string
  orgId: string
  code: string
  name: string
  locationType: string
  createdDate?: string | null
  updatedDate?: string | null
}

export interface InventoryLocationResponse {
  status: string
  description: string
  inventoryLocation?: InventoryLocationItem
}

export interface GetInventoryLocationsPayload {
  fullTextSearch?: string
  locationType?: string
  offset?: number
  limit?: number
}

export interface SaveInventoryLocationPayload {
  code: string
  name: string
  locationType: string
}

export const inventoryLocationApi = {
  getLocations: (payload: GetInventoryLocationsPayload = {}) =>
    client.post<InventoryLocationItem[]>(`${getBase()}/GetInventoryLocations`, payload),

  getLocationCount: (payload: GetInventoryLocationsPayload = {}) =>
    client.post<number>(`${getBase()}/GetInventoryLocationCount`, payload),

  getLocationById: (id: string) =>
    client.get<InventoryLocationItem>(`${getBase()}/GetInventoryLocationById/${id}`),

  addLocation: (payload: SaveInventoryLocationPayload) =>
    client.post<InventoryLocationResponse>(`${getBase()}/AddInventoryLocation`, payload),

  updateLocationById: (id: string, payload: Partial<SaveInventoryLocationPayload>) =>
    client.post<InventoryLocationResponse>(`${getBase()}/UpdateInventoryLocationById/${id}`, payload),

  deleteLocationById: (id: string) =>
    client.delete<InventoryLocationResponse>(`${getBase()}/DeleteInventoryLocationById/${id}`),
}
