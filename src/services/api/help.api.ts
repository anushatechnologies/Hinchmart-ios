import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import {
  ApiSupportTicket,
  CreateTicketRequest,
  TicketMessage,
  ReplyTicketRequest,
} from '../../types/backend.types';

export const helpApi = {
  /**
   * GET /api/help/tickets — List support tickets
   * Supports ?status=OPEN & ?page=1&limit=20
   */
  listTickets: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiSupportTicket[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.HELP.TICKETS, { params });
      const payload: any = response.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.items)) return payload.items;
      return unwrapApiResponse<ApiSupportTicket[]>(response) || [];
    } catch (err: any) {
      console.warn('[helpApi.listTickets] Failed to fetch tickets:', err?.message);
      return [];
    }
  },

  /**
   * POST /api/help/tickets — Create a new support ticket
   * Backend generates TKT-<timestamp>, default status OPEN, default priority MEDIUM
   */
  createTicket: async (payload: CreateTicketRequest): Promise<ApiSupportTicket> => {
    const text = payload.message || payload.description || '';
    const body: any = {
      subject: payload.subject,
      category: payload.category || 'GENERAL',
      priority: payload.priority || 'MEDIUM',
      message: text,
      description: text,
    };
    if (payload.orderId) {
      body.orderId = Number(payload.orderId) || payload.orderId;
    }
    const response = await apiClient.post(API_ENDPOINTS.HELP.CREATE_TICKET, body);
    return unwrapApiResponse<ApiSupportTicket>(response);
  },

  /**
   * GET /api/help/tickets/{id} — Get ticket details with full message thread
   */
  getTicketDetails: async (ticketId: number | string): Promise<ApiSupportTicket> => {
    const cleanId = String(ticketId).replace(/^#/, '');
    const response = await apiClient.get(API_ENDPOINTS.HELP.TICKET_DETAIL(cleanId));
    return unwrapApiResponse<ApiSupportTicket>(response);
  },

  /**
   * POST /api/help/tickets/{id}/messages — Reply to ticket
   * If closed, automatically transitions status back to IN_PROGRESS
   */
  replyTicket: async (
    ticketId: number | string,
    payload: ReplyTicketRequest | { message?: string; content?: string; attachmentUrl?: string | null } | string
  ): Promise<TicketMessage> => {
    const cleanId = String(ticketId).replace(/^#/, '');
    const text = typeof payload === 'string' ? payload : (payload.content || payload.message || '');
    const attachmentUrl = typeof payload === 'object' ? payload.attachmentUrl : null;
    const body: any = {
      content: text,
      message: text,
    };
    if (attachmentUrl) {
      body.attachmentUrl = attachmentUrl;
    }
    const response = await apiClient.post(API_ENDPOINTS.HELP.REPLY(cleanId), body);
    return unwrapApiResponse<TicketMessage>(response);
  },
};
