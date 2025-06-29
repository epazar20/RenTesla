import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const VehicleDetailScreen = ({ route, navigation }) => {
  // Null check for route params
  const vehicle = route?.params?.vehicle;
  
  // If no vehicle data, show error screen
  if (!vehicle) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="car-outline" size={64} color="#ccc" />
        <Text style={styles.errorTitle}>Araç Bulunamadı</Text>
        <Text style={styles.errorText}>Araç bilgileri yüklenemedi</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
      Alert.alert('Müsait Değil', 'Bu araç şu anda kiralama için müsait değil.');
      return;
    }
    
    Alert.alert(
      'Araç Kirala',
      `${vehicle.displayName || 'Bu aracı'} kiralamak istiyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Kirala', 
          onPress: () => Alert.alert('Başarılı', 'Kiralama işlemi yakında uygulanacak!'),
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
      <Text style={[styles.detailValue, color && { color }]}>{value || 'Bilgi yok'}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>
              {vehicle.displayName || `${vehicle.make || ''} ${vehicle.model || 'Araç'}`}
            </Text>
            <Text style={styles.vehicleModel}>{vehicle.model || 'Tesla'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(vehicle.status) }]}>
            <Text style={styles.statusText}>{vehicle.status || 'UNKNOWN'}</Text>
          </View>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Günlük Ücret</Text>
          <Text style={styles.priceValue}>₺{vehicle.dailyRate || vehicle.pricePerDay || 0}</Text>
        </View>
      </View>

      {/* Vehicle Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Araç Bilgileri</Text>
        
        <DetailRow
          icon="car-outline"
          label="Renk"
          value={vehicle.color}
        />
        
        <DetailRow
          icon="battery-half-outline"
          label="Batarya Seviyesi"
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
          label="Müsaitlik"
          value={vehicle.isAvailable ? 'Müsait' : 'Müsait Değil'}
          color={vehicle.isAvailable ? '#4CAF50' : '#F44336'}
        />
      </View>

      {/* Location Information */}
      {((vehicle.latitude && vehicle.longitude) || (vehicle.locationLat && vehicle.locationLng)) && (
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Konum Bilgileri</Text>
          
          <DetailRow
            icon="location-outline"
            label="Adres"
            value={vehicle.locationAddress}
          />
          
          <DetailRow
            icon="navigate-outline"
            label="Koordinatlar"
            value={`${vehicle.latitude || vehicle.locationLat}, ${vehicle.longitude || vehicle.locationLng}`}
          />
          
          <TouchableOpacity style={styles.mapButton}>
            <Ionicons name="map-outline" size={20} color="#e60012" />
            <Text style={styles.mapButtonText}>Haritada Görüntüle</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Description */}
      {vehicle.description && (
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Açıklama</Text>
          <Text style={styles.descriptionText}>{vehicle.description}</Text>
        </View>
      )}

      {/* Features */}
      {vehicle.features && (
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Özellikler</Text>
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
            {vehicle.status === 'AVAILABLE' ? 'Bu Aracı Kirala' : 'Müsait Değil'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.favoriteButton}>
          <Ionicons name="heart-outline" size={20} color="#e60012" />
          <Text style={styles.favoriteButtonText}>Favorilere Ekle</Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
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
    color: '#2c3e50',
    marginBottom: 5,
  },
  vehicleModel: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  priceContainer: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#7f8c8d',
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
    padding: 20,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 10,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecf0f1',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  mapButtonText: {
    color: '#e60012',
    fontWeight: '600',
    marginLeft: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: '#34495e',
    lineHeight: 24,
  },
  featuresText: {
    fontSize: 16,
    color: '#34495e',
    lineHeight: 24,
  },
  actionContainer: {
    margin: 15,
    marginBottom: 30,
  },
  rentButton: {
    backgroundColor: '#e60012',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  rentButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  disabledButtonText: {
    color: '#7f8c8d',
  },
  favoriteButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e60012',
  },
  favoriteButtonText: {
    color: '#e60012',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default VehicleDetailScreen; 