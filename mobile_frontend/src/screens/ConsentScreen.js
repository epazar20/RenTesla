import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import apiService from '../services/apiService';

const ConsentScreen = ({ route }) => {
  const navigation = useNavigation();
  const { userId } = route.params;
  
  const [consents, setConsents] = useState({
    kvkk: false,
    openConsent: false,
    location: false,
    notification: false,
    marketing: false,
  });
  
  const [loading, setLoading] = useState(false);

  const handleConsentChange = (type, value) => {
    setConsents(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const validateRequiredConsents = () => {
    if (!consents.kvkk || !consents.openConsent) {
      Alert.alert(
        'Zorunlu Onaylar',
        'KVKK ve Açık Rıza onayları zorunludur. Lütfen onaylayın.',
        [{ text: 'Tamam' }]
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateRequiredConsents()) {
      return;
    }

    setLoading(true);

    try {
      // Submit consents to backend
      await apiService.submitConsents(userId, consents);
      
      Alert.alert(
        'Başarılı',
        'Onaylarınız kaydedildi. Şimdi belge yükleme ekranına yönlendiriliyorsunuz.',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.navigate('DocumentUpload', { userId })
          }
        ]
      );
    } catch (error) {
      console.error('Consent submission error:', error);
      Alert.alert(
        'Hata',
        'Onaylarınız kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const ConsentItem = ({ title, description, type, required = false, checked, onToggle }) => (
    <View style={styles.consentItem}>
      <View style={styles.consentHeader}>
        <Text style={[styles.consentTitle, required && styles.requiredTitle]}>
          {title} {required && <Text style={styles.asterisk}>*</Text>}
        </Text>
        <TouchableOpacity
          style={[styles.checkbox, checked && styles.checkedBox]}
          onPress={() => onToggle(type, !checked)}
        >
          {checked && <Ionicons name="checkmark" size={16} color="#FFF" />}
        </TouchableOpacity>
      </View>
      <Text style={styles.consentDescription}>{description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Onaylar ve İzinler</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Kişisel Veriler ve İzinler</Text>
          <Text style={styles.introText}>
            Uygulamamızı kullanabilmek için aşağıdaki onayları vermeniz gerekmektedir. 
            Zorunlu işaretli onaylar olmadan hizmetlerimizi sunamayız.
          </Text>
        </View>

        <ConsentItem
          title="KVKK Onayı"
          description="Kişisel verilerinizin işlenmesi, saklanması ve paylaşılması konusundaki aydınlatma metnini okudum ve kabul ediyorum."
          type="kvkk"
          required={true}
          checked={consents.kvkk}
          onToggle={handleConsentChange}
        />

        <ConsentItem
          title="Açık Rıza Onayı"
          description="Kimlik doğrulama, araç kiralama ve ödeme işlemleri için kişisel verilerimin işlenmesine açık rızamı veriyorum."
          type="openConsent"
          required={true}
          checked={consents.openConsent}
          onToggle={handleConsentChange}
        />

        <ConsentItem
          title="Konum İzni"
          description="Size en yakın araçları gösterebilmemiz için konum bilginize erişim izni veriyorum."
          type="location"
          checked={consents.location}
          onToggle={handleConsentChange}
        />

        <ConsentItem
          title="Bildirim İzni"
          description="Rezervasyon durumu, mesajlar ve önemli güncellemeler hakkında bildirim almak istiyorum."
          type="notification"
          checked={consents.notification}
          onToggle={handleConsentChange}
        />

        <ConsentItem
          title="Pazarlama İzni"
          description="Kampanyalar, indirimler ve yeni hizmetler hakkında bilgi almak istiyorum."
          type="marketing"
          checked={consents.marketing}
          onToggle={handleConsentChange}
        />

        <View style={styles.legalLinks}>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>KVKK Aydınlatma Metni</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>Gizlilik Politikası</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>Kullanım Şartları</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Kaydediliyor...' : 'Onayları Kaydet ve Devam Et'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  introSection: {
    paddingVertical: 20,
    marginBottom: 10,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  introText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  consentItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  consentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  requiredTitle: {
    color: '#E74C3C',
  },
  asterisk: {
    color: '#E74C3C',
    fontWeight: 'bold',
  },
  consentDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  checkedBox: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  legalLinks: {
    marginVertical: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  linkButton: {
    paddingVertical: 10,
  },
  linkText: {
    fontSize: 14,
    color: '#3498DB',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: '#2ECC71',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginVertical: 20,
  },
  disabledButton: {
    backgroundColor: '#95A5A6',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default ConsentScreen; 