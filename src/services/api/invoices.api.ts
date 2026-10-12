/**
 * HINCH MART — Live Customer Invoices API Service
 * Backed by InvoiceController.java & OrderController.java
 * Base URL: https://api.hinchmart.com
 */
import { Platform, Linking } from 'react-native';
import apiClient from './client';
import { API_BASE_URL, API_ENDPOINTS } from '../../constants/api';
import {
  CustomerTaxInvoiceSummary,
  DetailedInvoiceBreakdown,
  InvoiceFilterParams,
} from '../../types/invoice.types';

export const invoicesApi = {
  /**
   * 1. GET /api/invoices — List all tax invoices for authenticated customer
   * Ordered by newest first.
   * Optional params: financialYear (e.g. 2025-2026), startDate, endDate
   */
  listInvoices: async (params?: InvoiceFilterParams): Promise<CustomerTaxInvoiceSummary[]> => {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.INVOICES.LIST, { params });
      const payload = response.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.invoices)) return payload.invoices;
      return [];
    } catch (err: any) {
      console.warn('[invoicesApi.listInvoices] Failed to fetch invoices:', err?.message);
      return [];
    }
  },

  /**
   * 2. GET /api/invoices/{orderId}/download-pdf — Download binary PDF
   */
  downloadInvoicePdfBinary: async (orderId: number | string): Promise<Blob> => {
    const cleanId = String(orderId).replace(/^#/, '');
    const response = await apiClient.get(API_ENDPOINTS.INVOICES.DOWNLOAD_PDF(cleanId), {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * 3. GET /api/orders/{orderId}/invoice — Detailed B2B/B2C Invoice Breakdown (JSON)
   * Includes buyer/seller GSTINs, HSN codes, and itemized CGST/SGST/IGST breakdown.
   */
  getDetailedInvoice: async (orderId: number | string): Promise<DetailedInvoiceBreakdown> => {
    const cleanId = String(orderId).replace(/^#/, '');
    const response = await apiClient.get<any>(API_ENDPOINTS.ORDERS.INVOICE(cleanId));
    const payload = response.data;
    return (payload?.data || payload) as DetailedInvoiceBreakdown;
  },

  /**
   * 4. Helper URLs for Direct Download & In-Browser Preview
   */
  getInvoiceEndpointDownloadUrl: (orderId: number | string): string => {
    const cleanId = String(orderId).replace(/^#/, '');
    const base = apiClient.defaults.baseURL || API_BASE_URL;
    return `${base}/api/invoices/${cleanId}/download-pdf`;
  },

  getInvoiceOrderDownloadUrl: (orderId: number | string): string => {
    const cleanId = String(orderId).replace(/^#/, '');
    const base = apiClient.defaults.baseURL || API_BASE_URL;
    return `${base}/api/orders/${cleanId}/invoice/download`;
  },

  getInvoiceInlinePdfUrl: (orderId: number | string): string => {
    const cleanId = String(orderId).replace(/^#/, '');
    const base = apiClient.defaults.baseURL || API_BASE_URL;
    return `${base}/api/orders/${cleanId}/invoice/pdf`;
  },

  /**
   * 5. Unified, Authenticated PDF Download & Open Flow
   * Handles:
   * - Resolves real orderId & invoiceNumber
   * - Resolves true pdfUrl from authenticated getDetailedInvoice if summary only provided relative/empty link
   * - Public / Pre-signed CDN URLs: opened directly without false-positive canOpenURL checks
   * - Web Platform: authenticates with Bearer token, validates binary PDF, triggers Hinch-Mart-Invoice-<no>.pdf download
   * - Native Mobile (Android / iOS): opens document cleanly in device handler or external viewer
   */
  downloadOrOpenInvoicePdf: async (
    orderId: number | string,
    existingPdfUrl?: string | null,
    invoiceNumberHint?: string
  ): Promise<{ success: boolean; message?: string; url?: string }> => {
    const cleanId = String(orderId).replace(/^#/, '');

    // 1. Resolve invoice details if we don't already have a valid CDN URL
    let targetPdfUrl = existingPdfUrl && existingPdfUrl.startsWith('http') ? existingPdfUrl : null;
    let invNum = invoiceNumberHint || `INV-${cleanId}`;

    if (!targetPdfUrl || targetPdfUrl.includes('/api/')) {
      try {
        const details = await invoicesApi.getDetailedInvoice(cleanId);
        if (details) {
          if (details.invoiceNumber) invNum = details.invoiceNumber;
          if (details.pdfUrl && details.pdfUrl.startsWith('http')) {
            targetPdfUrl = details.pdfUrl;
          }
        }
      } catch (err: any) {
        console.warn('[invoicesApi.downloadOrOpenInvoicePdf] getDetailedInvoice lookup notice:', err?.message);
      }
    }

    // 2. Web Runtime (Desktop & Mobile Browser)
    if (Platform.OS === 'web') {
      try {
        const isExternalCdn =
          targetPdfUrl &&
          !targetPdfUrl.includes('api.hinchmart.com') &&
          !targetPdfUrl.includes('/api/');

        if (isExternalCdn && typeof window !== 'undefined' && window.open) {
          window.open(targetPdfUrl!, '_blank');
          return { success: true, url: targetPdfUrl! };
        }

        // Fetch binary through authenticated apiClient (sends Bearer token automatically)
        const fetchUrl = targetPdfUrl || API_ENDPOINTS.INVOICES.DOWNLOAD_PDF(cleanId);
        const response = await apiClient.get(fetchUrl, {
          responseType: 'blob',
          headers: {
            Accept: 'application/pdf, application/octet-stream, */*',
          },
        });

        // Validate content type
        const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
        if (contentType.includes('application/json')) {
          const text = await (response.data as Blob).text();
          try {
            const errJson = JSON.parse(text);
            throw new Error(errJson.message || 'Invoice PDF not available');
          } catch {
            throw new Error('Received error response from server');
          }
        }

        const blob =
          response.data instanceof Blob
            ? response.data
            : new Blob([response.data], { type: 'application/pdf' });

        if (blob.size === 0) {
          throw new Error('Received empty PDF document from server');
        }

        if (typeof window !== 'undefined' && window.URL && document) {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `Hinch-Mart-Invoice-${invNum}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
          return { success: true, message: 'Invoice PDF downloaded successfully' };
        }
      } catch (webErr: any) {
        if (targetPdfUrl && typeof window !== 'undefined' && window.open) {
          window.open(targetPdfUrl, '_blank');
          return { success: true, url: targetPdfUrl };
        }
        throw webErr;
      }
    }

    // 3. Native Mobile Runtime (Android / iOS)
    // If a direct pre-signed/CDN URL is available
    if (
      targetPdfUrl &&
      targetPdfUrl.startsWith('http') &&
      !targetPdfUrl.includes('api.hinchmart.com') &&
      !targetPdfUrl.includes('/api/')
    ) {
      try {
        await Linking.openURL(targetPdfUrl);
        return { success: true, url: targetPdfUrl };
      } catch (linkErr: any) {
        console.warn('[invoicesApi.downloadOrOpenInvoicePdf] Native openURL error:', linkErr?.message);
        throw new Error('Could not open invoice URL in PDF viewer.');
      }
    }

    // 4. For protected endpoints on api.hinchmart.com:
    const protectedUrl = targetPdfUrl || invoicesApi.getInvoiceEndpointDownloadUrl(cleanId);
    try {
      await Linking.openURL(protectedUrl);
      return { success: true, url: protectedUrl };
    } catch {
      const altUrl = invoicesApi.getInvoiceOrderDownloadUrl(cleanId);
      await Linking.openURL(altUrl);
      return { success: true, url: altUrl };
    }
  },
};
