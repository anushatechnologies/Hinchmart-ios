/**
 * HINCH MART — Live Location & Reverse-Geocoding API Service
 * Source: LocationController.java & ServiceabilityController.java
 * 
 * Endpoints:
 * - POST /api/location/reverse-geocode
 * - GET  /api/location/pincode/{pincode}
 * - GET  /api/location/serviceability/check?pincode={pincode}
 * - GET  /api/serviceability/check?pincode={pincode}
 */
import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import {
  ReverseGeocodeData,
  ReverseGeocodeResponse,
  PincodeServiceabilityData,
  PincodeServiceabilityResponse,
} from '../../types/location.types';

// In-memory cache for reverse-geocoded coordinates (rounded to 4 decimal places ≈ 11m accuracy)
const reverseGeocodeCache = new Map<string, { data: ReverseGeocodeData; timestamp: number }>();
const pincodeCache = new Map<string, { data: PincodeServiceabilityData; timestamp: number }>();

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const locationApi = {
  /**
   * POST /api/location/reverse-geocode
   * Resolves GPS coordinates into a full street address using Google Maps / Nominatim backend.
   */
  reverseGeocode: async (
    latitude: number,
    longitude: number
  ): Promise<ReverseGeocodeData> => {
    const key = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    const cached = reverseGeocodeCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const response = await apiClient.post<ReverseGeocodeResponse>(
        API_ENDPOINTS.LOCATION.REVERSE_GEOCODE,
        {
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
        }
      );

      const raw = response.data;
      const data: ReverseGeocodeData = raw?.data || raw;

      if (data && (data.formattedAddress || data.city)) {
        reverseGeocodeCache.set(key, { data, timestamp: Date.now() });
        return data;
      }

      throw new Error(raw?.message || 'Empty reverse geocode response');
    } catch (err: any) {
      if (__DEV__) {
        console.log('[locationApi] reverseGeocode fallback notice:', err?.message || err);
      }
      // Re-throw so caller can use device-side Expo Location fallback if needed
      throw err;
    }
  },

  /**
   * GET /api/location/pincode/{pincode}
   * Retrieves location details and serviceability metadata by 6-digit postal code.
   */
  lookupPincode: async (pincode: string | number): Promise<PincodeServiceabilityData> => {
    const cleanPin = String(pincode).trim();
    const cached = pincodeCache.get(cleanPin);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const response = await apiClient.get<PincodeServiceabilityResponse>(
        API_ENDPOINTS.LOCATION.PINCODE(cleanPin)
      );
      const raw = response.data;
      const payload = raw?.data || raw;

      const result: PincodeServiceabilityData = {
        pincode: cleanPin,
        city: payload.city || raw.city || 'Hyderabad',
        state: payload.state || raw.state || 'Telangana',
        serviceable: payload.serviceable !== undefined ? payload.serviceable : (raw.serviceable ?? true),
        estimatedDays: payload.estimatedDays ?? raw.estimatedDays ?? 2,
        isExpressAvailable: payload.isExpressAvailable !== undefined ? payload.isExpressAvailable : (raw.isExpressAvailable ?? true),
        area: payload.area || raw.area || '',
        district: payload.district || raw.district || '',
      };

      pincodeCache.set(cleanPin, { data: result, timestamp: Date.now() });
      return result;
    } catch (err: any) {
      if (__DEV__) {
        console.log('[locationApi] lookupPincode fallback notice:', err?.message || err);
      }
      return {
        pincode: cleanPin,
        city: 'Hyderabad',
        state: 'Telangana',
        serviceable: true,
        estimatedDays: 2,
        isExpressAvailable: cleanPin.startsWith('500'),
      };
    }
  },

  /**
   * GET /api/location/serviceability/check?pincode={pincode}
   * Checks if an address or user location can be serviced for delivery.
   */
  checkServiceability: async (pincode?: string | number): Promise<PincodeServiceabilityData> => {
    const cleanPin = pincode ? String(pincode).trim() : '';
    if (cleanPin) {
      const cached = pincodeCache.get(cleanPin);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }
    }

    try {
      let response;
      try {
        response = await apiClient.get<PincodeServiceabilityResponse>(
          API_ENDPOINTS.LOCATION.SERVICEABILITY,
          { params: cleanPin ? { pincode: cleanPin } : {} }
        );
      } catch {
        // Fallback to dedicated ServiceabilityController
        response = await apiClient.get<PincodeServiceabilityResponse>(
          API_ENDPOINTS.SERVICEABILITY.CHECK,
          { params: cleanPin ? { pincode: cleanPin } : {} }
        );
      }

      const raw = response.data;
      const payload = raw?.data || raw;

      const result: PincodeServiceabilityData = {
        pincode: cleanPin || payload.pincode || raw.pincode || '',
        city: payload.city || raw.city || 'Hyderabad',
        state: payload.state || raw.state || 'Telangana',
        serviceable: payload.serviceable !== undefined ? payload.serviceable : (raw.serviceable ?? true),
        estimatedDays: payload.estimatedDays ?? raw.estimatedDays ?? 2,
        isExpressAvailable: payload.isExpressAvailable !== undefined ? payload.isExpressAvailable : (raw.isExpressAvailable ?? true),
        area: payload.area || raw.area || '',
        district: payload.district || raw.district || '',
      };

      if (cleanPin) {
        pincodeCache.set(cleanPin, { data: result, timestamp: Date.now() });
      }
      return result;
    } catch {
      return {
        pincode: cleanPin,
        city: 'Hyderabad',
        state: 'Telangana',
        serviceable: true,
        estimatedDays: 2,
        isExpressAvailable: cleanPin ? cleanPin.startsWith('500') : true,
      };
    }
  },
};
