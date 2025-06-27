import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const VehicleDetailScreen = ({ route, navigation }) => {
  const { vehicle } = route.params;

  const getBatteryColor = (level) => {
    if (level >= 80) return '#4CAF50';
    if (level >= 50) return '#FF9800';
    return '#F44336';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'AVAILABLE': return '#4CAF50';
      case 'RENTED': return '#FF9800';
      case 'MAINTENANCE': return '#F44336';
      default: return '#999';
    }
  };

  const handleRentVehicle = () => {
    if (vehicle.status !== 'AVAILABLE') {
      Alert.alert('Unavailable', 'This vehicle is not available for rent at the moment.');
      return;
    }
    
    Alert.alert(
      'Rent Vehicle',
      `Would you like to rent ${vehicle.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Rent Now', 
          onPress: () => Alert.alert('Success', 'Rental process will be implemented soon!'),
          style: 'default'
        }
      ]
    );
  };

  const DetailRow = ({ icon, label, value, color }) => (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <Ionicons name={icon} size={20} color={color || '#666'} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, color && { color }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>{vehicle.displayName}</Text>
            <Text style={styles.vehicleModel}>{vehicle.model || 'Tesla'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(vehicle.status) }]}>
            <Text style={styles.statusText}>{vehicle.status}</Text>
          </View>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Daily Rate</Text>
          <Text style={styles.priceValue}>₺{vehicle.dailyRate || 0}</Text>
        </View>
      </View>

      {/* Vehicle Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>
        
        <DetailRow
          icon="car-outline"
          label="Color"
          value={vehicle.color || 'Not specified'}
        />
        
        <DetailRow
          icon="battery-half-outline"
          label="Battery Level"
          value={`${vehicle.batteryLevel || 0}%`}
          color={getBatteryColor(vehicle.batteryLevel)}
        />
        
        <DetailRow
          icon="speedometer-outline"
          label="VIN"
          value={vehicle.vin}
        />
        
        <DetailRow
          icon="checkmark-circle-outline"
          label="Availability"
          value={vehicle.isAvailable ? 'Available' : 'Not Available'}
          color={vehicle.isAvailable ? '#4CAF50' : '#F44336'}
        />
      </View>

      {/* Location Information */}
      {(vehicle.latitude && vehicle.longitude) && (
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Location Information</Text>
          
          <DetailRow
            icon="location-outline"
            label="Address"
            value={vehicle.locationAddress || 'Address not available'}
          />
          
          <DetailRow
            icon="navigate-outline"
            label="Coordinates"
            value={`${vehicle.latitude}, ${vehicle.longitude}`}
          />
          
          <TouchableOpacity style={styles.mapButton}>
            <Ionicons name="map-outline" size={20} color="#e60012" />
            <Text style={styles.mapButtonText}>View on Map</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Description */}
      {vehicle.description && (
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{vehicle.description}</Text>
        </View>
      )}

      {/* Features */}
      {vehicle.features && (
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Features</Text>
          <Text style={styles.featuresText}>{vehicle.features}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[
            styles.rentButton,
            vehicle.status !== 'AVAILABLE' && styles.disabledButton
          ]}
          onPress={handleRentVehicle}
          disabled={vehicle.status !== 'AVAILABLE'}
        >
          <Ionicons 
            name="key-outline" 
            size={20} 
            color={vehicle.status === 'AVAILABLE' ? '#fff' : '#999'} 
          />
          <Text style={[
            styles.rentButtonText,
            vehicle.status !== 'AVAILABLE' && styles.disabledButtonText
          ]}>
            {vehicle.status === 'AVAILABLE' ? 'Rent This Vehicle' : 'Not Available'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.favoriteButton}>
          <Ionicons name="heart-outline" size={20} color="#e60012" />
          <Text style={styles.favoriteButtonText}>Add to Favorites</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  vehicleModel: {
    fontSize: 16,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  priceContainer: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e60012',
  },
  detailsCard: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  mapButtonText: {
    fontSize: 16,
    color: '#e60012',
    fontWeight: '600',
    marginLeft: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  featuresText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  actionContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  rentButton: {
    backgroundColor: '#e60012',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    padding: 16,
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
  },
  rentButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  disabledButtonText: {
    color: '#999',
  },
  favoriteButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e60012',
  },
  favoriteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e60012',
    marginLeft: 8,
  },
});

export default VehicleDetailScreen; 