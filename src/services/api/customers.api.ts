import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import { ApiCustomer, CustomerCreateRequest } from '../../types/backend.types';

export const customersApi = {
  /**
   * POST /api/customers — Create Customer
   */
  createCustomer: async (payload: CustomerCreateRequest): Promise<ApiCustomer> => {
    const response = await apiClient.post(API_ENDPOINTS.CUSTOMERS.CREATE, payload);
    return unwrapApiResponse<ApiCustomer>(response);
  },

  /**
   * GET /api/customers/{id} — Get Customer by ID
   */
  getCustomerById: async (id: number | string): Promise<ApiCustomer> => {
    const response = await apiClient.get(API_ENDPOINTS.CUSTOMERS.DETAIL(id));
    return unwrapApiResponse<ApiCustomer>(response);
  },

  /**
   * GET /api/customers — Get All Customers
   */
  getAllCustomers: async (): Promise<ApiCustomer[]> => {
    const response = await apiClient.get(API_ENDPOINTS.CUSTOMERS.LIST);
    const data = unwrapApiResponse<any>(response);
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  },

  /**
   * PUT /api/customers/{id} — Update Customer
   */
  updateCustomer: async (id: number | string, payload: Partial<CustomerCreateRequest>): Promise<ApiCustomer> => {
    const response = await apiClient.put(API_ENDPOINTS.CUSTOMERS.UPDATE(id), payload);
    return unwrapApiResponse<ApiCustomer>(response);
  },

  /**
   * DELETE /api/customers/{id} — Delete Customer
   */
  deleteCustomer: async (id: number | string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(API_ENDPOINTS.CUSTOMERS.DELETE(id));
    return unwrapApiResponse(response);
  },

  /**
   * POST /api/customer/documents — Upload KYC or business document
   */
  uploadDocument: async (payload: {
    documentType: string;
    documentUrl: string;
    documentNumber: string;
  }): Promise<any> => {
    const response = await apiClient.post(API_ENDPOINTS.CUSTOMER_DOCUMENTS.UPLOAD, payload);
    return unwrapApiResponse<any>(response);
  },

  /**
   * GET /api/customer/documents — List uploaded KYC / business documents
   */
  getDocuments: async (): Promise<any[]> => {
    const response = await apiClient.get(API_ENDPOINTS.CUSTOMER_DOCUMENTS.LIST);
    const data = unwrapApiResponse<any>(response);
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  },
};
