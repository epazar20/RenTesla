import * as SecureStore from 'expo-secure-store';
import { apiService } from './apiService';

const TOKEN_KEY = 'jwt_token';
const USER_KEY = 'user_data';

class AuthService {
  constructor() {
    this.token = null;
    this.user = null;
  }

  // Login with credentials
  async login(username, password) {
    try {
      const response = await apiService.post('/auth/login', {
        username,
        password
      });

      if (response.token) {
        // Store token and user data
        await this.storeAuthData(response);
        this.token = response.token;
        this.user = {
          userId: response.userId || 1, // Default to 1 for now
          username: response.username,
          role: response.role
        };

        console.log('✅ Login successful:', response.username);
        return response;
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
      
      // Handle structured error responses
      if (error.response?.data?.code) {
        const errorData = error.response.data;
        throw new Error(this.getErrorMessage(errorData.code, errorData.message));
      }
      
      // Handle HTTP status codes
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password');
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
        password: userData.password,
        consents: userData.consents || {},
        permissions: userData.permissions || {}
      });

      if (response.token) {
        // Store token and user data
        await this.storeAuthData(response);
        this.token = response.token;
        this.user = {
          userId: response.userId,
          username: response.username,
          role: response.role
        };

        console.log('✅ Signup successful:', response.username);
        return response;
      } else {
        throw new Error('Invalid signup response');
      }
    } catch (error) {
      console.error('❌ Signup failed:', error);
      
      // Handle structured error responses
      if (error.response?.data?.code) {
        const errorData = error.response.data;
        throw new Error(this.getErrorMessage(errorData.code, errorData.message));
      }
      
      // Handle HTTP status codes
      if (error.response?.status === 400) {
        throw new Error('Please check your information and try again');
      } else if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw new Error(error.message || 'Registration failed. Please try again.');
    }
  }

  // Logout
  async logout() {
    try {
      // Clear secure storage
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      
      // Clear memory
      this.token = null;
      this.user = null;
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }

  // Store auth data
  async storeAuthData(authData) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, authData.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify({
        userId: authData.userId || 1, // Default to 1 for now
        username: authData.username,
        role: authData.role,
        expiresIn: authData.expiresIn
      }));
    } catch (error) {
      console.error('❌ Error storing auth data:', error);
    }
  }

  // Get stored token
  async getToken() {
    if (this.token) {
      return this.token;
    }

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        this.token = token;
      }
      return token;
    } catch (error) {
      console.error('❌ Error getting token:', error);
      return null;
    }
  }

  // Get stored user data
  async getUser() {
    if (this.user) {
      return this.user;
    }

    try {
      const userData = await SecureStore.getItemAsync(USER_KEY);
      if (userData) {
        this.user = JSON.parse(userData);
      }
      return this.user;
    } catch (error) {
      console.error('❌ Error getting user data:', error);
      return null;
    }
  }

  // Get current user (alias for getUser for compatibility)
  async getCurrentUser() {
    return await this.getUser();
  }

  // Get current user ID
  async getCurrentUserId() {
    const user = await this.getUser();
    return user ? user.userId : null;
  }

  // Check if user is authenticated
  async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  }

  // Initialize auth state (call on app start)
  async initializeAuth() {
    try {
      const token = await this.getToken();
      const user = await this.getUser();
      
      if (token && user) {
        this.token = token;
        this.user = user;
        console.log('✅ Auth initialized:', user.username);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Auth initialization failed:', error);
      return false;
    }
  }

  // Get auth headers for API requests
  getAuthHeaders() {
    if (this.token) {
      return {
        'Authorization': `Bearer ${this.token}`
      };
    }
    return {};
  }

  // Get user-friendly error messages
  getErrorMessage(code, defaultMessage) {
    const errorMessages = {
      'EMAIL_EXISTS': 'An account with this email already exists',
      'KVKK_CONSENT_REQUIRED': 'KVKK consent is required to create an account',
      'OPEN_CONSENT_REQUIRED': 'Data processing consent is required to create an account',
      'VALIDATION_ERROR': 'Please check your information and try again',
      'INVALID_CREDENTIALS': 'Invalid username or password',
      'ACCOUNT_DISABLED': 'Your account has been disabled. Please contact support.',
      'INTERNAL_ERROR': 'Server error. Please try again later.'
    };
    
    return errorMessages[code] || defaultMessage || 'An error occurred. Please try again.';
  }
}

// Export singleton instance
export default new AuthService(); 