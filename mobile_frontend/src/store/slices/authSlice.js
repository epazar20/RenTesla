import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import AuthService from '../../services/authService';

// Token storage keys
const TOKEN_KEY = 'jwt_token';
const USER_KEY = 'user_data';

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await AuthService.login(username, password);
      
      // Store token and user in SecureStore
      await SecureStore.setItemAsync(TOKEN_KEY, response.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify({
        id: response.userId,
        username: response.username,
        role: response.role
      }));
      
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { dispatch }) => {
    try {
      // Clear SecureStore
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      
      // Clear axios default header
      const axios = require('axios').default;
      delete axios.defaults.headers.common['Authorization'];
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return true; // Still logout even if storage clear fails
    }
  }
);

export const loadStoredAuth = createAsyncThunk(
  'auth/loadStoredAuth',
  async (_, { rejectWithValue }) => {
    try {
      const [token, userStr] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY)
      ]);
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        
        // Set axios default header
        const axios = require('axios').default;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Validate token by calling a protected endpoint
        try {
          await AuthService.validateToken();
          return {
            token,
            user,
            isAuthenticated: true
          };
        } catch (error) {
          // Token is invalid, clear storage
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(USER_KEY);
          delete axios.defaults.headers.common['Authorization'];
          throw new Error('Token expired');
        }
      }
      
      return null;
    } catch (error) {
      return rejectWithValue('Failed to load stored authentication');
    }
  }
);

export const setLoginSuccess = createAsyncThunk(
  'auth/setLoginSuccess',
  async (authData, { rejectWithValue }) => {
    try {
      // Save to SecureStore
      await SecureStore.setItemAsync(TOKEN_KEY, authData.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(authData.user));
      
      // Set axios default header
      const axios = require('axios').default;
      axios.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`;
      
      return authData;
    } catch (error) {
      return rejectWithValue('Failed to save authentication data');
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      if (!auth.token) {
        throw new Error('No token available');
      }
      
      // Try to refresh token (if your backend supports it)
      // For now, we'll just validate the current token
      await AuthService.validateToken();
      return auth.token;
    } catch (error) {
      return rejectWithValue('Token refresh failed');
    }
  }
);

const initialState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false, // Track if we've checked stored auth
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setAuthError: (state, action) => {
      state.error = action.payload;
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
    },
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        // Update SecureStore
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(state.user));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = {
          id: action.payload.userId,
          username: action.payload.username,
          role: action.payload.role
        };
        state.error = null;
        
        // Save to SecureStore
        SecureStore.setItemAsync(TOKEN_KEY, action.payload.token);
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(state.user));
        
        // Set axios default header
        const axios = require('axios').default;
        axios.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        state.error = action.payload;
      })
      
      // Set Login Success (for signup and manual login)
      .addCase(setLoginSuccess.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(setLoginSuccess.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(setLoginSuccess.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        state.error = null;
      })
      
      // Load stored auth
      .addCase(loadStoredAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        
        if (action.payload) {
          state.isAuthenticated = true;
          state.token = action.payload.token;
          state.user = action.payload.user;
        } else {
          state.isAuthenticated = false;
          state.token = null;
          state.user = null;
        }
      })
      .addCase(loadStoredAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        state.error = action.payload;
      })
      
      // Refresh token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      });
  },
});

export const { clearError, setAuthError, updateUser } = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectUser = (state) => state.auth.user;
export const selectUserId = (state) => state.auth.user?.id;
export const selectUserRole = (state) => state.auth.user?.role;
export const selectToken = (state) => state.auth.token;
export const selectIsInitialized = (state) => state.auth.isInitialized;

export default authSlice.reducer; 