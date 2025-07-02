import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, useTheme, RadioButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../store/userStore';
import Toast from 'react-native-toast-message';

const LanguageSettingsScreen = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { user, updateUser } = useUserStore();

  const languages = [
    { code: 'tr', name: 'language.turkish' },
    { code: 'en', name: 'language.english' },
    { code: 'de', name: 'language.german' },
    { code: 'ru', name: 'language.russian' },
  ];

  const handleLanguageChange = async (languageCode) => {
    try {
      await i18n.changeLanguage(languageCode);
      updateUser({ language: languageCode });
      Toast.show({
        type: 'success',
        text1: t('language.languageChanged'),
      });
    } catch (error) {
      console.error('Error changing language:', error);
      Toast.show({
        type: 'error',
        text1: t('errors.somethingWrong'),
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        {languages.map((language) => (
          <List.Item
            key={language.code}
            title={t(language.name)}
            onPress={() => handleLanguageChange(language.code)}
            right={() => (
              <RadioButton
                value={language.code}
                status={i18n.language === language.code ? 'checked' : 'unchecked'}
                onPress={() => handleLanguageChange(language.code)}
                color={theme.colors.primary}
              />
            )}
          />
        ))}
      </List.Section>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default LanguageSettingsScreen; 