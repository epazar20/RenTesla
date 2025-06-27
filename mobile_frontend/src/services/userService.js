import { apiService } from './apiService';
import { ENDPOINTS } from '../constants/api';

export const userService = {
  // Get all active users
  getAllUsers: async () => {
    return await apiService.get(ENDPOINTS.USERS);
  },

  // Get user by ID
  getUserById: async (id) => {
    return await apiService.get(ENDPOINTS.USER_BY_ID(id));
  },

  // Get user by email
  getUserByEmail: async (email) => {
    return await apiService.get(ENDPOINTS.USER_BY_EMAIL(email));
  },

  // Search users
  searchUsers: async (searchTerm) => {
    return await apiService.get(ENDPOINTS.USER_SEARCH, { q: searchTerm });
  },

  // Get users by role
  getUsersByRole: async (role) => {
    return await apiService.get(ENDPOINTS.USER_BY_ROLE(role));
  },

  // Get user statistics
  getUserStats: async () => {
    return await apiService.get(ENDPOINTS.USER_STATS);
  },

  // Create new user
  createUser: async (userData) => {
    return await apiService.post(ENDPOINTS.USERS, userData);
  },

  // Update user
  updateUser: async (id, userData) => {
    return await apiService.put(ENDPOINTS.USER_BY_ID(id), userData);
  },

  // Delete user (soft delete)
  deleteUser: async (id) => {
    return await apiService.delete(ENDPOINTS.USER_BY_ID(id));
  },

  // Check if email exists
  checkEmailExists: async (email) => {
    return await apiService.post(ENDPOINTS.CHECK_EMAIL, { email });
  },

  // Check if phone exists
  checkPhoneExists: async (phone) => {
    return await apiService.post(ENDPOINTS.CHECK_PHONE, { phone });
  },
};

export default userService; 