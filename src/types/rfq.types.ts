/**
 * HINCH MART — RFQ Types
 */

export type RFQStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'quoted'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'completed'
  | 'QUOTED'
  | 'ACTIVE'
  | 'PENDING';

export interface RFQ {
  id?: string | number;
  rfqId?: string | number;
  rfqNumber?: string;
  title: string;
  category?: string;
  productMaterial?: string;
  quantity?: number;
  unit?: string;
  technicalGrade?: string;
  mtcRequired?: boolean;
  deliveryLocation?: string;
  requiredByDate?: string;
  siteAccess?: string;
  craneRequired?: boolean;
  targetBudget?: number;
  paymentTerms?: string;
  specifications?: string;
  boqAttachmentUrl?: string;
  status?: string;
  quotesCount?: number;
  description?: string;
  items?: RFQItem[];
  attachments?: RFQAttachment[];
  deadline?: string;
  preferredVendors?: string[];
  quotations?: Quotation[];
  approvedQuotationId?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RFQItem {
  id?: string | number;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  specifications?: string;
  preferredBrands?: string[];
}

export interface RFQAttachment {
  id?: string | number;
  name: string;
  url: string;
  type?: string;
  size?: number;
}

export interface Quotation {
  id: string | number;
  rfqId?: string | number;
  vendorId?: string | number;
  vendorName?: string;
  vendorLogo?: string;
  vendorRating?: number;
  items?: QuotationItem[];
  totalAmount?: number;
  price?: number;
  currency?: string;
  validUntil?: string;
  deliveryDays?: number;
  paymentTerms?: string;
  notes?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'quoted';
  submittedAt?: string;
}

export interface QuotationItem {
  rfqItemId?: string | number;
  name?: string;
  unitPrice?: number;
  quantity?: number;
  totalPrice?: number;
  brand?: string;
  remarks?: string;
}

export interface RFQQuestion {
  questionId: string | number;
  rfqId: string | number;
  vendorId?: string | number;
  question: string;
  answer?: string;
  createdAt?: string;
  answeredAt?: string;
}

export interface CreateRFQRequest {
  title: string;
  category?: string;
  productMaterial?: string;
  quantity?: number;
  unit?: string;
  technicalGrade?: string;
  mtcRequired?: boolean;
  deliveryLocation?: string;
  requiredByDate?: string;
  siteAccess?: string;
  craneRequired?: boolean;
  targetBudget?: number;
  paymentTerms?: string;
  specifications?: string;
  boqAttachmentUrl?: string;
  description?: string;
  items?: Omit<RFQItem, 'id'>[];
  deadline?: string;
  preferredVendors?: string[];
  notes?: string;
}
