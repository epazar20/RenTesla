import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { vehicleService } from '../services';
import AuthService from '../services/authService';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);

  useEffect(() => {
    initializeMap();
  }, []);

  const initializeMap = async () => {
    try {
      // Check if user is authenticated
      const isAuthenticated = await AuthService.isAuthenticated();
      
      if (!isAuthenticated) {
        console.log('🔐 User not authenticated, logging in as admin for map demo...');
        setAuthLoading(true);
        
        try {
          // Auto-login as admin for demo/testing
          await AuthService.login('admin', 'admin123');
          console.log('✅ Admin login successful for map demo');
        } catch (error) {
          console.error('❌ Admin login failed:', error);
          Alert.alert('Authentication Error', 'Failed to authenticate for map access. Please login first.');
          setLoading(false);
          setAuthLoading(false);
          return;
        }
        setAuthLoading(false);
      }

      // Proceed with map initialization
      await Promise.all([
        loadVehiclesWithLocation(),
        getUserLocation()
      ]);
    } catch (error) {
      console.error('❌ Map initialization error:', error);
      setLoading(false);
      setAuthLoading(false);
    }
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Konum İzni', 'Harita özelliklerini kullanmak için konum izni gereklidir.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setUserLocation(userCoords);
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const loadVehiclesWithLocation = async () => {
    try {
      setLoading(true);
      console.log('🚗 Loading vehicles with location...');
      
      const data = await vehicleService.getAllVehicles();
      console.log(`📍 Received ${data.length} vehicles from API`);
      
      // Filter vehicles that have location data
      const vehiclesWithLocation = data.filter(vehicle => {
        const hasLatLng = (vehicle.latitude && vehicle.longitude) || 
                         (vehicle.locationLat && vehicle.locationLng);
        return hasLatLng;
      });
      
      console.log(`🗺️ ${vehiclesWithLocation.length} vehicles have location data`);
      setVehicles(vehiclesWithLocation);
      
    } catch (error) {
      console.error('Error loading vehicles with location:', error);
      
      // Show specific error message
      let errorMessage = 'Araç konumları yüklenirken hata oluştu';
      if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = 'Yetkilendirme hatası. Lütfen tekrar giriş yapın.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
      }
      
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getVehicleMarkerColor = (vehicle) => {
    switch (vehicle.status) {
      case 'AVAILABLE':
        return 'green';
      case 'RENTED':
        return 'red';
      case 'MAINTENANCE':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const refreshMap = () => {
    setWebViewKey(prev => prev + 1);
    loadVehiclesWithLocation();
  };

  const generateMapHTML = () => {
    const apiKey = 'AIzaSyC7QWTyi-H4F770oFNIMiD5FG5V2529XIU';
    const center = userLocation ? `${userLocation.latitude},${userLocation.longitude}` : '41.0082,28.9784';
    
    const markers = vehicles.map(vehicle => {
      const lat = vehicle.latitude || vehicle.locationLat;
      const lng = vehicle.longitude || vehicle.locationLng;
      const color = getVehicleMarkerColor(vehicle);
      const title = (vehicle.displayName || `${vehicle.make} ${vehicle.model}`).replace(/'/g, "\\'");
      const description = `${vehicle.status} - ${vehicle.batteryLevel || 'N/A'}% batarya`.replace(/'/g, "\\'");
      
      return `
        {
          position: {lat: ${lat}, lng: ${lng}},
          title: '${title}',
          description: '${description}',
          color: '${color}'
        }`;
    }).join(',');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100%; }
        .info-window { font-size: 14px; }
    </style>
</head>
<body>
    <div id="map"></div>
    
    <script>
        let map;
        let infoWindow;
        
        function initMap() {
            map = new google.maps.Map(document.getElementById("map"), {
                zoom: 12,
                center: { lat: ${userLocation?.latitude || 41.0082}, lng: ${userLocation?.longitude || 28.9784} },
                mapTypeId: 'roadmap',
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                scaleControl: true,
                streetViewControl: false,
                rotateControl: false,
                fullscreenControl: false
            });

            infoWindow = new google.maps.InfoWindow();

            // Add vehicle markers
            const vehicles = [${markers}];
            
            vehicles.forEach(vehicle => {
                const marker = new google.maps.Marker({
                    position: vehicle.position,
                    map: map,
                    title: vehicle.title,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: vehicle.color,
                        fillOpacity: 0.9,
                        strokeWeight: 2,
                        strokeColor: 'white'
                    }
                });

                marker.addListener('click', () => {
                    infoWindow.setContent(\`
                        <div class="info-window">
                            <h3>\${vehicle.title}</h3>
                            <p>\${vehicle.description}</p>
                        </div>
                    \`);
                    infoWindow.open(map, marker);
                });
            });

            ${userLocation ? `
            // Add user location marker
            new google.maps.Marker({
                position: { lat: ${userLocation.latitude}, lng: ${userLocation.longitude} },
                map: map,
                title: 'Your Location',
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: 'white'
                }
            });
            ` : ''}
        }

        // Handle errors
        window.onerror = function(msg, url, lineNo, columnNo, error) {
            console.error('Error: ', msg, url, lineNo, columnNo, error);
        };
    </script>
    
    <script async defer 
        src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap">
    </script>
</body>
</html>`;
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Kimlik doğrulanıyor...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Harita yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Ionicons name="map-outline" size={24} color="#3498DB" />
          <Text style={styles.headerTitle}>Araç Konumları</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshMap}
          >
            <Ionicons name="refresh" size={20} color="#3498DB" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Google Maps WebView */}
      <View style={styles.mapContainer}>
        <WebView
          key={webViewKey}
          source={{ html: generateMapHTML() }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          mixedContentMode="compatibility"
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color="#3498DB" />
              <Text style={styles.loadingText}>Google Maps yükleniyor...</Text>
            </View>
          )}
          onError={(error) => {
            console.error('WebView error:', error);
          }}
          onHttpError={(error) => {
            console.error('WebView HTTP error:', error);
          }}
        />
      </View>

      {/* Vehicle Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{vehicles.length}</Text>
          <Text style={styles.statLabel}>Toplam Araç</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {vehicles.filter(v => v.status === 'AVAILABLE').length}
          </Text>
          <Text style={styles.statLabel}>Müsait</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {vehicles.filter(v => v.status === 'RENTED').length}
          </Text>
          <Text style={styles.statLabel}>Kiralandı</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#2ECC71' }]} />
          <Text style={styles.legendText}>Müsait</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#E74C3C' }]} />
          <Text style={styles.legendText}>Kiralandı</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#F39C12' }]} />
          <Text style={styles.legendText}>Bakım</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3498DB',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});

export default MapScreen; 