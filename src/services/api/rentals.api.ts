import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import {
  ApiRentalEquipment,
  RentalAvailabilityResponse,
  RentalBookingRequest,
  RentalBookingResponse,
} from '../../types/backend.types';

export const rentalsApi = {
  /**
   * GET /api/rentals — List heavy rental equipment
   */
  listEquipment: async (params?: {
    category?: string;
    location?: string;
    available?: boolean;
  }): Promise<ApiRentalEquipment[]> => {
    const response = await apiClient.get(API_ENDPOINTS.RENTALS.LIST, { params });
    const data = unwrapApiResponse<any>(response);
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  },

  /**
   * Alias for listEquipment
   */
  getEquipmentList: async (params?: {
    category?: string;
    location?: string;
    available?: boolean;
  }): Promise<ApiRentalEquipment[]> => {
    const response = await apiClient.get(API_ENDPOINTS.RENTALS.LIST, { params });
    const data = unwrapApiResponse<any>(response);
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  },

  /**
   * GET /api/rentals/{id} — Get rental equipment details
   */
  getEquipmentDetails: async (id: number | string): Promise<ApiRentalEquipment> => {
    const response = await apiClient.get(API_ENDPOINTS.RENTALS.DETAIL(id));
    return unwrapApiResponse<ApiRentalEquipment>(response);
  },

  /**
   * GET /api/rentals/{id}/availability — Check availability for date range
   */
  checkAvailability: async (
    id: number | string,
    startDate: string,
    endDate: string
  ): Promise<RentalAvailabilityResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.RENTALS.AVAILABILITY(id), {
      params: { startDate, endDate },
    });
    return unwrapApiResponse<RentalAvailabilityResponse>(response);
  },

  /**
   * POST /api/rentals/book — Book rental equipment
   */
  bookEquipment: async (payload: RentalBookingRequest): Promise<RentalBookingResponse> => {
    const address = payload.deliveryAddress || payload.siteAddress || '';
    const body = {
      ...payload,
      equipmentId: Number(payload.equipmentId) || payload.equipmentId,
      deliveryAddress: address,
      siteAddress: address,
      notes: payload.notes || '',
    };
    const response = await apiClient.post(API_ENDPOINTS.RENTALS.BOOK, body);
    return unwrapApiResponse<RentalBookingResponse>(response);
  },
};
