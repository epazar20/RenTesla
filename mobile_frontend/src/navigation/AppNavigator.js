import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';

// Import screens
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

// Import services
import AuthService from '../services/authService';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Vehicle Stack Navigator
const VehicleStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="VehiclesList" 
        component={VehiclesScreen}
        options={{ title: 'Available Vehicles' }}
      />
      <Stack.Screen 
        name="VehicleListing" 
        component={VehicleListingScreen}
        options={{ title: 'Vehicle Listing' }}
      />
      <Stack.Screen 
        name="QRScanner" 
        component={QRScannerScreen}
        options={{ 
          title: 'QR Scanner',
          headerShown: false 
        }}
      />
      <Stack.Screen 
        name="VehicleDetail" 
        component={VehicleDetailScreen}
        options={{ title: 'Vehicle Details' }}
      />
    </Stack.Navigator>
  );
};

// Profile Stack Navigator
const ProfileStack = ({ onAuthStateChange }) => {
  const ProfileScreenWithAuth = (props) => (
    <ProfileScreen {...props} onAuthStateChange={onAuthStateChange} />
  );

  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreenWithAuth}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="Documents" 
        component={DocumentUploadScreen}
        options={{ title: 'Document Upload' }}
      />
    </Stack.Navigator>
  );
};

// Main Tab Navigator
const TabNavigator = ({ onAuthStateChange }) => {
  const ProfileStackWithAuth = (props) => (
    <ProfileStack {...props} onAuthStateChange={onAuthStateChange} />
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Vehicles') {
            iconName = focused ? 'car' : 'car-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3498DB',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        },
        headerStyle: {
          backgroundColor: '#1a1a1a',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'RenTesla' }}
      />
      <Tab.Screen 
        name="Vehicles" 
        component={VehicleStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{ title: 'Vehicle Map' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackWithAuth}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

// Auth Stack Navigator
const AuthStack = ({ onAuthStateChange }) => {
  const LoginScreenWithAuth = (props) => (
    <LoginScreen {...props} onAuthStateChange={onAuthStateChange} />
  );

  const SignupScreenWithAuth = (props) => (
    <SignupScreen {...props} onAuthStateChange={onAuthStateChange} />
  );

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreenWithAuth} />
      <Stack.Screen name="Signup" component={SignupScreenWithAuth} />
    </Stack.Navigator>
  );
};

// Loading Component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3498DB" />
  </View>
);

// Main App Navigator with Authentication State Management
const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    initializeAuth();
    
    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => subscription?.remove();
  }, []);

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground - check auth state
      checkAuthState();
    }
    appState.current = nextAppState;
  };

  const initializeAuth = async () => {
    try {
      const authenticated = await AuthService.initializeAuth();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Auth initialization error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuthState = async () => {
    try {
      const authenticated = await AuthService.isAuthenticated();
      if (authenticated !== isAuthenticated) {
        setIsAuthenticated(authenticated);
      }
    } catch (error) {
      console.error('Auth state check error:', error);
    }
  };

  const handleAuthStateChange = (authenticated) => {
    setIsAuthenticated(authenticated);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthStack onAuthStateChange={handleAuthStateChange} />
      ) : (
        <TabNavigator onAuthStateChange={handleAuthStateChange} />
      )}
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