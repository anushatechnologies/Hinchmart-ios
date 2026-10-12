/**
 * HINCH MART — Live RFQ API Service
 * Base URL: https://api.hinchmart.com/api/rfqs
 */
import apiClient from './client';
import { API_ENDPOINTS } from '../../constants/api';
import { RFQ, Quotation, CreateRFQRequest, RFQQuestion } from '../../types/rfq.types';

export const rfqApi = {
  /**
   * GET /api/rfqs — Fetch all RFQ requests for buyer
   */
  getRFQs: async (params?: { page?: number; limit?: number; status?: string }): Promise<RFQ[]> => {
    const response = await apiClient.get<RFQ[] | { data: RFQ[] }>(API_ENDPOINTS.RFQ.LIST, { params });
    const payload: any = response.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.rfqs)) return payload.rfqs;
    return [];
  },

  /**
   * POST /api/rfqs — Submit a new live RFQ
   */
  createRFQ: async (data: CreateRFQRequest): Promise<RFQ> => {
    const payload = {
      title: data.title,
      category: data.category || 'Civil & Structural',
      productMaterial: data.productMaterial || data.title,
      quantity: Number(data.quantity) || 1,
      unit: data.unit || 'MT',
      technicalGrade: data.technicalGrade || '',
      mtcRequired: Boolean(data.mtcRequired),
      deliveryLocation: data.deliveryLocation || '',
      requiredByDate: data.requiredByDate || '',
      siteAccess: data.siteAccess || 'Heavy Trailer Access Available',
      craneRequired: Boolean(data.craneRequired),
      targetBudget: Number(data.targetBudget) || 0,
      paymentTerms: data.paymentTerms || 'LETTER_OF_CREDIT',
      specifications: data.specifications || '',
      boqAttachmentUrl: data.boqAttachmentUrl || '',
    };
    const response = await apiClient.post<RFQ | { data: RFQ }>(API_ENDPOINTS.RFQ.CREATE, payload);
    return ((response.data as any)?.data || response.data) as RFQ;
  },

  /**
   * GET /api/rfqs/{id} — Fetch single RFQ detail
   */
  getRFQDetail: async (id: string | number): Promise<RFQ> => {
    const cleanId = String(id).replace(/^#/, '');
    const response = await apiClient.get<RFQ | { data: RFQ }>(API_ENDPOINTS.RFQ.DETAIL(cleanId));
    return ((response.data as any)?.data || response.data) as RFQ;
  },

  /**
   * GET /api/rfqs/{id}/quotations — Fetch vendor quotations for an RFQ
   */
  getQuotations: async (rfqId: string | number): Promise<Quotation[]> => {
    const cleanId = String(rfqId).replace(/^#/, '');
    const response = await apiClient.get<Quotation[] | { data: Quotation[] }>(API_ENDPOINTS.RFQ.QUOTATIONS(cleanId));
    const payload: any = response.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.quotations)) return payload.quotations;
    return [];
  },

  /**
   * POST /api/rfqs/{id}/quotations — Post quote (for vendors)
   */
  postQuotation: async (rfqId: string | number, data: Partial<Quotation>): Promise<Quotation> => {
    const cleanId = String(rfqId).replace(/^#/, '');
    const response = await apiClient.post<Quotation | { data: Quotation }>(
      API_ENDPOINTS.RFQ.POST_QUOTATION(cleanId),
      data
    );
    return ((response.data as any)?.data || response.data) as Quotation;
  },

  /**
   * POST /api/rfqs/quotes/{id}/accept — Accept quotation
   */
  acceptQuote: async (quoteId: string | number): Promise<any> => {
    const response = await apiClient.post(API_ENDPOINTS.RFQ.ACCEPT_QUOTE(quoteId));
    return response.data;
  },

  /**
   * GET /api/rfqs/{id}/questions — Fetch questions asked on this RFQ
   */
  getQuestions: async (rfqId: string | number): Promise<RFQQuestion[]> => {
    const cleanId = String(rfqId).replace(/^#/, '');
    const response = await apiClient.get<RFQQuestion[] | { data: RFQQuestion[] }>(API_ENDPOINTS.RFQ.QUESTIONS(cleanId));
    const payload: any = response.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  },

  /**
   * POST /api/rfqs/{id}/questions — Ask a clarification question on an RFQ
   */
  postQuestion: async (rfqId: string | number, question: string, askedBy: string = 'BUYER'): Promise<RFQQuestion> => {
    const cleanId = String(rfqId).replace(/^#/, '');
    const response = await apiClient.post<RFQQuestion | { data: RFQQuestion }>(
      API_ENDPOINTS.RFQ.POST_QUESTION(cleanId),
      { question, askedBy }
    );
    return ((response.data as any)?.data || response.data) as RFQQuestion;
  },

  /**
   * POST /api/rfqs/questions/{questionId}/answer — Answer a clarification question
   */
  answerQuestion: async (questionId: string | number, answer: string): Promise<any> => {
    const response = await apiClient.post(API_ENDPOINTS.RFQ.ANSWER_QUESTION(questionId), {
      response: answer,
      answer,
    });
    return response.data;
  },
};
