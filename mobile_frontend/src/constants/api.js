import { Platform } from 'react-native';

// Get the appropriate base URL based on platform and environment
const getBaseUrl = () => {
  if (__DEV__) {
    // Development environment
    if (Platform.OS === 'android') {
      // Android emulator - try multiple options
      // Option 1: Standard emulator localhost (comment out if not working)
      // const androidUrl = 'http://10.0.2.2:8080/api/mobile';
      
      // Option 2: If emulator is bridged, use local IP
      const androidUrl = 'http://192.168.1.214:8080/api/mobile';
      
      console.log('🤖 Android Platform - Using URL:', androidUrl);
      return androidUrl;
    } else if (Platform.OS === 'ios') {
      // iOS simulator can use localhost
      const iosUrl = 'http://localhost:8080/api/mobile';
      console.log('🍎 iOS Platform - Using URL:', iosUrl);
      return iosUrl;
    } else {
      // For physical devices, use your local IP
      const physicalUrl = 'http://192.168.1.214:8080/api/mobile';
      console.log('📱 Physical Device - Using URL:', physicalUrl);
      return physicalUrl;
    }
  } else {
    // Production environment
    return 'https://your-production-api.com/api/mobile';
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

// Log the configuration
console.log('🔧 API Configuration:', API_CONFIG);

// API Endpoints
export const ENDPOINTS = {
  // Vehicle endpoints
  VEHICLES: '/vehicles',
  VEHICLE_BY_ID: (id) => `/vehicles/${id}`,
  VEHICLE_SEARCH: '/vehicles/search',
  VEHICLE_PRICE_RANGE: '/vehicles/price-range',
  VEHICLES_WITH_LOCATION: '/vehicles/with-location',
  VEHICLE_STATS: '/vehicles/stats',
  
  // User endpoints
  USERS: '/users',
  USER_BY_ID: (id) => `/users/${id}`,
  USER_BY_EMAIL: (email) => `/users/email/${email}`,
  USER_SEARCH: '/users/search',
  USER_BY_ROLE: (role) => `/users/role/${role}`,
  USER_STATS: '/users/stats',
  CHECK_EMAIL: '/users/check-email',
  CHECK_PHONE: '/users/check-phone',
  
  // Auth endpoints (if implemented later)
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',
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