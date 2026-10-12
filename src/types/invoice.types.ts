/**
 * HINCH MART — Customer Tax Invoice & GST Types
 * Compatible with backend InvoiceController.java & OrderController.java
 */

export interface CustomerTaxInvoiceSummary {
  invoiceNumber: string;
  orderId: number;
  orderNumber: string;
  date: string;
  amount: number;
  downloadUrl: string;
  status: 'PAID' | 'PENDING' | 'CANCELLED' | string;
  createdAt: string;
}

export interface InvoiceItemDetail {
  itemId: number;
  description: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  gstRate: number;
  gstAmount: number;
}

export interface DetailedInvoiceBreakdown {
  invoiceNumber: string;
  orderId: number;
  orderNumber: string;
  invoiceDate: string;
  supplierName: string;
  supplierGstin: string;
  supplierAddress: string;
  sellerLegalName?: string;
  sellerGstin?: string;
  recipientName: string;
  recipientAddress: string;
  recipientGstin?: string;
  buyerLegalName?: string;
  buyerGstin?: string;
  placeOfSupply: string;
  paymentMethod: string;
  subtotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  freightCharge: number;
  craneUnloadingCharge: number;
  grandTotal: number;
  pdfUrl?: string;
  items: InvoiceItemDetail[];
}

export interface InvoiceFilterParams {
  financialYear?: string; // e.g. "2025-2026"
  startDate?: string;     // e.g. "2026-01-01"
  endDate?: string;       // e.g. "2026-03-31"
}

export interface InvoiceListResponse {
  success: boolean;
  message?: string;
  data: CustomerTaxInvoiceSummary[];
}

export interface DetailedInvoiceResponse {
  success: boolean;
  message?: string;
  data: DetailedInvoiceBreakdown;
}
