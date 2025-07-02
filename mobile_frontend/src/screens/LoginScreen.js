import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { loginUser, selectAuthLoading, selectAuthError } from '../store/slices/authSlice';
import notificationService from '../services/notificationService';

// Language options for inline selector
const languages = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' }
];

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('test@rentesla.com');
  const [password, setPassword] = useState('password123');
  
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);
  const { t, i18n } = useTranslation();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.enterCredentials'));
      return;
    }

    try {
      const result = await dispatch(loginUser({ 
        username: username.trim(), 
        password 
      })).unwrap();
      
      console.log(`✅ Login successful, welcome ${result.username}!`);
      // Navigation will happen automatically via Redux state change
      
      // Initialize notifications after successful login
        console.log('🔄 Initializing notifications after login...');
        await notificationService.initialize();
      console.log('✅ Local notifications initialized after login (Expo Go, no push)');
      
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        t('auth.loginFailed'), 
        error || t('auth.checkCredentials')
      );
    }
  };

  const handleLanguageChange = async (languageCode) => {
    try {
      await i18n.changeLanguage(languageCode);
    } catch (error) {
      console.error('Language change error:', error);
    }
  };

  const InlineLanguageSelector = () => {
    return (
      <View style={styles.languageSelectorContainer}>
        <View style={styles.languageOptions}>
          {languages.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageOption,
                i18n.language === language.code && styles.activeLanguageOption
              ]}
              onPress={() => handleLanguageChange(language.code)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.languageFlag,
                i18n.language === language.code && styles.activeLanguageFlag
              ]}>
                {language.flag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo/Title */}
          <View style={styles.header}>
            {/* Inline Language Selector - Moved to center */}
            <InlineLanguageSelector />
            
            <Text style={styles.title}>{t('auth.loginTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('auth.username')}</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder={t('auth.username')}
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.password')}
                placeholderTextColor="#999"
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.loadingText}>{t('auth.loggingIn')}</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>{t('auth.loginButton')}</Text>
              )}
            </TouchableOpacity>

            {/* Show auth error if present */}
            {authError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}
          </View>

          {/* Demo Credentials */}
          <View style={styles.demoInfo}>
            <Text style={styles.demoTitle}>{t('auth.demoCredentials')}</Text>
            <Text style={styles.demoText}>{t('auth.demoUsername')}</Text>
            <Text style={styles.demoText}>{t('auth.demoPassword')}</Text>
          </View>

          {/* Signup Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>{t('auth.noAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>{t('auth.signup')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  languageSelectorContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  languageOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeLanguageOption: {
    backgroundColor: '#E31E2E',
    borderColor: '#B71C1C',
    shadowColor: '#E31E2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  languageFlag: {
    fontSize: 22,
  },
  activeLanguageFlag: {
    fontSize: 22,
    // Keep the emoji color natural, don't override it
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E31E2E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#E31E2E',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    backgroundColor: '#999',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 10,
  },
  errorContainer: {
    backgroundColor: '#FFE6E6',
    borderWidth: 1,
    borderColor: '#FFB3B3',
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
  },
  errorText: {
    color: '#CC0000',
    fontSize: 14,
    textAlign: 'center',
  },
  demoInfo: {
    backgroundColor: '#E8F4F8',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B3D9E8',
    marginBottom: 20,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5AA0',
    marginBottom: 5,
  },
  demoText: {
    fontSize: 12,
    color: '#2C5AA0',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 16,
    color: '#666',
  },
  signupLink: {
    fontSize: 16,
    color: '#E31E2E',
    fontWeight: '600',
  },
});

export default LoginScreen; 