import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { vehicleService } from '../services';

const MapScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehiclesWithLocation();
  }, []);

  const loadVehiclesWithLocation = async () => {
    try {
      const data = await vehicleService.getVehiclesWithLocation();
      setVehicles(data);
    } catch (error) {
      console.error('Error loading vehicles with location:', error);
      Alert.alert('Error', 'Failed to load vehicle locations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={64} color="#ccc" />
        <Text style={styles.placeholderTitle}>Map View</Text>
        <Text style={styles.placeholderText}>
          Interactive map with vehicle locations will be implemented here
        </Text>
        <Text style={styles.vehicleCount}>
          {vehicles.length} vehicles with location data
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={loadVehiclesWithLocation}
      >
        <Ionicons name="refresh-outline" size={20} color="#fff" />
        <Text style={styles.refreshButtonText}>Refresh Locations</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  vehicleCount: {
    fontSize: 14,
    color: '#e60012',
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#e60012',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default MapScreen; 