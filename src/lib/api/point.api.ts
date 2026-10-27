import { client } from '@/lib/axios'

function getBase() {
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : ''
  return `/api/Point/org/${orgId}/action`
}

export interface InventoryWallet {
  id: string
  orgId: string
  walletType?: string | null
  inventoryItemId?: string | null
  inventoryLocationId?: string | null
  pointBalanceDecimal?: number | null
  pointQuantityBalanceDecimal?: number | null
  pointAveragePriceDecimal?: number | null
  createdDate?: string | null
  updatedDate?: string | null
}

export interface InventoryPointTx {
  id: string
  orgId: string
  walletId: string
  tags?: string | null
  tags2?: string | null
  description?: string | null
  txAmountDecimal?: number | null
  txQuantityDecimal?: number | null
  txAveragePriceDecimal?: number | null
  txType?: number | null
  previousBalanceDecimal?: number | null
  previousBalanceQuantityDecimal?: number | null
  previousAveragePriceDecimal?: number | null
  currentBalanceDecimal?: number | null
  currentBalanceQuantityDecimal?: number | null
  currentAveragePriceDecimal?: number | null
  createdDate?: string | null
}

export interface GetPointTxsPayload {
  offset?: number
  limit?: number
  fromDate?: string
  toDate?: string
}

export const pointApi = {
  getWalletsByLocationId: (locationId: string) =>
    client.get<InventoryWallet[]>(`${getBase()}/GetWalletsByLocationId/${locationId}`),

  getWalletsByItemId: (itemId: string) =>
    client.get<InventoryWallet[]>(`${getBase()}/GetWalletsByItemId/${itemId}`),

  getPointTxsByLocationItemId: (locationId: string, itemId: string, payload: GetPointTxsPayload = {}) =>
    client.post<InventoryPointTx[]>(`${getBase()}/GetPointTxsByLocationItemId/${locationId}/${itemId}`, payload),
}
