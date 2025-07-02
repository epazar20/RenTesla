import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  FlatList,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { apiService } from '../services/apiService';

const { width } = Dimensions.get('window');

const VehicleListingScreen = ({ route }) => {
  const navigation = useNavigation();
  const { userId } = route.params;
  
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });

  const filters = [
    { key: 'all', label: 'Tümü', icon: 'car-outline' },
    { key: 'nearby', label: 'Yakınımdaki', icon: 'location-outline' },
    { key: 'economy', label: 'Ekonomik', icon: 'cash-outline' },
    { key: 'luxury', label: 'Lüks', icon: 'diamond-outline' },
    { key: 'tesla', label: 'Tesla', icon: 'flash-outline' },
  ];

  useEffect(() => {
    requestLocationPermission();
    loadVehicles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [vehicles, selectedFilter, searchTerm, userLocation]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync();
        setUserLocation(location.coords);
        
        // Update user location in backend
        await apiService.updateUserLocation(
          userId,
          location.coords.latitude,
          location.coords.longitude
        );
      } else {
        Alert.alert(
          'Konum İzni',
          'Yakınınızdaki araçları görebilmek için konum izni gerekiyor.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const loadVehicles = async () => {
    setLoading(true);
    try {
      let vehicleData;
      
      if (selectedFilter === 'nearby' && userLocation) {
        vehicleData = await apiService.getNearbyVehicles(
          userLocation.latitude,
          userLocation.longitude,
          10 // 10km radius
        );
      } else {
        vehicleData = await apiService.getAllVehicles();
      }
      
      setVehicles(vehicleData);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Hata', 'Araçlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...vehicles];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(vehicle =>
        vehicle.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filters
    switch (selectedFilter) {
      case 'nearby':
        if (userLocation) {
          filtered = filtered.filter(vehicle => {
            if (!vehicle.locationLat || !vehicle.locationLng) return false;
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              vehicle.locationLat,
              vehicle.locationLng
            );
            return distance <= 10; // 10km
          });
        }
        break;
      case 'economy':
        filtered = filtered.filter(vehicle => 
          vehicle.pricePerDay && parseFloat(vehicle.pricePerDay) <= 500
        );
        break;
      case 'luxury':
        filtered = filtered.filter(vehicle => 
          vehicle.pricePerDay && parseFloat(vehicle.pricePerDay) > 800
        );
        break;
      case 'tesla':
        filtered = filtered.filter(vehicle => 
          vehicle.make?.toLowerCase().includes('tesla')
        );
        break;
    }

    // Sort by distance if location available
    if (userLocation && selectedFilter === 'nearby') {
      filtered.sort((a, b) => {
        const distanceA = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          a.locationLat,
          a.locationLng
        );
        const distanceB = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          b.locationLat,
          b.locationLng
        );
        return distanceA - distanceB;
      });
    }

    setFilteredVehicles(filtered);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleVehicleSelect = (vehicle) => {
    navigation.navigate('VehicleDetail', { 
      vehicleUuid: vehicle.uuid,
      userId: userId 
    });
  };

  const handleQRScan = () => {
    navigation.navigate('QRScanner', { userId: userId });
  };

  const VehicleCard = ({ vehicle }) => {
    const distance = userLocation && vehicle.locationLat && vehicle.locationLng ?
      calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        vehicle.locationLat,
        vehicle.locationLng
      ) : null;

    return (
      <TouchableOpacity 
        style={styles.vehicleCard}
        onPress={() => handleVehicleSelect(vehicle)}
      >
        <View style={styles.vehicleImageContainer}>
          {vehicle.imageUrl ? (
            <Image source={{ uri: vehicle.imageUrl }} style={styles.vehicleImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="car" size={40} color="#95A5A6" />
            </View>
          )}
          {vehicle.status === 'AVAILABLE' && (
            <View style={styles.availableBadge}>
              <Text style={styles.availableText}>Müsait</Text>
            </View>
          )}
        </View>
        
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{vehicle.displayName}</Text>
          <Text style={styles.vehicleModel}>{vehicle.make} {vehicle.model}</Text>
          
          <View style={styles.vehicleDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="battery-half" size={16} color="#2ECC71" />
              <Text style={styles.detailText}>{vehicle.batteryLevel || 'N/A'}%</Text>
            </View>
            
            {distance && (
              <View style={styles.detailItem}>
                <Ionicons name="location" size={16} color="#3498DB" />
                <Text style={styles.detailText}>{distance.toFixed(1)} km</Text>
              </View>
            )}
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>
              ₺{vehicle.pricePerDay || vehicle.dailyRate || 'N/A'}/gün
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterTab = ({ filter }) => (
    <TouchableOpacity
      style={[
        styles.filterTab,
        selectedFilter === filter.key && styles.activeFilterTab
      ]}
      onPress={() => setSelectedFilter(filter.key)}
    >
      <Ionicons 
        name={filter.icon} 
        size={20} 
        color={selectedFilter === filter.key ? '#FFF' : '#666'} 
      />
      <Text style={[
        styles.filterTabText,
        selectedFilter === filter.key && styles.activeFilterTabText
      ]}>
        {filter.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Araç Listesi</Text>
        <TouchableOpacity onPress={handleQRScan}>
          <Ionicons name="qr-code-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Araç ara..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
      >
        {filters.map(filter => (
          <FilterTab key={filter.key} filter={filter} />
        ))}
      </ScrollView>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredVehicles.length} araç bulundu
        </Text>
        {selectedFilter === 'nearby' && userLocation && (
          <Text style={styles.locationText}>
            <Ionicons name="location" size={12} color="#3498DB" />
            {' '}10 km yarıçapında
          </Text>
        )}
      </View>

      <FlatList
        data={filteredVehicles}
        keyExtractor={(item) => item.uuid}
        renderItem={({ item }) => <VehicleCard vehicle={item} />}
        contentContainerStyle={styles.vehicleList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color="#95A5A6" />
            <Text style={styles.emptyText}>
              {loading ? 'Araçlar yükleniyor...' : 'Araç bulunamadı'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  filtersContainer: {
    paddingVertical: 10,
    paddingLeft: 20,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  activeFilterTab: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  filterTabText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: '#FFF',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  resultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  locationText: {
    fontSize: 12,
    color: '#3498DB',
  },
  vehicleList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  vehicleCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  vehicleImageContainer: {
    position: 'relative',
  },
  vehicleImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availableBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#2ECC71',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  vehicleInfo: {
    padding: 16,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  vehicleModel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  vehicleDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  detailText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2ECC71',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});

export default VehicleListingScreen; 