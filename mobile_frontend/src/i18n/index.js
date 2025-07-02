import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Translation resources
import tr from './locales/tr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import ru from './locales/ru.json';

const LANGUAGE_STORAGE_KEY = '@rentesla_language';

// Safe locale detection function
const getDeviceLocale = () => {
  try {
    // First try expo-localization
    if (Localization.locale && typeof Localization.locale === 'string') {
      return Localization.locale;
    }
    
    // Fallback to locales array if available
    if (Localization.locales && Array.isArray(Localization.locales) && Localization.locales.length > 0) {
      return Localization.locales[0].languageTag || Localization.locales[0];
    }
    
    // Platform-specific fallbacks
    if (Platform.OS === 'ios') {
      return 'en-US'; // iOS default
    } else {
      return 'en-US'; // Android default
    }
  } catch (error) {
    console.error('Error getting device locale:', error);
    return 'en-US'; // Ultimate fallback
  }
};

// Language detection
const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      // Check stored language preference first
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLanguage) {
        console.log('Using stored language:', storedLanguage);
        callback(storedLanguage);
        return;
      }
      
      // Get device locale safely
      const deviceLocale = getDeviceLocale();
      console.log('Device locale detected:', deviceLocale);
      
      // Extract language code
      const languageCode = deviceLocale.split('-')[0].toLowerCase();
      
      // Check if we support the device language
      const supportedLanguages = ['tr', 'en', 'de', 'ru'];
      const detectedLanguage = supportedLanguages.includes(languageCode) ? languageCode : 'tr';
      
      console.log('Final detected language:', detectedLanguage);
      callback(detectedLanguage);
    } catch (error) {
      console.error('Language detection error:', error);
      callback('tr'); // Default to Turkish
    }
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.error('Language caching error:', error);
    }
  },
};

const resources = {
  tr: { translation: tr },
  en: { translation: en },
  de: { translation: de },
  ru: { translation: ru },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'tr',
    debug: __DEV__,
    
    interpolation: {
      escapeValue: false, // React already handles this
    },
    
    react: {
      useSuspense: false,
    },
    
    // Detection options
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n; 