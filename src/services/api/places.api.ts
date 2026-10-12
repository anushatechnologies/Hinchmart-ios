/**
 * HINCH MART — Production Google Places & Location Search API
 * 
 * Direct integration with Google Places Platform (Autocomplete & Place Details)
 * Authorized with Google Cloud Android credentials (package + SHA-1 certificate).
 */
import * as Location from 'expo-location';

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBQHBaFfRCHgCGKIpSm-EOsVy8dExFToeA';

const ANDROID_PACKAGE = 'com.hinch';
const ANDROID_CERT_SHA1 = '169900607E47A7CAFD4926F9D1C7E947BD833EDB';

export interface GooglePlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface GooglePlaceCoordinates {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  name: string;
  city?: string;
  state?: string;
  pincode?: string;
}

// In-memory cache for fast autocomplete
const autocompleteCache = new Map<string, GooglePlacePrediction[]>();
const detailsCache = new Map<string, GooglePlaceCoordinates>();

export const googlePlacesApi = {
  /**
   * Search places via Google Places Autocomplete API
   * Searches areas, landmarks, street names, commercial buildings, and addresses across India.
   */
  autocomplete: async (query: string): Promise<GooglePlacePrediction[]> => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return [];

    const cacheKey = trimmed.toLowerCase();
    if (autocompleteCache.has(cacheKey)) {
      return autocompleteCache.get(cacheKey)!;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        trimmed
      )}&components=country:in&language=en&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Android-Package': ANDROID_PACKAGE,
          'X-Android-Cert': ANDROID_CERT_SHA1,
        },
      });

      const data = await response.json();

      if (data.status === 'OK' && Array.isArray(data.predictions)) {
        const results: GooglePlacePrediction[] = data.predictions.map((p: any) => ({
          placeId: p.place_id,
          description: p.description,
          mainText: p.structured_formatting?.main_text || p.description,
          secondaryText: p.structured_formatting?.secondary_text || '',
        }));

        autocompleteCache.set(cacheKey, results);
        return results;
      }

      if (__DEV__) {
        console.log('[googlePlacesApi] autocomplete status:', data.status, data.error_message || '');
      }
    } catch (err: any) {
      if (__DEV__) {
        console.log('[googlePlacesApi] autocomplete network error:', err?.message || err);
      }
    }

    // Graceful fallback to Expo Geocoding
    try {
      const geoResults = await Location.geocodeAsync(trimmed);
      if (geoResults && geoResults.length > 0) {
        return geoResults.slice(0, 4).map((g, idx) => {
          const id = `expo_geo_${idx}_${Date.now()}`;
          const coords: GooglePlaceCoordinates = {
            latitude: g.latitude,
            longitude: g.longitude,
            formattedAddress: `${trimmed}, India`,
            name: trimmed,
            city: 'Hyderabad',
            state: 'Telangana',
          };
          detailsCache.set(id, coords);
          return {
            placeId: id,
            description: `${trimmed} (${g.latitude.toFixed(4)}, ${g.longitude.toFixed(4)})`,
            mainText: trimmed,
            secondaryText: 'Geocoded Location',
          };
        });
      }
    } catch {
      // Ignore fallback error
    }

    return [];
  },

  /**
   * Fetch Place Coordinates & Details via Google Place Details API
   */
  getPlaceDetails: async (placeId: string): Promise<GooglePlaceCoordinates | null> => {
    if (!placeId) return null;

    if (detailsCache.has(placeId)) {
      return detailsCache.get(placeId)!;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        placeId
      )}&fields=name,formatted_address,geometry,address_components&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Android-Package': ANDROID_PACKAGE,
          'X-Android-Cert': ANDROID_CERT_SHA1,
        },
      });

      const data = await response.json();

      if (data.status === 'OK' && data.result?.geometry?.location) {
        const loc = data.result.geometry.location;
        const comps = data.result.address_components || [];

        let city = '';
        let state = '';
        let pincode = '';

        for (const c of comps) {
          if (c.types.includes('locality')) city = c.long_name;
          else if (!city && c.types.includes('administrative_area_level_2')) city = c.long_name;
          if (c.types.includes('administrative_area_level_1')) state = c.long_name;
          if (c.types.includes('postal_code')) pincode = c.long_name;
        }

        const details: GooglePlaceCoordinates = {
          latitude: loc.lat,
          longitude: loc.lng,
          formattedAddress: data.result.formatted_address || data.result.name,
          name: data.result.name || data.result.formatted_address,
          city: city || 'Hyderabad',
          state: state || 'Telangana',
          pincode,
        };

        detailsCache.set(placeId, details);
        return details;
      }
    } catch (err: any) {
      if (__DEV__) {
        console.log('[googlePlacesApi] getPlaceDetails error:', err?.message || err);
      }
    }

    return null;
  },
};
