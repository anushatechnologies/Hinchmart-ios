import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import {
  ApiWalletInfo,
  ApiWalletTransaction,
  ApiWalletReward,
  WalletTopupRequest,
} from '../../types/backend.types';

export const walletApi = {
  /**
   * GET /api/wallet/info — Get current wallet balance, tier, and loyalty points
   */
  getWalletInfo: async (): Promise<ApiWalletInfo> => {
    const response = await apiClient.get(API_ENDPOINTS.WALLET.INFO);
    return unwrapApiResponse<ApiWalletInfo>(response);
  },

  /**
   * GET /api/wallet/transactions — Get wallet transactions history
   */
  getTransactions: async (params?: { page?: number; limit?: number }): Promise<ApiWalletTransaction[]> => {
    const response = await apiClient.get(API_ENDPOINTS.WALLET.TRANSACTIONS, { params });
    const data = unwrapApiResponse<any>(response);
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  },

  /**
   * GET /api/wallet/rewards — Get active reward vouchers
   */
  getRewards: async (): Promise<ApiWalletReward[]> => {
    const response = await apiClient.get(API_ENDPOINTS.WALLET.REWARDS);
    const data = unwrapApiResponse<any>(response);
    if (Array.isArray(data)) return data;
    return [];
  },

  topupWallet: async (
    amountOrPayload: number | WalletTopupRequest,
    description?: string
  ): Promise<ApiWalletInfo> => {
    const payload: WalletTopupRequest =
      typeof amountOrPayload === 'number'
        ? { amount: amountOrPayload, description }
        : amountOrPayload;
    const response = await apiClient.post(API_ENDPOINTS.WALLET.TOPUP, payload);
    return unwrapApiResponse<ApiWalletInfo>(response);
  },
};
