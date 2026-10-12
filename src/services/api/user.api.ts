/**
 * HINCH MART — Live User, Customer & Address API Service
 * Base Routes:
 *   - /api/user/profile
 *   - /api/user/addresses
 *   - /api/customers
 *   - /api/documents
 */
import apiClient from './client';
import { API_ENDPOINTS } from '../../constants/api';

// ── Profile Types ───────────────────────────────────────────────────────────

export interface UserBusinessProfile {
  companyName: string;
  gstNumber: string;
  panNumber: string;
  businessType: string;
  isGstVerified?: boolean;
  creditLimit?: number;
  availableCredit?: number;
}

export interface UserProcurementStats {
  totalOrders: number;
  activeRfqs: number;
  wishlistItems: number;
  savedAddresses: number;
}

export interface UserProfileResponse {
  id: number | string;
  fullName: string;
  email: string;
  phone: string;
  role?: string;
  tier?: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  isProfileComplete?: boolean;
  procurementStats?: UserProcurementStats;
  business?: UserBusinessProfile;
}

export interface UserProfileUpdateRequest {
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  gstNumber?: string;
  panNumber?: string;
  businessType?: string;
  creditLimit?: number;
}

// ── Address Types ───────────────────────────────────────────────────────────

export interface SavedAddress {
  addressId?: number | string;
  id?: number | string;
  siteName: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
  hasHeavyVehicleAccess?: boolean;
  createdAt?: string;
}

export interface AddressRequestPayload {
  siteName: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
  hasHeavyVehicleAccess?: boolean;
}

// ── Customer Types ──────────────────────────────────────────────────────────

export interface CustomerAccount {
  customerId: number | string;
  id?: number | string;
  name: string;
  email: string;
  phone: string;
}

export interface CustomerRequestPayload {
  name: string;
  email: string;
  phone: string;
}

// ── KYC Document Types ──────────────────────────────────────────────────────

export type KycDocumentType =
  | 'GST_CERTIFICATE'
  | 'PAN_CARD'
  | 'AADHAAR_CARD'
  | 'TRADE_LICENSE'
  | 'COMPANY_INCORPORATION';

export interface CustomerKycDocument {
  documentId: number | string;
  id?: number | string;
  customerId: number | string;
  documentType: KycDocumentType;
  title: string;
  documentNumber: string;
  fileName: string;
  fileUrl: string;
  fileSize?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string | null;
  expiresOn?: string;
  uploadedAt?: string;
  verifiedAt?: string | null;
}

export interface CustomerDocumentRequestPayload {
  documentType: KycDocumentType;
  title: string;
  documentNumber: string;
  fileName: string;
  fileUrl: string;
  fileSize?: string;
  expiresOn?: string;
}

// ── User API Implementation ─────────────────────────────────────────────────

