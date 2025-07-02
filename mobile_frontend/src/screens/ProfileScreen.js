import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectUser, selectUserRole, logoutUser } from '../store/slices/authSlice';
import LanguageSelector from '../components/LanguageSelector';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Available languages
const languages = [
  { code: 'tr', name: 'Türkçe', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' }
];

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const userRole = useSelector(selectUserRole);
  const { t, i18n } = useTranslation();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  
  let insets;
  try {
    insets = useSafeAreaInsets();
  } catch (error) {
    console.warn('SafeAreaInsets not available, using default values:', error);
    insets = { top: 0, bottom: 0, left: 0, right: 0 };
  }

  // Check if user is admin
  const isAdmin = userRole === 'ADMIN' || userRole === 'MANAGER';

  // Force re-render on language change
  useEffect(() => {
    // Log the translation value for debugging
    console.log('profile.documents translation:', t('profile.documents'));
  }, [i18n.language]);

  const handleLogout = () => {
    Alert.alert(
      t('auth.signOut'),
      t('auth.signOutConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('auth.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(logoutUser()).unwrap();
              // Navigation will be handled automatically by Redux state change
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert(t('common.error'), t('auth.failedToSignOut'));
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

  const menuItems = [
    {
      id: 'personalInfo',
      title: t('profile.personalInfo'),
      icon: 'person-outline',
      onPress: () => navigation.navigate('ProfileDetails', { userId: user?.id || user?.userId }),
    },
    {
      id: 'documents',
      title: t('profile.documentManagement'),
      subtitle: t('documents.manageDocuments'),
      icon: 'document-text-outline',
      onPress: () => {
        console.log('📋 ProfileScreen: Opening Document Upload Modal');
        navigation.navigate('DocumentUploadModal', { 
          screen: 'DocumentUploadMain',
          params: { 
            userId: user?.id || user?.userId,
            fromProfile: true
          } 
        });
      },
    },
    // Admin-only menu item
    ...(isAdmin ? [{
      id: 'adminDocumentReview',
      title: t('profile.adminDocumentReview', 'Document Review (Admin)'),
      icon: 'shield-checkmark',
      onPress: () => navigation.navigate('AdminDocumentReview'),
      adminOnly: true,
    }] : []),
    {
      id: 'language',
      title: t('profile.language'),
      icon: 'language',
      onPress: () => setLanguageModalVisible(true),
    },
    {
      id: 'notifications',
      title: t('profile.notifications'),
      icon: 'notifications',
      onPress: () => {
        // TODO: Navigate to notifications settings
        Alert.alert(t('comingSoon'), t('featureComingSoon'));
      },
    },
  ];

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ 
        paddingBottom: Platform.OS === 'android' ? (insets.bottom || 0) + 90 : (insets.bottom || 0) + 80 
      }}
    >
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
        {menuItems.map((item) => (
          <ProfileItem
            key={item.id}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            onPress={item.onPress}
          />
        ))}
      </View>

      {/* Settings Section */}
      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
        
        <ProfileItem
          icon="notifications-outline"
          title={t('profile.notifications')}
          subtitle={t('profile.notificationPrefs')}
          onPress={() => Alert.alert(t('comingSoon'), t('featureComingSoon'))}
        />
        
        <ProfileItem
          icon="language-outline"
          title={t('profile.language')}
          subtitle={t('language.selectLanguage')}
          onPress={() => setLanguageModalVisible(true)}
        />
        
        <ProfileItem
          icon="shield-outline"
          title={t('profile.privacy')}
          subtitle={t('profile.privacySettings')}
          onPress={() => Alert.alert(t('comingSoon'), t('featureComingSoon'))}
        />
      </View>

      {/* Support Section */}
      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>{t('profile.support')}</Text>
        
        <ProfileItem
          icon="help-circle-outline"
          title={t('profile.helpCenter')}
          subtitle={t('profile.getHelp')}
          onPress={() => Alert.alert(t('comingSoon'), t('featureComingSoon'))}
        />
        
        <ProfileItem
          icon="chatbubble-outline"
          title={t('profile.contactUs')}
          subtitle={t('profile.sendMessage')}
          onPress={() => Alert.alert(t('comingSoon'), t('featureComingSoon'))}
        />
        
        <ProfileItem
          icon="star-outline"
          title={t('profile.rateApp')}
          subtitle={t('profile.sharefeedback')}
          onPress={() => Alert.alert(t('comingSoon'), t('featureComingSoon'))}
        />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#F44336" />
        <Text style={styles.logoutText}>{t('auth.signOut')}</Text>
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>{t('profile.appVersion')}</Text>
        <Text style={styles.appInfoText}>{t('profile.copyright')}</Text>
      </View>

      {/* Language Modal */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('language.selectLanguage')}</Text>
              <TouchableOpacity
                onPress={() => setLanguageModalVisible(false)}
                style={styles.modalCloseIcon}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.languageList}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageItem,
                    i18n.language === lang.code && styles.selectedLanguageItem
                  ]}
                  onPress={() => {
                    i18n.changeLanguage(lang.code);
                    setLanguageModalVisible(false);
                  }}
                >
                  <View style={styles.languageItemLeft}>
                    <Text style={styles.languageFlag}>{lang.flag}</Text>
                    <View style={styles.languageItemText}>
                      <Text style={[
                        styles.languageName,
                        i18n.language === lang.code && styles.selectedLanguageName
                      ]}>
                        {lang.nativeName}
                      </Text>
                      <Text style={styles.languageSubtitle}>{lang.name}</Text>
                    </View>
                  </View>
                  {i18n.language === lang.code && (
                    <Ionicons name="checkmark-circle" size={24} color="#e60012" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
    marginHorizontal: 15,
    borderRadius: 10,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    padding: 15,
    paddingBottom: 5,
    backgroundColor: '#f8f8f8',
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    fontWeight: '500',
    color: '#333',
  },
  profileItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F44336',
    marginLeft: 10,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  appInfoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    width: '85%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseIcon: {
    padding: 5,
  },
  languageList: {
    // Remove flexDirection: 'row' and flexWrap: 'wrap' for vertical layout
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 5,
  },
  languageItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 15,
  },
  languageItemText: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  languageSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  selectedLanguageItem: {
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#e60012',
  },
  selectedLanguageName: {
    fontWeight: 'bold',
    color: '#e60012',
  },
});

export default ProfileScreen; 