import { apiService } from './apiService';
import { ENDPOINTS } from '../constants/api';

export const vehicleService = {
  // Get all available vehicles
  getAllVehicles: async () => {
    return await apiService.get(ENDPOINTS.VEHICLES);
  },

  // Get vehicle by ID
  getVehicleById: async (id) => {
    return await apiService.get(ENDPOINTS.VEHICLE_BY_ID(id));
  },

  // Search vehicles
  searchVehicles: async (searchTerm) => {
    return await apiService.get(ENDPOINTS.VEHICLE_SEARCH, { q: searchTerm });
  },

  // Get vehicles by price range
  getVehiclesByPriceRange: async (minRate, maxRate) => {
    return await apiService.get(ENDPOINTS.VEHICLE_PRICE_RANGE, {
      minRate,
      maxRate,
    });
  },

  // Get vehicle statistics
  getVehicleStats: async () => {
    return await apiService.get(ENDPOINTS.VEHICLE_STATS);
  },

  // Create new vehicle (admin only)
  createVehicle: async (vehicleData) => {
    return await apiService.post(ENDPOINTS.VEHICLES, vehicleData);
  },

  // Update vehicle (admin only)
  updateVehicle: async (id, vehicleData) => {
    return await apiService.put(ENDPOINTS.VEHICLE_BY_ID(id), vehicleData);
  },

  // Delete vehicle (admin only)
  deleteVehicle: async (id) => {
    return await apiService.delete(ENDPOINTS.VEHICLE_BY_ID(id));
  },
};

export default vehicleService; 