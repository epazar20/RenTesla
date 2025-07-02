import { api } from './apiService';

export const updateNotificationSettings = async (userId, settings) => {
  try {
    const response = await api.put(`/users/${userId}/notification-settings`, settings);
    return response.data;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
};

export const updatePrivacySettings = async (userId, settings) => {
  try {
    const response = await api.put(`/users/${userId}/privacy-settings`, settings);
    return response.data;
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    throw error;
  }
}; 