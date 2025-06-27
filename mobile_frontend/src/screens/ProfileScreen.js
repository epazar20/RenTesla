import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '../services/authService';

const ProfileScreen = ({ navigation, onAuthStateChange }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AuthService.getUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
              // Notify parent about auth state change
              if (onAuthStateChange) {
                onAuthStateChange(false);
              }
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const ProfileItem = ({ icon, title, subtitle, onPress, showArrow = true }) => (
    <TouchableOpacity style={styles.profileItem} onPress={onPress}>
      <View style={styles.profileItemLeft}>
        <Ionicons name={icon} size={24} color="#e60012" />
        <View style={styles.profileItemText}>
          <Text style={styles.profileItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.profileItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showArrow && <Ionicons name="chevron-forward-outline" size={20} color="#ccc" />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <Text style={styles.userName}>{user?.username || 'Demo User'}</Text>
        <Text style={styles.userEmail}>{user?.role || 'USER'}</Text>
      </View>

      {/* Profile Options */}
      <View style={styles.profileSection}>
        <ProfileItem
          icon="person-outline"
          title="Personal Information"
          subtitle="Update your profile details"
          onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available soon!')}
        />
        
        <ProfileItem
          icon="key-outline"
          title="My Rentals"
          subtitle="View rental history"
          onPress={() => Alert.alert('Coming Soon', 'Rental history will be available soon!')}
        />
        
        <ProfileItem
          icon="heart-outline"
          title="Favorites"
          subtitle="Your favorite vehicles"
          onPress={() => Alert.alert('Coming Soon', 'Favorites feature will be available soon!')}
        />
        
        <ProfileItem
          icon="card-outline"
          title="Payment Methods"
          subtitle="Manage payment options"
          onPress={() => Alert.alert('Coming Soon', 'Payment management will be available soon!')}
        />
      </View>

      {/* Settings Section */}
      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <ProfileItem
          icon="notifications-outline"
          title="Notifications"
          subtitle="Manage notification preferences"
          onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available soon!')}
        />
        
        <ProfileItem
          icon="language-outline"
          title="Language"
          subtitle="English"
          onPress={() => Alert.alert('Coming Soon', 'Language selection will be available soon!')}
        />
        
        <ProfileItem
          icon="shield-outline"
          title="Privacy & Security"
          subtitle="Manage your privacy settings"
          onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available soon!')}
        />
      </View>

      {/* Support Section */}
      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <ProfileItem
          icon="help-circle-outline"
          title="Help Center"
          subtitle="Get help and support"
          onPress={() => Alert.alert('Coming Soon', 'Help center will be available soon!')}
        />
        
        <ProfileItem
          icon="chatbubble-outline"
          title="Contact Us"
          subtitle="Send us a message"
          onPress={() => Alert.alert('Coming Soon', 'Contact feature will be available soon!')}
        />
        
        <ProfileItem
          icon="star-outline"
          title="Rate the App"
          subtitle="Share your feedback"
          onPress={() => Alert.alert('Coming Soon', 'App rating will be available soon!')}
        />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#F44336" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>RenTesla v1.0.0</Text>
        <Text style={styles.appInfoText}>© 2024 RenTesla. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileHeader: {
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e60012',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#ccc',
  },
  profileSection: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  profileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileItemText: {
    marginLeft: 15,
    flex: 1,
  },
  profileItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  profileItemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 8,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  appInfoText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
});

export default ProfileScreen; 