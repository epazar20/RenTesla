import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectIsAuthenticated, selectUser } from '../store/slices/authSlice';
import { apiService } from '../services/apiService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HomeScreen = ({ navigation }) => {
  const [stats, setStats] = useState({
    vehicles: null,
    totalVehicles: 0,
    availableVehicles: 0,
    averageBatteryLevel: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDocumentVerified, setIsDocumentVerified] = useState(false);

  // Redux selectors
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const userId = user?.id || user?.userId;
  
  // Translation hook
  const { t } = useTranslation();

  let insets;
  try {
    insets = useSafeAreaInsets();
  } catch (error) {
    console.warn('SafeAreaInsets not available, using default values:', error);
    insets = { top: 0, bottom: 0, left: 0, right: 0 };
  }

  useEffect(() => {
    loadInitialData();
  }, [isAuthenticated]);

  const loadInitialData = async () => {
    try {
      // Authentication is now handled by Redux and MainNavigator
      // HomeScreen will only render if user is authenticated
      if (!isAuthenticated) {
        console.log('⚠️ User not authenticated, MainNavigator should handle this');
        setLoading(false);
        return;
      }

      console.log(`👤 Loading data for user: ${user?.username} (ID: ${userId})`);
      
      // Check document verification status
      if (userId) {
        await checkDocumentVerification(userId);
      }
      
      // Load stats
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
      if (!isAuthenticated) {
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
    loadInitialData();
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
                <Text style={styles.newBadgeText}>{t('features.new')}</Text>
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
    console.log('🏠 HomeScreen: Opening Document Upload Modal');
    
    // Open DocumentUploadModal as standalone modal
    navigation.navigate('DocumentUploadModal', { 
      screen: 'DocumentUploadMain',
      params: { 
        userId,
        fromHome: true,
        preventAutoReturn: true
      } 
    });
    
    console.log('✅ Document Upload Modal opened');
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ 
        paddingBottom: Platform.OS === 'android' ? (insets.bottom || 0) + 90 : (insets.bottom || 0) + 80 
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>{t('home.welcome', { username: user?.username || 'User' })}</Text>
        <Text style={styles.welcomeSubtitle}>{t('home.subtitle')}</Text>
      </View>

      {/* PRD Feature Cards */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>{t('home.mainFeatures')}</Text>
        
        <FeatureCard
          title={t('features.vehicleListTitle')}
          description={t('features.vehicleListDesc')}
          icon="car-outline"
          color="#3498DB"
          isNew={true}
          onPress={() => navigation.navigate('Vehicles', { 
            screen: 'VehicleListing', 
            params: { userId: userId } 
          })}
        />
        
        <FeatureCard
          title={t('features.qrScanTitle')}
          description={t('features.qrScanDesc')}
          icon="qr-code-outline"
          color="#2ECC71"
          isNew={true}
          onPress={() => navigation.navigate('Vehicles', { 
            screen: 'QRScanner', 
            params: { userId: userId } 
          })}
        />
        
        <FeatureCard
          title={t('features.documentTitle')}
          description={t('features.documentDesc')}
          icon="document-text-outline"
          color="#E74C3C"
          onPress={handleDocumentVerificationPress}
        />
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>{t('home.fleetStatus')}</Text>
        
        <StatCard
          title={t('home.availableVehicles')}
          value={stats.availableVehicles}
          icon="car-outline"
          color="#2ECC71"
          onPress={() => navigation.navigate('Vehicles', { 
            screen: 'VehicleListing', 
            params: { userId: userId } 
          })}
        />
        
        <StatCard
          title={t('home.totalVehicles')}
          value={stats.totalVehicles}
          icon="car-sport-outline"
          color="#3498DB"
        />
        
        <StatCard
          title={t('home.averageCharge')}
          value={`${stats.averageBatteryLevel}%`}
          icon="battery-half-outline"
          color="#F39C12"
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>{t('home.quickAccess')}</Text>
        
        <View style={styles.quickActionsGrid}>
          <QuickAction
            title={t('quickActions.vehicleList')}
            icon="list"
            color="#3498DB"
            badge={stats.availableVehicles > 0 ? stats.availableVehicles : null}
            onPress={() => navigation.navigate('Vehicles', { 
              screen: 'VehicleListing', 
              params: { userId: userId } 
            })}
          />
          
          <QuickAction
            title={t('quickActions.qrScan')}
            icon="qr-code"
            color="#2ECC71"
            onPress={() => navigation.navigate('Vehicles', { 
              screen: 'QRScanner', 
              params: { userId: userId } 
            })}
          />
          
          <QuickAction
            title={t('quickActions.nearbyVehicles')}
            icon="location"
            color="#E74C3C"
            onPress={() => navigation.navigate('Map')}
          />
          
          <QuickAction
            title={t('quickActions.profile')}
            icon="person"
            color="#9B59B6"
            onPress={() => navigation.navigate('Profile')}
          />
        </View>
      </View>

      {/* PRD Progress */}
      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>{t('home.developmentStatus')}</Text>
        
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>{t('progress.title')}</Text>
          
          <View style={styles.progressItem}>
            <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
            <Text style={styles.progressText}>{t('progress.kvkkCompleted')}</Text>
          </View>
          
          <View style={styles.progressItem}>
            <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
            <Text style={styles.progressText}>{t('progress.locationCompleted')}</Text>
          </View>
          
          <View style={styles.progressItem}>
            <Ionicons name="ellipse-outline" size={20} color="#F39C12" />
            <Text style={styles.progressTextPending}>{t('progress.selectionPending')}</Text>
          </View>
          
          <View style={styles.progressItem}>
            <Ionicons name="ellipse-outline" size={20} color="#95A5A6" />
            <Text style={styles.progressTextPending}>{t('progress.reservationPending')}</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>{t('home.recentActivities')}</Text>
        <View style={styles.activityCard}>
          <Text style={styles.activityText}>🔐 {t('activities.jwtAdded')}</Text>
          <Text style={styles.activityTime}>{t('activities.justNow')}</Text>
        </View>
        <View style={styles.activityCard}>
          <Text style={styles.activityText}>🚗 {t('activities.qrAdded')}</Text>
          <Text style={styles.activityTime}>{t('activities.hoursAgo', { hours: 2 })}</Text>
        </View>
        <View style={styles.activityCard}>
          <Text style={styles.activityText}>📍 {t('activities.locationSearch')}</Text>
          <Text style={styles.activityTime}>{t('activities.hoursAgo', { hours: 4 })}</Text>
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
});

export default HomeScreen; 