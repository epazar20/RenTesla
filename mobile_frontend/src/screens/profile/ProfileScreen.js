import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { List, useTheme, Divider } from 'react-native-paper';
import { useUserStore } from '../../store/userStore';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useUserStore();

  const navigateToScreen = useCallback((screenName) => {
    navigation.navigate(screenName);
  }, [navigation]);

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Item
          title={t('profile.personalInfo')}
          description={t('profile.updateProfile')}
          left={props => <List.Icon {...props} icon="account" color={theme.colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigateToScreen('ProfileDetails')}
        />
        
        <List.Item
          title={t('profile.documentManagement')}
          description={t('profile.documents')}
          left={props => <List.Icon {...props} icon="file-document" color={theme.colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigateToScreen('DocumentUploadModal')}
        />
      </List.Section>

      <Divider />

      <List.Section title={t('settings.title')}>
        <List.Item
          title={t('settings.notifications')}
          description={t('settings.notificationsDesc')}
          left={props => <List.Icon {...props} icon="bell-outline" color={theme.colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigateToScreen('NotificationSettings')}
        />

        <List.Item
          title={t('settings.privacy')}
          description={t('settings.privacyDesc')}
          left={props => <List.Icon {...props} icon="shield-outline" color={theme.colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigateToScreen('PrivacySettings')}
        />

        <List.Item
          title={t('language.selectLanguage')}
          description={t('language.' + (user?.language || 'turkish'))}
          left={props => <List.Icon {...props} icon="translate" color={theme.colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigateToScreen('LanguageSettings')}
        />
      </List.Section>

      <Divider />

      <List.Section title={t('profile.support')}>
        <List.Item
          title={t('profile.helpCenter')}
          description={t('profile.getHelp')}
          left={props => <List.Icon {...props} icon="help-circle" color={theme.colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigateToScreen('HelpCenter')}
        />

        <List.Item
          title={t('profile.contactUs')}
          description={t('profile.sendMessage')}
          left={props => <List.Icon {...props} icon="message" color={theme.colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigateToScreen('ContactUs')}
        />
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

export default ProfileScreen; 