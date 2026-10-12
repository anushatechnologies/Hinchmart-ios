/**
 * HINCH MART — Location, Geocoding & Address Type Definitions
 * Source: LocationController.java, ServiceabilityController.java, AddressController.java
 */

export interface ReverseGeocodeRequest {
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodeData {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  addressLine1?: string;
  addressLine2?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface ReverseGeocodeResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ReverseGeocodeData;
  timestamp?: string;
}

export interface PincodeServiceabilityData {
  pincode: string;
  city: string;
  state: string;
  serviceable: boolean;
  estimatedDays: number;
  isExpressAvailable: boolean;
  area?: string;
  district?: string;
}

export interface PincodeServiceabilityResponse {
  success: boolean;
  statusCode: number;
  message: string;
  pincode?: string;
  city?: string;
  state?: string;
  serviceable?: boolean;
  estimatedDays?: number;
  isExpressAvailable?: boolean;
  area?: string;
  district?: string;
  data?: PincodeServiceabilityData;
  timestamp?: string;
}

export type AddressType = 'HOME' | 'WORK' | 'OTHER';

export interface CustomerAddress {
  addressId: number;
  siteName?: string;
  recipientName: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  houseFlatNo?: string;
  areaLocality?: string;
  city: string;
  state: string;
  country?: string;
  pincode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  addressType?: AddressType;
  isDefault?: boolean;
  hasHeavyVehicleAccess?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddressCreatePayload {
  siteName?: string;
  recipientName: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  houseFlatNo?: string;
  areaLocality?: string;
  city: string;
  state: string;
  country?: string;
  pincode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  addressType?: AddressType;
  isDefault?: boolean;
  hasHeavyVehicleAccess?: boolean;
}

export interface AddressUpdatePayload extends Partial<AddressCreatePayload> {}
