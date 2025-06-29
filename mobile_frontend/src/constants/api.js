import { Platform } from 'react-native';

// Environment variables with fallback values
const DEV_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL_DEVELOPMENT || 'http://192.168.1.214:8080/api/mobile';
const PROD_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL_PRODUCTION || 'https://your-production-api.com/api/mobile';
const IOS_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL_IOS || 'http://localhost:8080/api/mobile';
const ANDROID_EMULATOR_URL = process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID_EMULATOR || 'http://10.0.2.2:8080/api/mobile';
const ANDROID_DEVICE_URL = process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID_DEVICE || 'http://192.168.1.214:8080/api/mobile';

// Get the appropriate base URL based on platform and environment
const getBaseUrl = () => {
  if (__DEV__) {
    // Development environment
    if (Platform.OS === 'android') {
      // Android emulator - try multiple options
      // Option 1: Standard emulator localhost (comment out if not working)
      // const androidUrl = ANDROID_EMULATOR_URL;
      
      // Option 2: If emulator is bridged, use local IP
      const androidUrl = ANDROID_DEVICE_URL;
      
      console.log('🤖 Android Platform - Using URL:', androidUrl);
      return androidUrl;
    } else if (Platform.OS === 'ios') {
      // iOS - Use localhost with tunnel mode
      const iosUrl = IOS_API_BASE_URL;
      console.log('🍎 iOS Platform - Using URL:', iosUrl);
      return iosUrl;
    } else {
      // For physical devices, use your local IP
      const physicalUrl = DEV_API_BASE_URL;
      console.log('📱 Physical Device - Using URL:', physicalUrl);
      return physicalUrl;
    }
  } else {
    // Production environment
    return PROD_API_BASE_URL;
  }
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

// Log the configuration (only in development)
if (__DEV__) {
  console.log('🔧 API Configuration:', {
    ...API_CONFIG,
    BASE_URL: API_CONFIG.BASE_URL.replace(/\/\/.*@/, '//***@') // Hide credentials if any
  });
}

// API Endpoints
export const ENDPOINTS = {
  // Vehicle endpoints
  VEHICLES: '/vehicles',
  VEHICLE_BY_ID: (id) => `/vehicles/${id}`,
  VEHICLE_SEARCH: '/vehicles/search',
  VEHICLE_STATS: '/vehicles/stats',
  VEHICLE_PRICE_RANGE: '/vehicles/price-range',
  VEHICLE_QR_SCAN: '/vehicles/qr-scan',
  VEHICLE_NEARBY: '/vehicles/nearby',
  VEHICLE_IN_BOUNDS: '/vehicles/in-bounds',
  
  // User endpoints
  USERS: '/users',
  USER_BY_ID: (id) => `/users/${id}`,
  USER_BY_EMAIL: (email) => `/users/email/${email}`,
  USER_SEARCH: '/users/search',
  USER_BY_ROLE: (role) => `/users/role/${role}`,
  USER_STATS: '/users/stats',
  CHECK_EMAIL: '/users/check-email',
  CHECK_PHONE: '/users/check-phone',
  USER_UPDATE_LOCATION: (id) => `/users/${id}/location`,
  
  // Auth endpoints
  AUTH_LOGIN: '/auth/login',
  AUTH_SIGNUP: '/auth/signup',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',
  
  // Document endpoints  
  DOCUMENTS: '/documents',
  DOCUMENT_UPLOAD: '/documents/upload',
  DOCUMENT_VERIFICATION_STATUS: (userId) => `/documents/user/${userId}/verification-status`,
  DOCUMENT_REFRESH_STATUS: '/documents/refresh-status',
  
  // Consent endpoints
  CONSENTS: '/consents',
  CONSENT_BY_USER: (userId) => `/consents/user/${userId}`,
  CONSENT_CREATE: '/consents',
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

export default API_CONFIG; 