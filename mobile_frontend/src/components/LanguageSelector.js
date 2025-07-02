import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const LanguageSelector = ({ showLabel = true, size = 'medium', style = {} }) => {
  const { t, i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));

  const languages = [
    {
      code: 'tr',
      name: t('language.turkish'),
      flag: '🇹🇷',
      nativeName: t('language.turkish')
    },
    {
      code: 'en',
      name: t('language.english'),
      flag: '🇺🇸',
      nativeName: t('language.english')
    },
    {
      code: 'de',
      name: t('language.german'),
      flag: '🇩🇪',
      nativeName: t('language.german')
    },
    {
      code: 'ru',
      name: t('language.russian'),
      flag: '🇷🇺',
      nativeName: t('language.russian')
    }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const openModal = () => {
    setModalVisible(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
    });
  };

  const selectLanguage = async (languageCode) => {
    try {
      await i18n.changeLanguage(languageCode);
      closeModal();
    } catch (error) {
      console.error('Language change error:', error);
      closeModal();
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return { width: 40, height: 40, fontSize: 20 };
      case 'large':
        return { width: 60, height: 60, fontSize: 28 };
      default:
        return { width: 50, height: 50, fontSize: 24 };
    }
  };

  const buttonSize = getButtonSize();

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.languageButton,
          {
            width: buttonSize.width,
            height: buttonSize.height,
          }
        ]}
        onPress={openModal}
        activeOpacity={0.8}
      >
        <Text style={[styles.flagText, { fontSize: buttonSize.fontSize }]}>
          {currentLanguage.flag}
        </Text>
        <View style={styles.dropdownIcon}>
          <Ionicons name="chevron-down" size={12} color="#666" />
        </View>
      </TouchableOpacity>

      {showLabel && (
        <Text style={styles.languageLabel}>
          {currentLanguage.nativeName}
        </Text>
      )}

      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('language.selectLanguage')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.languagesList}>
              {languages.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageItem,
                    currentLanguage.code === language.code && styles.selectedLanguageItem
                  ]}
                  onPress={() => selectLanguage(language.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.languageContent}>
                    <View style={styles.languageLeft}>
                      <Text style={styles.flagIcon}>{language.flag}</Text>
                      <View style={styles.languageTexts}>
                        <Text style={[
                          styles.languageName,
                          currentLanguage.code === language.code && styles.selectedLanguageName
                        ]}>
                          {language.name}
                        </Text>
                        <Text style={styles.languageNative}>
                          {language.nativeName}
                        </Text>
                      </View>
                    </View>
                    {currentLanguage.code === language.code && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#3498DB"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  languageButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  flagText: {
    textAlign: 'center',
  },
  dropdownIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFF',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  languageLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: width * 0.85,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  languagesList: {
    padding: 10,
  },
  languageItem: {
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedLanguageItem: {
    backgroundColor: '#E3F2FD',
    borderColor: '#3498DB',
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flagIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  languageTexts: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  selectedLanguageName: {
    color: '#3498DB',
  },
  languageNative: {
    fontSize: 14,
    color: '#7F8C8D',
  },
});

export default LanguageSelector; 