export const userApi = {
  // ── Profile ──
  getProfile: async (): Promise<UserProfileResponse> => {
    const response = await apiClient.get<UserProfileResponse | { data: UserProfileResponse }>(
      API_ENDPOINTS.USER.PROFILE
    );
    return ((response.data as any)?.data || response.data) as UserProfileResponse;
  },

  updateProfile: async (data: UserProfileUpdateRequest): Promise<UserProfileResponse> => {
    const cleanName = data.name || data.fullName;
    const payload = {
      ...data,
      name: cleanName,
      fullName: cleanName,
    };
    const response = await apiClient.put<UserProfileResponse | { data: UserProfileResponse }>(
      API_ENDPOINTS.USER.UPDATE_PROFILE,
      payload
    );
    return ((response.data as any)?.data || response.data) as UserProfileResponse;
  },

  // ── Saved Addresses ──
  getAddresses: async (): Promise<SavedAddress[]> => {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.ADDRESSES.LIST);
      const payload: any = response.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.addresses)) return payload.addresses;
      if (Array.isArray(payload?.items)) return payload.items;
      return [];
    } catch {
      try {
        const response = await apiClient.get<any>(API_ENDPOINTS.USER.ADDRESSES);
        const payload: any = response.data;
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.addresses)) return payload.addresses;
        return [];
      } catch {
        return [];
      }
    }
  },

  getAddressDetail: async (id: string | number): Promise<SavedAddress> => {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.ADDRESSES.DETAIL(id));
      return ((response.data as any)?.data || response.data) as SavedAddress;
    } catch {
      const response = await apiClient.get<any>(API_ENDPOINTS.USER.ADDRESS_DETAIL(id));
      return ((response.data as any)?.data || response.data) as SavedAddress;
    }
  },

  createAddress: async (data: AddressRequestPayload): Promise<SavedAddress> => {
    try {
      const response = await apiClient.post<any>(API_ENDPOINTS.ADDRESSES.CREATE, data);
      return ((response.data as any)?.data || response.data) as SavedAddress;
    } catch {
      const response = await apiClient.post<any>(API_ENDPOINTS.USER.ADDRESSES, data);
      return ((response.data as any)?.data || response.data) as SavedAddress;
    }
  },

  updateAddress: async (id: string | number, data: Partial<AddressRequestPayload>): Promise<SavedAddress> => {
    try {
      const response = await apiClient.put<any>(API_ENDPOINTS.ADDRESSES.UPDATE(id), data);
      return ((response.data as any)?.data || response.data) as SavedAddress;
    } catch {
      const response = await apiClient.put<any>(API_ENDPOINTS.USER.ADDRESS_DETAIL(id), data);
      return ((response.data as any)?.data || response.data) as SavedAddress;
    }
  },

  deleteAddress: async (id: string | number): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await apiClient.delete<any>(API_ENDPOINTS.ADDRESSES.DELETE(id));
      return response.data;
    } catch {
      const response = await apiClient.delete<any>(API_ENDPOINTS.USER.ADDRESS_DETAIL(id));
      return response.data;
    }
  },

  // ── Customer Accounts ──
  createCustomer: async (data: CustomerRequestPayload): Promise<CustomerAccount> => {
    const response = await apiClient.post<CustomerAccount | { data: CustomerAccount }>(
      API_ENDPOINTS.CUSTOMERS.CREATE,
      data
    );
    return ((response.data as any)?.data || response.data) as CustomerAccount;
  },

  getCustomer: async (id: string | number): Promise<CustomerAccount> => {
    const response = await apiClient.get<CustomerAccount | { data: CustomerAccount }>(
      API_ENDPOINTS.CUSTOMERS.DETAIL(id)
    );
    return ((response.data as any)?.data || response.data) as CustomerAccount;
  },

  updateCustomer: async (id: string | number, data: Partial<CustomerRequestPayload>): Promise<CustomerAccount> => {
    const response = await apiClient.put<CustomerAccount | { data: CustomerAccount }>(
      API_ENDPOINTS.CUSTOMERS.UPDATE(id),
      data
    );
    return ((response.data as any)?.data || response.data) as CustomerAccount;
  },

  deleteCustomer: async (id: string | number): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.delete(API_ENDPOINTS.CUSTOMERS.DELETE(id));
    return response.data;
  },

  // ── Customer KYC Documents ──
  submitDocument: async (
    customerId: string | number,
    data: CustomerDocumentRequestPayload
  ): Promise<CustomerKycDocument> => {
    const response = await apiClient.post<CustomerKycDocument | { data: CustomerKycDocument }>(
      API_ENDPOINTS.CUSTOMERS.DOCUMENTS(customerId),
      data
    );
    return ((response.data as any)?.data || response.data) as CustomerKycDocument;
  },

  getCustomerDocuments: async (customerId: string | number): Promise<CustomerKycDocument[]> => {
    const response = await apiClient.get<CustomerKycDocument[] | { data: CustomerKycDocument[] }>(
      API_ENDPOINTS.CUSTOMERS.DOCUMENTS(customerId)
    );
    const payload: any = response.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.documents)) return payload.documents;
    return [];
  },

  getDocumentDetail: async (documentId: string | number): Promise<CustomerKycDocument> => {
    const response = await apiClient.get<CustomerKycDocument | { data: CustomerKycDocument }>(
      API_ENDPOINTS.DOCUMENTS.DETAIL(documentId)
    );
    return ((response.data as any)?.data || response.data) as CustomerKycDocument;
  },

  deleteDocument: async (documentId: string | number): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.delete(API_ENDPOINTS.DOCUMENTS.DELETE(documentId));
    return response.data;
  },
};
