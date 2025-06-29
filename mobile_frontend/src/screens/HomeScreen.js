import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/apiService';
import authService from '../services/authService';
import * as SecureStore from 'expo-secure-store';

const HomeScreen = ({ navigation }) => {
  const [stats, setStats] = useState({
    vehicles: null,
    totalVehicles: 0,
    availableVehicles: 0,
    averageBatteryLevel: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDocumentVerified, setIsDocumentVerified] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Check authentication status first
      const authStatus = await authService.isAuthenticated();
      setIsAuthenticated(authStatus);
      
      if (!authStatus) {
        console.log('⚠️ User not authenticated, skipping stats loading');
        setLoading(false);
        return;
      }

      // Get user ID from secure storage
      const userData = await SecureStore.getItemAsync('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        setUserId(user.userId || user.id);
        
        // Check document verification status
        if (user.userId || user.id) {
          await checkDocumentVerification(user.userId || user.id);
        }
      }
      
      // Load stats only if authenticated
      await loadStats();
    } catch (error) {
      console.error('Error loading initial data:', error);
      setLoading(false);
    }
  };

  const checkDocumentVerification = async (userId) => {
    try {
      const verificationStatus = await apiService.checkUserVerification(userId);
      setIsDocumentVerified(verificationStatus.verified);
      console.log('📋 Document verification status:', verificationStatus.verified);
    } catch (error) {
      console.error('Error checking document verification:', error);
      setIsDocumentVerified(false);
    }
  };

  const loadStats = async () => {
    try {
      // Double check authentication
      const authStatus = await authService.isAuthenticated();
      if (!authStatus) {
        console.log('⚠️ User not authenticated, cannot load stats');
        return;
      }

      // Load vehicle statistics
      const vehicleStats = await apiService.getVehicleStats();
      const allVehicles = await apiService.getAllVehicles();
      
      const availableVehicles = allVehicles.filter(v => v.status === 'AVAILABLE').length;
      const averageBattery = allVehicles.reduce((sum, v) => sum + (v.batteryLevel || 0), 0) / allVehicles.length;

      setStats({
        vehicles: vehicleStats,
        totalVehicles: allVehicles.length,
        availableVehicles: availableVehicles,
        averageBatteryLevel: Math.round(averageBattery || 0),
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set default values if API call fails
      setStats({
        vehicles: null,
        totalVehicles: 0,
        availableVehicles: 0,
        averageBatteryLevel: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInitialData(); // Use loadInitialData to include auth check
  };

  const StatCard = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.statCardContent}>
        <View style={styles.statCardLeft}>
          <Text style={styles.statCardTitle}>{title}</Text>
          <Text style={styles.statCardValue}>{value}</Text>
        </View>
        <Ionicons name={icon} size={32} color={color} />
      </View>
    </TouchableOpacity>
  );

  const QuickAction = ({ title, icon, color, onPress, badge }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="white" />
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const FeatureCard = ({ title, description, icon, color, onPress, isNew = false }) => (
    <TouchableOpacity style={styles.featureCard} onPress={onPress}>
      <View style={styles.featureCardContent}>
        <View style={[styles.featureIcon, { backgroundColor: color }]}>
          <Ionicons name={icon} size={28} color="white" />
        </View>
        <View style={styles.featureInfo}>
          <View style={styles.featureTitleContainer}>
            <Text style={styles.featureTitle}>{title}</Text>
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>YENİ</Text>
              </View>
            )}
          </View>
          <Text style={styles.featureDescription}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const handleDocumentVerificationPress = () => {
    if (isDocumentVerified) {
      Alert.alert('✅ Belge Doğrulama', 'Belge doğrulama işlemi tamamlandı!');
    } else {
      Alert.alert(
        '⚠️ Belge Doğrulama',
        'Belge doğrulama işlemi henüz tamamlanmamış. Belgelerinizi yüklemek için devam edin.',
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Belgelerimi Yükle', 
            onPress: () => navigation.navigate('Profile', { 
              screen: 'Documents',
              params: { userId: userId }
            })
          }
        ]
      );
    }
  };

  // If not authenticated, show login prompt
  if (!isAuthenticated && !loading) {
    return (
      <View style={styles.container}>
        <View style={styles.notAuthenticatedContainer}>
          <Ionicons name="log-in-outline" size={80} color="#3498DB" />
          <Text style={styles.notAuthenticatedTitle}>RenTesla'ya Hoşgeldiniz</Text>
          <Text style={styles.notAuthenticatedSubtitle}>
            Araç kiralama hizmetlerimizden yararlanmak için giriş yapın
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
          >
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.signupButton}
            onPress={() => navigation.navigate('Auth', { screen: 'Signup' })}
          >
            <Text style={styles.signupButtonText}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>RenTesla'ya Hoşgeldiniz</Text>
        <Text style={styles.welcomeSubtitle}>Elektrikli araç kiralama deneyiminiz burada başlıyor</Text>
      </View>

      {/* PRD Feature Cards */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Ana Özellikler</Text>
        
        <FeatureCard
          title="Araç Listesi & Arama"
          description="Konum tabanlı arama ile size en yakın araçları keşfedin"
          icon="car-outline"
          color="#3498DB"
          isNew={true}
          onPress={() => navigation.navigate('Vehicles', { 
            screen: 'VehicleListing', 
            params: { userId: userId } 
          })}
        />
        
        <FeatureCard
          title="QR Kod Tarama"
          description="Araç üzerindeki QR kodu tarayarak hızlıca kiralayın"
          icon="qr-code-outline"
          color="#2ECC71"
          isNew={true}
          onPress={() => navigation.navigate('Vehicles', { 
            screen: 'QRScanner', 
            params: { userId: userId } 
          })}
        />
        
        <FeatureCard
          title="Belge Doğrulama"
          description="OCR teknolojisi ile belgelerinizi güvenle yükleyin"
          icon="document-text-outline"
          color="#E74C3C"
          onPress={handleDocumentVerificationPress}
        />
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Filo Durumu</Text>
        
        <StatCard
          title="Müsait Araçlar"
          value={stats.availableVehicles}
          icon="car-outline"
          color="#2ECC71"
          onPress={() => navigation.navigate('Vehicles', { 
            screen: 'VehicleListing', 
            params: { userId: userId } 
          })}
        />
        
        <StatCard
          title="Toplam Araç"
          value={stats.totalVehicles}
          icon="car-sport-outline"
          color="#3498DB"
        />
        
        <StatCard
          title="Ortalama Şarj"
          value={`${stats.averageBatteryLevel}%`}
          icon="battery-half-outline"
          color="#F39C12"
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
        
        <View style={styles.quickActionsGrid}>
          <QuickAction
            title="Araç Listesi"
            icon="list"
            color="#3498DB"
            badge={stats.availableVehicles > 0 ? stats.availableVehicles : null}
            onPress={() => navigation.navigate('Vehicles', { 
              screen: 'VehicleListing', 
              params: { userId: userId } 
            })}
          />
          
          <QuickAction
            title="QR Tarama"
            icon="qr-code"
            color="#2ECC71"
            onPress={() => navigation.navigate('Vehicles', { 
              screen: 'QRScanner', 
              params: { userId: userId } 
            })}
          />
          
          <QuickAction
            title="Yakın Araçlar"
            icon="location"
            color="#E74C3C"
            onPress={() => navigation.navigate('Map')}
          />
          
          <QuickAction
            title="Profilim"
            icon="person"
            color="#9B59B6"
            onPress={() => navigation.navigate('Profile')}
          />
        </View>
      </View>

      {/* PRD Progress */}
      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>Geliştirme Durumu</Text>
        
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>PRD İlerleme Durumu</Text>
          
          <View style={styles.progressItem}>
            <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
            <Text style={styles.progressText}>1. KVKK Onayları & Belge Yükleme</Text>
          </View>
          
          <View style={styles.progressItem}>
            <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
            <Text style={styles.progressText}>2. Konum Tabanlı Araç Listeleme & QR Tarama</Text>
          </View>
          
          <View style={styles.progressItem}>
            <Ionicons name="ellipse-outline" size={20} color="#F39C12" />
            <Text style={styles.progressTextPending}>3. Tarih/Teslimat Konumu ile Araç Seçimi</Text>
          </View>
          
          <View style={styles.progressItem}>
            <Ionicons name="ellipse-outline" size={20} color="#95A5A6" />
            <Text style={styles.progressTextPending}>4. Müsaitlik Kontrolü & Rezervasyon</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Son Aktiviteler</Text>
        <View style={styles.activityCard}>
          <Text style={styles.activityText}>🚗 QR kod tarama özelliği eklendi</Text>
          <Text style={styles.activityTime}>2 saat önce</Text>
        </View>
        <View style={styles.activityCard}>
          <Text style={styles.activityText}>📍 Konum tabanlı araç arama aktif</Text>
          <Text style={styles.activityTime}>4 saat önce</Text>
        </View>
        <View style={styles.activityCard}>
          <Text style={styles.activityText}>📄 OCR belge doğrulama sistemi güncellendi</Text>
          <Text style={styles.activityTime}>1 gün önce</Text>
        </View>
      </View>
    </ScrollView>
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
    fontSize: 16,
    color: '#666',
  },
  welcomeSection: {
    backgroundColor: '#2C3E50',
    padding: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#BDC3C7',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginRight: 8,
  },
  newBadge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  featureDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardLeft: {
    flex: 1,
  },
  statCardTitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 6,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 12,
    flex: 1,
  },
  progressTextPending: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 12,
    flex: 1,
  },
  recentSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityText: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 6,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: '#95A5A6',
  },
  notAuthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notAuthenticatedTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
    marginTop: 20,
    textAlign: 'center',
  },
  notAuthenticatedSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  loginButton: {
    backgroundColor: '#3498DB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    maxWidth: 300,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  signupButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3498DB',
    width: '100%',
    maxWidth: 300,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498DB',
    textAlign: 'center',
  },
});

export default HomeScreen; 