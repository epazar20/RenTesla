import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import { loadStoredAuth, selectIsAuthenticated, selectAuthLoading } from '../store/slices/authSlice';
import { View, ActivityIndicator, AppState, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
// Screens
import HomeScreen from '../screens/HomeScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import VehicleListingScreen from '../screens/VehicleListingScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DocumentUploadScreen from '../screens/DocumentUploadScreen';
import MapScreen from '../screens/MapScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ProfileDetailsScreen from '../screens/ProfileDetailsScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
import PrivacySecurityScreen from '../screens/settings/PrivacySecurityScreen';
import LanguageSettingsScreen from '../screens/settings/LanguageSettingsScreen';
import HelpCenterScreen from '../screens/support/HelpCenterScreen';
import ContactUsScreen from '../screens/support/ContactUsScreen';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

const VehicleStack = () => (
  <RootStack.Navigator>
    <RootStack.Screen name="VehiclesList" component={VehiclesScreen} options={{ title: 'Available Vehicles' }} />
    <RootStack.Screen name="VehicleListing" component={VehicleListingScreen} options={{ title: 'Vehicle Listing' }} />
    <RootStack.Screen name="QRScanner" component={QRScannerScreen} options={{ title: 'QR Scanner', headerShown: false }} />
    <RootStack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: 'Vehicle Details' }} />
  </RootStack.Navigator>
);

const ProfileStack = () => (
  <RootStack.Navigator>
    <RootStack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
    <RootStack.Screen name="ProfileDetails" component={ProfileDetailsScreen} options={{ headerShown: false }} />
  </RootStack.Navigator>
);

// Standalone Document Upload Stack - Modal presentation
const DocumentUploadStack = () => (
  <RootStack.Navigator>
    <RootStack.Screen 
      name="DocumentUploadMain" 
      component={DocumentUploadScreen} 
        options={{ 
        headerShown: false // DocumentUploadScreen manages its own header
      }} 
      />
  </RootStack.Navigator>
  );

const TabNavigator = () => {
  let insets;
  try {
    insets = useSafeAreaInsets();
  } catch (error) {
    console.warn('SafeAreaInsets not available, using default values:', error);
    insets = { top: 0, bottom: 0, left: 0, right: 0 };
  }
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Vehicles') iconName = focused ? 'car' : 'car-outline';
          else if (route.name === 'Map') iconName = focused ? 'map' : 'map-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3498DB',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: Platform.OS === 'android' ? 70 + (insets.bottom || 0) : 60 + (insets.bottom || 0),
          paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom || 0, 10) : (insets.bottom || 0) + 8,
          paddingTop: 8,
          position: 'absolute',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: Platform.OS === 'android' ? 4 : 2,
        },
        headerStyle: { backgroundColor: '#1a1a1a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'RenTesla' }} />
      <Tab.Screen name="Vehicles" component={VehicleStack} options={{ headerShown: false }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Vehicle Map' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
};

const AuthStack = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="Login" component={LoginScreen} />
    <RootStack.Screen name="Signup" component={SignupScreen} />
  </RootStack.Navigator>
  );

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3498DB" />
  </View>
);

const AppNavigator = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);
  const appStateRef = useRef(AppState.currentState);
  const { t } = useTranslation();

  useEffect(() => {
    dispatch(loadStoredAuth());
  }, [dispatch]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator 
        screenOptions={{ 
          headerShown: false,
          presentation: 'card'
        }}
      >
        {isAuthenticated ? (
          <>
            <RootStack.Screen 
              name="MainTabs" 
              component={TabNavigator} 
              options={{ headerShown: false }}
            />
            {/* Document Upload Modal - Standalone */}
            <RootStack.Screen 
              name="DocumentUploadModal" 
              component={DocumentUploadStack}
              options={{ 
                presentation: 'modal',
                headerShown: false,
                gestureEnabled: true,
                animationTypeForReplace: 'push'
              }}
            />
            <RootStack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{
                title: t('settings.notifications'),
                headerShown: true,
                presentation: 'card',
              }}
            />
            <RootStack.Screen
              name="PrivacySettings"
              component={PrivacySecurityScreen}
              options={{
                title: t('settings.privacy'),
                headerShown: true,
                presentation: 'card',
              }}
            />
            <RootStack.Screen
              name="LanguageSettings"
              component={LanguageSettingsScreen}
              options={{
                title: t('language.selectLanguage'),
                headerShown: true,
                presentation: 'card',
              }}
            />
            <RootStack.Screen
              name="HelpCenter"
              component={HelpCenterScreen}
              options={{
                title: t('profile.helpCenter'),
                headerShown: true,
                presentation: 'card',
              }}
            />
            <RootStack.Screen
              name="ContactUs"
              component={ContactUsScreen}
              options={{
                title: t('profile.contactUs'),
                headerShown: true,
                presentation: 'card',
              }}
            />
          </>
        ) : (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
});

export default AppNavigator; 