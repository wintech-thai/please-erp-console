import { client } from '@/lib/axios'

function getBase() {
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : ''
  return `/api/Customer/org/${orgId}/action`
}

export interface CustomerAddress {
  id: string
  orgId?: string
  entityId?: string
  addressType?: string | null
  address?: string | null
  createdDate?: string | null
  updatedDate?: string | null
}

export interface CustomerItem {
  id: string
  orgId?: string
  code: string
  name: string
  tags?: string | null
  entityType?: number | null
  entityCategory?: number | null
  customerTypeId?: string | null
  customerGroupId?: string | null
  customerTypeCode?: string | null
  customerGroupCode?: string | null
  creditTermDay?: number | null
  creditAmount?: number | null
  taxId?: string | null
  nationalCardId?: string | null
  primaryEmail?: string | null
  primaryPhone?: string | null
  content?: string | null
  createdDate?: string | null
  updatedDate?: string | null
  addresses?: CustomerAddress[] | null
}

export interface CustomerResponse {
  status: string
  description: string
  entity?: CustomerItem
}

export interface CustomerAddressResponse {
  status: string
  description: string
  entityAddress?: CustomerAddress
}

export interface GetCustomersPayload {
  fullTextSearch?: string
  customerTypeId?: string
  customerGroupId?: string
  offset?: number
  limit?: number
}

export interface SaveCustomerPayload {
  code: string
  name: string
  entityCategory?: number | null
  customerTypeId?: string | null
  customerGroupId?: string | null
  creditTermDay?: number | null
  creditAmount?: number | null
  taxId?: string | null
  nationalCardId?: string | null
  primaryEmail?: string | null
  primaryPhone?: string | null
}

export interface SaveCustomerAddressPayload {
  addressType: string
  address: string
}

// x011 ปรับแก้ #4: ใช้ endpoint V2 (async) ทั้งหมด — ตัวเดิมแบบ sync ยังเก็บไว้ให้ Please Scan ใช้ต่อ
export const customerApi = {
  getCustomers: (payload: GetCustomersPayload = {}) =>
    client.post<CustomerItem[]>(`${getBase()}/GetCustomersV2`, payload),

  getCustomerCount: (payload: GetCustomersPayload = {}) =>
    client.post<number>(`${getBase()}/GetCustomerCountV2`, payload),

  getCustomerById: (entityId: string) =>
    client.get<CustomerItem>(`${getBase()}/GetCustomerByIdV2/${entityId}`),

  addCustomer: (payload: SaveCustomerPayload) =>
    client.post<CustomerResponse>(`${getBase()}/AddCustomerV2`, payload),

  updateCustomerById: (entityId: string, payload: Partial<SaveCustomerPayload>) =>
    client.post<CustomerResponse>(`${getBase()}/UpdateCustomerByIdV2/${entityId}`, payload),

  deleteCustomerById: (entityId: string) =>
    client.delete<CustomerResponse>(`${getBase()}/DeleteCustomerCascadeByIdV2/${entityId}`),

  getCustomerAddresses: (entityId: string) =>
    client.get<CustomerAddress[]>(`${getBase()}/GetCustomerAddressesByEntityIdV2/${entityId}`),

  addCustomerAddress: (entityId: string, payload: SaveCustomerAddressPayload) =>
    client.post<CustomerAddressResponse>(`${getBase()}/AddCustomerAddressV2/${entityId}`, payload),

  updateCustomerAddressById: (entityId: string, addressId: string, payload: SaveCustomerAddressPayload) =>
    client.post<CustomerAddressResponse>(`${getBase()}/UpdateCustomerAddressByIdV2/${entityId}/${addressId}`, payload),

  deleteCustomerAddressById: (entityId: string, addressId: string) =>
    client.delete<CustomerAddressResponse>(`${getBase()}/DeleteCustomerAddressByIdV2/${entityId}/${addressId}`),
}
