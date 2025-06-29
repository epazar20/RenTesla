import axios from 'axios';
import { API_CONFIG, HTTP_STATUS } from '../constants/api';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'jwt_token';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
});

// Helper function to get token
const getAuthToken = async () => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    console.log('🔑 Retrieved token from SecureStore:', token ? `${token.substring(0, 20)}...` : 'null');
    return token;
  } catch (error) {
    console.error('❌ Error getting auth token:', error);
    return null;
  }
};

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Add auth token if available
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 Authorization header set:', `Bearer ${token.substring(0, 20)}...`);
    } else {
      console.log('⚠️ No token available for request');
    }
    
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.error('❌ Response Error:', error.response?.status, error.response?.data);
    
    // Handle specific error cases
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
      // Handle token expiration - clear stored auth data
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync('user_data');
        console.log('🔐 Auth token cleared due to 401');
        // You can dispatch a logout action here if using Redux/Context
      } catch (clearError) {
        console.error('Error clearing auth data:', clearError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Generic API methods
export const apiService = {
  // GET request
  get: async (url, params = {}) => {
    try {
      const response = await apiClient.get(url, { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // POST request
  post: async (url, data = {}) => {
    try {
      const response = await apiClient.post(url, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // PUT request
  put: async (url, data = {}) => {
    try {
      const response = await apiClient.put(url, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // DELETE request
  delete: async (url) => {
    try {
      const response = await apiClient.delete(url);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // PRD: User Consent Management
  submitConsents: async (userId, consents) => {
    const requestData = {
      userId: userId,
      consents: Object.entries(consents).map(([key, value]) => ({
        type: getConsentType(key),
        given: value,
        consentText: getConsentText(key)
      })),
      ipAddress: await getDeviceIP(),
      userAgent: 'RenTeslaMobileApp/1.0'
    };
    
    return apiService.post('/consents/submit', requestData);
  },

  getUserConsentStatus: async (userId) => {
    return apiService.get(`/consents/user/${userId}/status`);
  },

  revokeConsent: async (userId, consentType) => {
    return apiService.post('/consents/revoke', {
      userId: userId,
      consentType: consentType
    });
  },

  // PRD: Document Management
  uploadDocument: async (userId, documentType, imageBase64, fileName, face = null) => {
    return apiService.post('/documents/upload', {
      userId: userId,
      documentType: documentType,
      imageBase64: imageBase64,
      fileName: fileName,
      face: face
    });
  },

  getUserDocuments: async (userId) => {
    return apiService.get(`/documents/user/${userId}`);
  },

  getDocumentById: async (documentId) => {
    return apiService.get(`/documents/${documentId}`);
  },

  checkUserVerification: async (userId) => {
    return apiService.get(`/documents/user/${userId}/verification-status`);
  },

  refreshDocumentStatus: async (userId) => {
    return apiService.get(`/documents/user/${userId}`);
  },

  // PRD: Vehicle Management & Location-based Search
  getAllVehicles: async () => {
    return apiService.get('/vehicles');
  },

  getVehicleByUuid: async (uuid) => {
    return apiService.get(`/vehicles/${uuid}`);
  },

  searchVehicles: async (searchTerm) => {
    return apiService.get('/vehicles/search', { q: searchTerm });
  },

  // PRD: Location-based vehicle search
  getNearbyVehicles: async (latitude, longitude, radiusKm = 10) => {
    return apiService.get('/vehicles/nearby', {
      latitude: latitude,
      longitude: longitude,
      radiusKm: radiusKm
    });
  },

  getVehiclesInBounds: async (minLat, maxLat, minLng, maxLng) => {
    return apiService.get('/vehicles/in-bounds', {
      minLat: minLat,
      maxLat: maxLat,
      minLng: minLng,
      maxLng: maxLng
    });
  },

  // PRD: QR Code Scanning
  scanVehicleQR: async (qrContent) => {
    return apiService.post('/vehicles/qr-scan', {
      qrContent: qrContent
    });
  },

  getVehiclesByPriceRange: async (minPrice, maxPrice) => {
    return apiService.get('/vehicles/price-range', {
      minPrice: minPrice,
      maxPrice: maxPrice
    });
  },

  getVehiclesByCategory: async (category) => {
    return apiService.get(`/vehicles/category/${category}`);
  },

  getVehicleStats: async () => {
    return apiService.get('/vehicles/stats');
  },

  updateVehicleLocation: async (uuid, latitude, longitude, address) => {
    return apiService.put(`/vehicles/${uuid}/location`, {
      latitude: latitude,
      longitude: longitude,
      address: address
    });
  },

  // User location management
  updateUserLocation: async (userId, latitude, longitude) => {
    return apiService.put(`/users/${userId}/location`, {
      latitude: latitude,
      longitude: longitude
    });
  },
};

// Helper functions
const getConsentType = (key) => {
  const consentTypeMap = {
    'kvkk': 'KVKK',
    'openConsent': 'OPEN_CONSENT',
    'location': 'LOCATION',
    'notification': 'NOTIFICATION',
    'marketing': 'MARKETING'
  };
  return consentTypeMap[key] || key.toUpperCase();
};

const getConsentText = (key) => {
  const consentTexts = {
    'kvkk': 'Kişisel verilerinizin işlenmesi, saklanması ve paylaşılması konusundaki aydınlatma metnini okudum ve kabul ediyorum.',
    'openConsent': 'Kimlik doğrulama, araç kiralama ve ödeme işlemleri için kişisel verilerimin işlenmesine açık rızamı veriyorum.',
    'location': 'Size en yakın araçları gösterebilmemiz için konum bilginize erişim izni veriyorum.',
    'notification': 'Rezervasyon durumu, mesajlar ve önemli güncellemeler hakkında bildirim almak istiyorum.',
    'marketing': 'Kampanyalar, indirimler ve yeni hizmetler hakkında bilgi almak istiyorum.'
  };
  return consentTexts[key] || '';
};

const getDeviceIP = async () => {
  try {
    // In a real app, you might want to get the actual device IP
    // For now, return a placeholder
    return '0.0.0.0';
  } catch (error) {
    return '0.0.0.0';
  }
};

// Error handler
const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.message || 'Server error occurred',
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: 'Network error - please check your connection',
      status: 0,
      data: null,
    };
  } else {
    // Something else happened
    return {
      message: error.message || 'An unexpected error occurred',
      status: -1,
      data: null,
    };
  }
};

export default apiService; 