import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, useTheme, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

const HelpCenterScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const helpCategories = [
    {
      title: 'Kiralama İşlemleri',
      icon: 'car',
      items: [
        { title: 'Nasıl Araç Kiralarım?', icon: 'help-circle' },
        { title: 'Ödeme Seçenekleri', icon: 'credit-card' },
        { title: 'İptal ve İade Politikası', icon: 'cash-refund' },
      ]
    },
    {
      title: 'Hesap Yönetimi',
      icon: 'account',
      items: [
        { title: 'Profil Bilgilerimi Nasıl Güncellerim?', icon: 'account-edit' },
        { title: 'Belge Yükleme Rehberi', icon: 'file-upload' },
        { title: 'Şifremi Unuttum', icon: 'lock-reset' },
      ]
    },
    {
      title: 'Teknik Destek',
      icon: 'tools',
      items: [
        { title: 'Uygulama Sorunları', icon: 'cellphone' },
        { title: 'Bildirim Ayarları', icon: 'bell' },
        { title: 'Konum Hizmetleri', icon: 'map-marker' },
      ]
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {helpCategories.map((category, index) => (
        <React.Fragment key={category.title}>
          <List.Section>
            <List.Subheader>{category.title}</List.Subheader>
            {category.items.map((item) => (
              <List.Item
                key={item.title}
                title={item.title}
                left={props => <List.Icon {...props} icon={item.icon} color={theme.colors.primary} />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {}}
              />
            ))}
          </List.Section>
          {index < helpCategories.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default HelpCenterScreen; 