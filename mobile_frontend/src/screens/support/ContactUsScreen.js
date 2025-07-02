import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, useTheme, List } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';

const ContactUsScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const contactInfo = [
    { title: 'Email', value: 'support@rentesla.com', icon: 'email' },
    { title: 'Telefon', value: '+90 850 123 45 67', icon: 'phone' },
    { title: 'Whatsapp', value: '+90 850 123 45 67', icon: 'whatsapp' },
  ];

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) {
      Toast.show({
        type: 'error',
        text1: t('errors.validation'),
        text2: t('errors.allFieldsRequired'),
      });
      return;
    }

    // TODO: Implement message sending logic
    Toast.show({
      type: 'success',
      text1: t('contact.messageSent'),
      text2: t('contact.willReply'),
    });

    setSubject('');
    setMessage('');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contactInfoContainer}>
        {contactInfo.map((info) => (
          <List.Item
            key={info.title}
            title={info.title}
            description={info.value}
            left={props => <List.Icon {...props} icon={info.icon} color={theme.colors.primary} />}
          />
        ))}
      </View>

      <View style={styles.formContainer}>
        <TextInput
          label={t('contact.subject')}
          value={subject}
          onChangeText={setSubject}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label={t('contact.message')}
          value={message}
          onChangeText={setMessage}
          mode="outlined"
          multiline
          numberOfLines={6}
          style={styles.messageInput}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
        >
          {t('contact.send')}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contactInfoContainer: {
    marginVertical: 16,
  },
  formContainer: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  messageInput: {
    marginBottom: 24,
  },
  button: {
    padding: 4,
  },
});

export default ContactUsScreen; 