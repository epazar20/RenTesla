import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Switch, useTheme, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../store/userStore';
import Toast from 'react-native-toast-message';

const NotificationSettingsScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, updateUser } = useUserStore();
  
  const [settings, setSettings] = useState({
    rentalUpdates: user?.notifications?.rentalUpdates ?? true,
    promotions: user?.notifications?.promotions ?? false,
    systemUpdates: user?.notifications?.systemUpdates ?? true
  });

  const handleToggle = async (key) => {
    try {
      const newSettings = {
        ...settings,
        [key]: !settings[key]
      };
      
      setSettings(newSettings);
      
      await updateUser({
        notifications: newSettings
      });

      Toast.show({
        type: 'success',
        text1: t('settings.notifications.updateSuccess')
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Toast.show({
        type: 'error',
        text1: t('settings.notifications.updateError')
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader>{t('settings.notifications.preferences')}</List.Subheader>
        
        <List.Item
          title={t('settings.notifications.rentalUpdates')}
          description={t('settings.notifications.rentalUpdatesDesc')}
          left={props => <List.Icon {...props} icon="car-clock" color={theme.colors.primary} />}
          right={() => (
            <Switch
              value={settings.rentalUpdates}
              onValueChange={() => handleToggle('rentalUpdates')}
              color={theme.colors.primary}
            />
          )}
        />
        
        <Divider />
        
        <List.Item
          title={t('settings.notifications.promotions')}
          description={t('settings.notifications.promotionsDesc')}
          left={props => <List.Icon {...props} icon="tag-multiple" color={theme.colors.primary} />}
          right={() => (
            <Switch
              value={settings.promotions}
              onValueChange={() => handleToggle('promotions')}
              color={theme.colors.primary}
            />
          )}
        />
        
        <Divider />
        
        <List.Item
          title={t('settings.notifications.systemUpdates')}
          description={t('settings.notifications.systemUpdatesDesc')}
          left={props => <List.Icon {...props} icon="cellphone-arrow-down" color={theme.colors.primary} />}
          right={() => (
            <Switch
              value={settings.systemUpdates}
              onValueChange={() => handleToggle('systemUpdates')}
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

export default NotificationSettingsScreen; 