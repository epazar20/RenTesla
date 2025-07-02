import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@user_store';

export const useUserStore = create((set) => ({
  user: null,
  loading: false,
  error: null,

  setUser: (user) => {
    set({ user });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  },

  updateUser: async (updates) => {
    set({ loading: true });
    try {
      const currentUser = useUserStore.getState().user;
      const updatedUser = { ...currentUser, ...updates };
      
      // TODO: API call to update user data
      // const response = await apiService.updateUser(updatedUser);
      
      set({ user: updatedUser, loading: false });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  loadStoredUser: async () => {
    set({ loading: true });
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedUser) {
        set({ user: JSON.parse(storedUser) });
      }
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  clearUser: async () => {
    set({ user: null, error: null });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
})); 