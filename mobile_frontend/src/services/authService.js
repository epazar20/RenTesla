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
      throw error;
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
}

// Export singleton instance
export default new AuthService(); 