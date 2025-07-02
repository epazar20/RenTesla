import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const TOKEN_KEY = 'jwt_token';

// API sabitlerini local olarak tanımla
const API_CONFIG = {
  BASE_URL:
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL_DEVELOPMENT ||
     Constants.manifest?.extra?.EXPO_PUBLIC_API_BASE_URL_DEVELOPMENT ||
     'http://localhost:8090/api/mobile'),
  TIMEOUT: 10000,
  HEADERS: { 'Content-Type': 'application/json' }
};
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

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

// Helper function to store token
const storeAuthToken = async (token) => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    console.log('💾 Stored new token in SecureStore');
    return true;
  } catch (error) {
    console.error('❌ Error storing auth token:', error);
    return false;
  }
};

// Token refresh function with proper error handling and retry logic
const refreshAuthToken = async () => {
  try {
    console.log('🔄 Attempting to refresh token...');
    const currentToken = await getAuthToken();
    
    if (!currentToken) {
      throw new Error('No token available for refresh');
    }

    // Make a direct fetch call to avoid axios interceptors
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        // Clear tokens on unauthorized
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync('user_data');
      }
      throw new Error(errorData.message || `Token refresh failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.token) {
      throw new Error('No token in refresh response');
    }

    await storeAuthToken(data.token);
    console.log('✅ Token refreshed and stored successfully');
    return data.token;
  } catch (error) {
    console.error('❌ Token refresh failed:', error.message);
    throw error;
  }
};

// Create axios instance with updated config
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
});

// Flag to prevent multiple simultaneous token refreshes
let isRefreshing = false;
let refreshSubscribers = [];

// Helper to add new request to subscribers
const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

// Helper to notify all subscribers
const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

// Request interceptor with retry logic
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 Authorization header set:', `Bearer ${token.substring(0, 20)}...`);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling and retry logic
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If error response is 403 and we haven't retried yet
    if (error.response?.status === 403 && !originalRequest._retry) {
      if (isRefreshing) {
        try {
          const token = await new Promise((resolve, reject) => {
            addRefreshSubscriber((token) => {
              if (token) {
                resolve(token);
              } else {
                reject(new Error('Token refresh failed'));
              }
            });
          });
          
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        } catch (err) {
          console.error('❌ Waiting for token refresh failed:', err.message);
          return Promise.reject(err);
        }
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAuthToken();
        if (!newToken) {
          throw new Error('Token refresh returned empty token');
        }
        
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        onTokenRefreshed(newToken);
        isRefreshing = false;
        
        // Retry the original request with new token
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError.message);
        isRefreshing = false;
        onTokenRefreshed(null); // Notify waiting requests
        
        // Clear stored auth data on refresh failure
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync('user_data');
        console.log('🔐 Auth data cleared due to refresh failure');
        
        return Promise.reject(refreshError);
      }
    }

    // If error is 401, clear auth data
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync('user_data');
      console.log('🔐 Auth data cleared due to 401');
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
    console.log(`📤 Uploading document - Type: ${documentType}, Face: ${face || 'FRONT'}, File: ${fileName}`);
    
    try {
      const response = await apiClient.post('/documents/upload/base64', {
      userId: userId,
        documentType: documentType.toString(),
        face: face || 'FRONT',
      imageBase64: imageBase64,
        fileName: fileName
      });

      if (!response.data) {
        throw new Error('No response data received');
      }

      if (!response.data.success) {
        throw new Error(response.data.message || 'Upload failed with unknown error');
      }

      console.log(`✅ Document uploaded successfully:`, {
        documentId: response.data.documentId,
        type: response.data.type,
        face: response.data.face,
        status: response.data.status
    });

      return response.data;
    } catch (error) {
      console.error(`❌ Document upload failed:`, error.response?.data || error.message);
      
      // Check if it's an authorization error
      if (error.response?.status === 403 || error.response?.status === 401) {
        throw new Error('Authorization error. Please log out and log in again.');
      }
      
      throw new Error('Document upload failed. Please try again.');
    }
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

  // Document management with enhanced logging
  getUserDocuments: async (userId) => {
    console.log(`📋 Fetching documents for user: ${userId}`);
    const response = await apiService.get(`/documents/user/${userId}`);
    
    console.log(`📄 API Response - Found ${response.length} documents:`);
    response.forEach((doc, index) => {
      const hasImage = doc.imageBase64 && doc.imageBase64.length > 0;
      const imageLength = hasImage ? doc.imageBase64.length : 0;
      console.log(`   [${index}] Document ${doc.id}: Type=${doc.type}, Face=${doc.face}, Status=${doc.status}, HasImage=${hasImage}, ImageLength=${imageLength}`);
      
      if (hasImage) {
        console.log(`      📸 Image preview: ${doc.imageBase64.substring(0, 50)}...`);
      } else {
        console.log(`      ❌ No image data found`);
      }
    });
    
    return response;
  },

  getDocumentVerificationStatus: async (userId) => {
    return apiService.get(`/documents/user/${userId}/verification-status`);
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

  // === ADMIN ENDPOINTS ===
  
  // Get documents needing manual review
  async getDocumentsNeedingReview() {
    return this.get('/documents/admin/pending-review');
  },

  // Get document processing statistics
  async getDocumentStats() {
    return this.get('/documents/admin/stats');
  },

  // Admin approve document
  async adminApproveDocument(documentId, adminId, reason = null) {
    return this.post(`/documents/admin/${documentId}/approve`, {
      adminId,
      reason
    });
  },

  // Admin reject document
  async adminRejectDocument(documentId, adminId, reason) {
    return this.post(`/documents/admin/${documentId}/reject`, {
      adminId,
      reason
    });
  },

  // Get detailed verification information
  async getDocumentVerificationDetails(documentId) {
    return this.get(`/documents/admin/${documentId}/verification-details`);
  },

  // Bulk document action
  async bulkDocumentAction(documentIds, action, adminId, reason = null) {
    return this.post('/documents/admin/bulk-action', {
      documentIds,
      action,
      adminId,
      reason
    });
  },

  // Vehicle management
  async getVehicles() {
    return this.get('/vehicles');
  },

  // Upload document with file
  async uploadDocumentFile(formData) {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${await getAuthToken()}`
      }
    };

    const response = await apiClient.post('/documents/upload', formData, config);
    return response.data;
  },

  // Delete document
  async deleteDocument(documentId, userId) {
    const response = await apiClient.delete(`/documents/${documentId}?userId=${userId}`, {
      headers: {
        'Authorization': `Bearer ${await getAuthToken()}`
      }
    });
    return response.data;
  },

  // Utility methods
  async getAuthToken() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
      return null;
    }
  },

  // Get user profile by ID
  async getUserProfile(userId) {
    return await apiService.get(`/users/${userId}`);
  },

  // Update user profile by ID
  async updateUserProfile(userId, data) {
    return await apiService.put(`/users/${userId}`, data);
  },

  refreshToken: async () => {
    try {
      console.log('🔄 Refreshing token...');
      return await refreshAuthToken();
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      throw error;
    }
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

// Export apiClient as api
export const api = apiClient;
