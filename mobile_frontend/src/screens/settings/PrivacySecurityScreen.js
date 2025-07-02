import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Switch, useTheme, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../store/userStore';
import Toast from 'react-native-toast-message';

const PrivacySecurityScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, updateUser } = useUserStore();
  
  const [settings, setSettings] = useState({
    locationSharing: user?.privacy?.locationSharing ?? true,
    rentalHistorySharing: user?.privacy?.rentalHistorySharing ?? true,
    twoFactorAuth: user?.privacy?.twoFactorAuth ?? false
  });

  const handleToggle = async (key) => {
    try {
      const newSettings = {
        ...settings,
        [key]: !settings[key]
      };
      
      setSettings(newSettings);
      
      await updateUser({
        privacy: newSettings
      });

      Toast.show({
        type: 'success',
        text1: t('settings.privacy.updateSuccess')
      });
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      Toast.show({
        type: 'error',
        text1: t('settings.privacy.updateError')
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader>{t('settings.privacy.locationSharing')}</List.Subheader>
        
        <List.Item
          title={t('settings.privacy.shareLocation')}
          description={t('settings.privacy.shareLocationDesc')}
          left={props => <List.Icon {...props} icon="map-marker" color={theme.colors.primary} />}
          right={() => (
            <Switch
              value={settings.locationSharing}
              onValueChange={() => handleToggle('locationSharing')}
              color={theme.colors.primary}
            />
          )}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>{t('settings.privacy.dataSharing')}</List.Subheader>
        
        <List.Item
          title={t('settings.privacy.shareRentalHistory')}
          description={t('settings.privacy.shareRentalHistoryDesc')}
          left={props => <List.Icon {...props} icon="history" color={theme.colors.primary} />}
          right={() => (
            <Switch
              value={settings.rentalHistorySharing}
              onValueChange={() => handleToggle('rentalHistorySharing')}
              color={theme.colors.primary}
            />
          )}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>{t('settings.privacy.security')}</List.Subheader>
        
        <List.Item
          title={t('settings.privacy.twoFactorAuth')}
          description={t('settings.privacy.twoFactorAuthDesc')}
          left={props => <List.Icon {...props} icon="shield-lock" color={theme.colors.primary} />}
          right={() => (
            <Switch
              value={settings.twoFactorAuth}
              onValueChange={() => handleToggle('twoFactorAuth')}
              color={theme.colors.primary}
            />
          )}
        />
      </List.Section>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  }
});

export default PrivacySecurityScreen; 