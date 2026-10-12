/**
 * HINCH MART — Vendors API Service
 */
import apiClient from './client';
import { API_ENDPOINTS } from '../../constants/api';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../../types/api.types';
import { Vendor, VendorDashboardStats, VendorPayment } from '../../types/vendor.types';
import { Product } from '../../types/product.types';
import { Order } from '../../types/order.types';

export const vendorsApi = {
  getVendors: (params: PaginationParams) =>
    apiClient.get<PaginatedResponse<Vendor>>(API_ENDPOINTS.VENDORS.LIST, { params }),

  getVendorDetail: (id: string) =>
    apiClient.get<ApiResponse<Vendor>>(API_ENDPOINTS.VENDORS.DETAIL(id)),

  getVendorProducts: (id: string, params: PaginationParams) =>
    apiClient.get<PaginatedResponse<Product>>(API_ENDPOINTS.VENDORS.PRODUCTS(id), { params }),

  // Vendor Dashboard (for vendor users)
  getDashboard: () =>
    apiClient.get<ApiResponse<VendorDashboardStats>>(API_ENDPOINTS.VENDORS.DASHBOARD),

  getVendorOrders: (params: PaginationParams & { status?: string }) =>
    apiClient.get<PaginatedResponse<Order>>(API_ENDPOINTS.VENDORS.ORDERS, { params }),

  getVendorPayments: (params: PaginationParams) =>
    apiClient.get<PaginatedResponse<VendorPayment>>(API_ENDPOINTS.VENDORS.PAYMENTS, { params }),
};
