/**
 * HINCH MART — Delivery Serviceability & Hyderabad 24-Hour Validation Service
 * 
 * Strict Enforcement:
 * - 24-Hour Express Delivery is EXCLUSIVELY available for the Hyderabad municipal service area.
 * - Non-Hyderabad locations are strictly blocked from 24-Hour delivery catalogs and checkouts.
 */

export interface ServiceabilityResult {
  isServiceable: boolean;
  serviceType: '24_HOURS' | 'STANDARD_ONLY';
  city: string;
  pincode?: string;
  locationName: string;
  message: string;
  estimatedDeliveryTime: string;
}

// Authoritative Hyderabad & Secunderabad PIN code prefixes (500xxx)
// Covers central, cyberabad, industrial corridors, and suburban project zones
export const HYDERABAD_PINCODE_PREFIXES = [
  '500', // All Hyderabad, Secunderabad, Cyberabad, Outer Ring Road corridors
];

// Authoritative list of known Hyderabad zones & keywords for text-based match validation
export const HYDERABAD_ZONE_KEYWORDS = [
  'hyderabad',
  'secunderabad',
  'cyberabad',
  'madhapur',
  'gachibowli',
  'hitec city',
  'hitech city',
  'kondapur',
  'manikonda',
  'kukatpally',
  'banjara hills',
  'jubilee hills',
  'begumpet',
  'ameerpet',
  'somajiguda',
  'miyapur',
  'chandanagar',
  'narsingi',
  'kokapet',
  'financial district',
  'tellapur',
  'shamshabad',
  'uppal',
  'lb nagar',
  'nacharam',
  'sanath nagar',
  'balanagar',
  'jeedimetla',
  'patancheru',
  'bachupally',
  'kothaguda',
  'hafeezpet',
  'bowenpally',
  'alwal',
  'tarnaka',
  'dilsukhnagar',
  'abids',
  'koti',
  'charminar',
  'attapur',
  'mehdipatnam',
  'tolichowki',
  'shaikpet',
  'film nagar',
  'nanakramguda',
  'raidurg',
  'khajaguda',
  'puppaalguda',
  'gandipet',
];

/**
 * Checks whether a given location (address string, city, pincode, or site object)
 * falls strictly within the Hyderabad 24-Hour Serviceable Delivery Area.
 */
export function isHyderabadServiceable(
  location:
    | string
    | {
        city?: string;
        address?: string;
        name?: string;
        country?: string;
        pincode?: string;
        latitude?: number;
        longitude?: number;
      }
    | null
    | undefined
): boolean {
  if (!location) return false;

  // Case A: string address input
  if (typeof location === 'string') {
    const lower = location.toLowerCase().trim();
    return HYDERABAD_ZONE_KEYWORDS.some((keyword) => lower.includes(keyword));
  }

  // Case B: object input (DeliverySite, Address, or Geo object)
  const city = (location.city || '').toLowerCase().trim();
  const address = (location.address || '').toLowerCase().trim();
  const name = (location.name || '').toLowerCase().trim();
  const country = (location.country || '').toLowerCase().trim();
  const pincode = (location.pincode || '').trim();

  // 1. PIN code validation: 500xxx series
  if (pincode && pincode.length >= 3) {
    if (pincode.startsWith('500')) return true;
  }

  // 2. City name validation
  if (city) {
    if (city === 'hyderabad' || city === 'secunderabad' || city === 'cyberabad') {
      return true;
    }
    if (HYDERABAD_ZONE_KEYWORDS.some((kw) => city.includes(kw))) {
      return true;
    }
  }

  // 3. Address text validation
  if (address && HYDERABAD_ZONE_KEYWORDS.some((kw) => address.includes(kw))) {
    return true;
  }

  // 4. Site name / district validation
  if (name && HYDERABAD_ZONE_KEYWORDS.some((kw) => name.includes(kw))) {
    return true;
  }

  // 5. GPS Bounding Box Validation for Greater Hyderabad Region (Lat: 17.20 - 17.65, Long: 78.20 - 78.65)
  if (
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    location.latitude >= 17.20 &&
    location.latitude <= 17.65 &&
    location.longitude >= 78.20 &&
    location.longitude <= 78.65
  ) {
    return true;
  }

  return false;
}

/**
 * Validates 24-Hour delivery eligibility for an address or site with detailed response.
 */
export function check24HourServiceability(
  location:
    | string
    | {
        city?: string;
        address?: string;
        name?: string;
        country?: string;
        pincode?: string;
        latitude?: number;
        longitude?: number;
      }
    | null
    | undefined
): ServiceabilityResult {
  const isEligible = isHyderabadServiceable(location);

  const locName =
    typeof location === 'string'
      ? location
      : location?.city || location?.name || location?.address || 'Current Location';

  if (isEligible) {
    return {
      isServiceable: true,
      serviceType: '24_HOURS',
      city: 'Hyderabad',
      pincode: typeof location === 'object' ? location?.pincode : undefined,
      locationName: locName,
      message: '⚡ 24-Hour Express Dispatch Available for this location.',
      estimatedDeliveryTime: 'Within 24 Hours',
    };
  }

  return {
    isServiceable: false,
    serviceType: 'STANDARD_ONLY',
    city: typeof location === 'object' ? location?.city || 'Outside Hyderabad' : locName,
    pincode: typeof location === 'object' ? location?.pincode : undefined,
    locationName: locName,
    message: '📍 24-Hour Delivery is currently available ONLY in Hyderabad.',
    estimatedDeliveryTime: 'Standard Shipping (3-5 Business Days)',
  };
}
