/**
 * HINCH MART — Addresses API Service (Customer Delivery Address Management)
 * Source: AddressController.java
 * Base URLs: /api/addresses & /api/user/addresses
 * 
 * Endpoints:
 * - GET    /api/addresses          — List user delivery addresses
 * - GET    /api/addresses/{id}     — Get single address details
 * - POST   /api/addresses          — Create delivery address with geographic coordinates
 * - PUT    /api/addresses/{id}     — Update address
 * - DELETE /api/addresses/{id}     — Delete address
 * - PATCH  /api/addresses/{id}/default — Set address as default
 */
import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import { CustomerAddress, AddressCreatePayload, AddressUpdatePayload } from '../../types/location.types';

export function normalizeCustomerAddress(raw: any, index = 0): CustomerAddress {
  const addressId = Number(raw.addressId || raw.id || index + 1);
  return {
    ...raw,
    addressId,
    id: addressId,
    siteName: raw.siteName || raw.recipientName || '',
    recipientName: raw.recipientName || raw.siteName || 'Customer',
    phone: raw.phone || raw.phoneNumber || '',
    addressLine1: raw.addressLine1 || '',
    addressLine2: raw.addressLine2 || '',
    houseFlatNo: raw.houseFlatNo || raw.flatNo || raw.doorNo || '',
    areaLocality: raw.areaLocality || raw.area || raw.locality || '',
    city: raw.city || 'Hyderabad',
    state: raw.state || 'Telangana',
    country: raw.country || 'India',
    pincode: String(raw.pincode || raw.postalCode || '500001'),
    landmark: raw.landmark || '',
    latitude: raw.latitude !== undefined ? Number(raw.latitude) : undefined,
    longitude: raw.longitude !== undefined ? Number(raw.longitude) : undefined,
    addressType: (raw.addressType as any) || 'WORK',
    isDefault: Boolean(raw.isDefault),
    hasHeavyVehicleAccess: raw.hasHeavyVehicleAccess !== false,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export const addressesApi = {
  /**
   * GET /api/addresses — Retrieve all delivery addresses for the authenticated user
   */
  getAddresses: async (): Promise<CustomerAddress[]> => {
    try {
      const res = await apiClient.get<any>(API_ENDPOINTS.ADDRESSES.LIST);
      const payload = res.data;
      const data = payload?.data || payload;
      let rawList: any[] = [];
      if (Array.isArray(data)) rawList = data;
      else if (Array.isArray(data?.addresses)) rawList = data.addresses;
      else if (Array.isArray(data?.items)) rawList = data.items;
      else if (Array.isArray(payload?.addresses)) rawList = payload.addresses;

      return rawList.map((item, idx) => normalizeCustomerAddress(item, idx));
    } catch (err: any) {
      // Graceful fallback to user addresses endpoint
      try {
        const fbRes = await apiClient.get<any>(API_ENDPOINTS.USER.ADDRESSES);
        const fbPayload = fbRes.data;
        const fbData = fbPayload?.data || fbPayload;
        let fbList: any[] = [];
        if (Array.isArray(fbData)) fbList = fbData;
        else if (Array.isArray(fbData?.addresses)) fbList = fbData.addresses;
        return fbList.map((item, idx) => normalizeCustomerAddress(item, idx));
      } catch {
        if (__DEV__) {
          console.log('[addressesApi] getAddresses fallback notice:', err?.message || err);
        }
        return [];
      }
    }
  },

  /**
   * GET /api/addresses/{id} — Retrieve a single address by ID
   */
  getAddressById: async (id: string | number): Promise<CustomerAddress> => {
    const res = await apiClient.get<any>(API_ENDPOINTS.ADDRESSES.DETAIL(id));
    const payload = res.data;
    const item = payload?.data || payload;
    return normalizeCustomerAddress(item);
  },

  /**
   * POST /api/addresses — Saves a new delivery address with geographic coordinates
   */
  createAddress: async (payload: AddressCreatePayload | any): Promise<CustomerAddress> => {
    const res = await apiClient.post<any>(API_ENDPOINTS.ADDRESSES.CREATE, payload);
    const item = res.data?.data || res.data;
    return normalizeCustomerAddress(item);
  },

  /**
   * PUT /api/addresses/{id} — Updates an existing address
   */
  updateAddress: async (
    id: string | number,
    payload: AddressUpdatePayload | any
  ): Promise<CustomerAddress> => {
    const res = await apiClient.put<any>(API_ENDPOINTS.ADDRESSES.UPDATE(id), payload);
    const item = res.data?.data || res.data;
    return normalizeCustomerAddress(item);
  },

  /**
   * DELETE /api/addresses/{id} — Deletes an address
   */
  deleteAddress: async (id: string | number): Promise<{ success: boolean; message?: string }> => {
    const res = await apiClient.delete<any>(API_ENDPOINTS.ADDRESSES.DELETE(id));
    return res.data;
  },

  /**
   * PATCH /api/addresses/{id}/default — Marks the specified address as the default delivery address
   */
  setDefaultAddress: async (id: string | number): Promise<CustomerAddress> => {
    try {
      const res = await apiClient.patch<any>(API_ENDPOINTS.ADDRESSES.SET_DEFAULT(id));
      const item = res.data?.data || res.data;
      return normalizeCustomerAddress(item);
    } catch {
      const res = await apiClient.put<any>(API_ENDPOINTS.ADDRESSES.SET_DEFAULT(id));
      const item = res.data?.data || res.data;
      return normalizeCustomerAddress(item);
    }
  },
};

export default addressesApi;
