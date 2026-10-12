import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import {
  ApiChatConversation,
  ApiChatMessage,
  StartConversationRequest,
  SendMessageRequest,
} from '../../types/backend.types';

export const chatApi = {
  /**
   * GET /api/chat/conversations — List all chat conversations
   */
  listConversations: async (): Promise<ApiChatConversation[]> => {
    const response = await apiClient.get(API_ENDPOINTS.CHAT.CONVERSATIONS);
    const data = unwrapApiResponse<any>(response);
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  },

  /**
   * POST /api/chat/conversations — Start a new chat conversation with a seller
   */
  startConversation: async (payload: StartConversationRequest): Promise<ApiChatConversation> => {
    const response = await apiClient.post(API_ENDPOINTS.CHAT.START, payload);
    return unwrapApiResponse<ApiChatConversation>(response);
  },

  /**
   * GET /api/chat/conversations/{id}/messages — Get chat messages for conversation
   */
  getMessages: async (
    conversationId: number | string,
    params?: { page?: number; limit?: number }
  ): Promise<ApiChatMessage[]> => {
    const response = await apiClient.get(API_ENDPOINTS.CHAT.MESSAGES(conversationId), { params });
    const data = unwrapApiResponse<any>(response);
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  },

  /**
   * POST /api/chat/conversations/{id}/messages — Send a chat message
   */
  sendMessage: async (
    conversationId: number | string,
    payload: SendMessageRequest
  ): Promise<ApiChatMessage> => {
    const response = await apiClient.post(API_ENDPOINTS.CHAT.SEND(conversationId), payload);
    return unwrapApiResponse<ApiChatMessage>(response);
  },
};
