import { apiService } from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthService {
  constructor() {
    // Note: Token and user data are now managed by Redux store
    // This service just handles API calls
  }

  // Initialize authentication state
  async initializeAuth() {
    try {
      // Check if we have a stored token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        return false;
      }

      // Validate the token
      const isValid = await this.validateToken();
      return isValid.valid;
    } catch (error) {
      console.error('Auth initialization error:', error);
      return false;
    }
  }

  // Login with credentials
  async login(username, password) {
    try {
      const response = await apiService.post('/auth/login', {
        username,
        password
      });

      if (response.token) {
        console.log('✅ Login successful:', response.username);
        return {
          token: response.token,
          userId: response.userId || 1,
          username: response.username,
          role: response.role,
          expiresIn: response.expiresIn
        };
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
      
      // Handle structured error responses from backend (now multilingual)
      if (error.response?.data?.message) {
        // Backend now returns localized messages based on Accept-Language header
        throw new Error(error.response.data.message);
      }
      
      // Handle HTTP status codes with fallback messages
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password'); // Will be replaced by backend message
      } else if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw new Error(error.message || 'Login failed. Please try again.');
    }
  }

  // Signup with user data
  async signup(userData) {
    try {
      const response = await apiService.post('/auth/signup', {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        identityNumber: userData.identityNumber,
        password: userData.password,
        consents: userData.consents || {},
        permissions: userData.permissions || {}
      });

      if (response.token) {
        console.log('✅ Signup successful:', response.username);
        return {
          token: response.token,
          userId: response.userId,
          username: response.username,
          role: response.role,
          expiresIn: response.expiresIn
        };
      } else {
        throw new Error('Invalid signup response');
      }
    } catch (error) {
      console.error('❌ Signup failed:', error);
      
      // Handle structured error responses from backend (now multilingual)
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      // Handle HTTP status codes with fallback
      if (error.response?.status === 400) {
        throw new Error('Please check your information and try again');
      } else if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw new Error(error.message || 'Registration failed. Please try again.');
    }
  }

  // Check if user is authenticated (backward compatibility)
  async isAuthenticated() {
    try {
      // Try to get Redux state if available
      if (typeof require !== 'undefined') {
        const { store } = require('../store/store');
        const state = store.getState();
        return state.auth.isAuthenticated && state.auth.token;
      }
      return false;
    } catch (error) {
      console.log('Redux state not available, returning false');
      return false;
    }
  }

  // Validate JWT token
  async validateToken() {
    try {
      const response = await apiService.post('/auth/validate');
      
      if (response && response.username) {
        console.log('✅ Token validation successful');
        return {
          valid: true,
          userId: response.userId,
          username: response.username,
          role: response.role
        };
      } else {
        throw new Error('Invalid token validation response');
      }
    } catch (error) {
      console.error('❌ Token validation failed:', error);
      
      // Backend will return localized error messages
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Token expired or invalid');
      }
      
      throw error;
    }
  }

  // Refresh token (if backend supports it)
  async refreshToken() {
    try {
      const response = await apiService.post('/auth/refresh');
      
      if (response.token) {
        console.log('✅ Token refresh successful');
        return {
          token: response.token,
          userId: response.userId,
          username: response.username,
          role: response.role,
          expiresIn: response.expiresIn
        };
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      
      // Backend will return localized error messages
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw error;
    }
  }

  // Get current user info from backend
  async getCurrentUser() {
    try {
      const response = await apiService.get('/auth/me');
      
      if (response && response.username) {
        return {
          id: response.id,
          username: response.username,
          role: response.role,
          firstName: response.firstName,
          lastName: response.lastName,
          email: response.email,
          phone: response.phone
        };
      } else {
        throw new Error('Invalid user data response');
      }
    } catch (error) {
      console.error('❌ Get current user failed:', error);
      
      // Backend will return localized error messages
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw error;
    }
  }

  // Logout (server-side if supported)
  async logout() {
    try {
      // Try to call server logout endpoint (if available)
      try {
        await apiService.post('/auth/logout');
      } catch (error) {
        // Server logout might not be implemented, continue with client logout
        console.log('Server logout not available, proceeding with client logout');
      }
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Don't throw error for logout, always proceed
    }
  }

  // Check email availability
  async checkEmailAvailability(email) {
    try {
      const response = await apiService.post('/users/check-email', { email });
      return response.available || false;
    } catch (error) {
      console.error('❌ Email check failed:', error);
      return false;
    }
  }

  // Check phone availability
  async checkPhoneAvailability(phone) {
    try {
      const response = await apiService.post('/users/check-phone', { phone });
      return response.available || false;
    } catch (error) {
      console.error('❌ Phone check failed:', error);
      return false;
    }
  }

  // Get auth headers (for backward compatibility)
  getAuthHeaders() {
    // Note: Headers are now handled by axios interceptors
    return {};
  }

  // Legacy method - no longer needed as backend returns localized messages
  // Backend now uses MessageService and Accept-Language header
  getErrorMessage(code, defaultMessage) {
    // This method is kept for backward compatibility
    // But backend now returns properly localized messages
    console.log('⚠️ getErrorMessage called - backend should provide localized messages');
    return defaultMessage || 'An error occurred';
  }
}

// Export singleton instance
export default new AuthService(); 