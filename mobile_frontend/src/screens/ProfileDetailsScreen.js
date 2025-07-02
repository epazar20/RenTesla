import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice';
import { apiService } from '../services/apiService';
import { useTheme, Avatar, Button } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { useUserStore } from '../store/userStore';

const ProfileDetailsScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const reduxUser = useSelector(selectUser);
  const userId = route?.params?.userId || reduxUser?.id || reduxUser?.userId;
  const theme = useTheme();
  const { user, updateUser } = useUserStore();

  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    identityNumber: user?.identityNumber || ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await apiService.getUserProfile(userId);
      const allDocs = await apiService.getUserDocuments(userId);
      
      console.log(`📋 ProfileDetailsScreen: Fetched ${allDocs.length} documents for user ${userId}`);
      
      // Group documents by type and face, keeping only the latest one
      const latestDocs = allDocs.reduce((acc, doc) => {
        const key = `${doc.type}_${doc.face}`;
        if (!acc[key] || new Date(doc.createdAt) > new Date(acc[key].createdAt)) {
          acc[key] = doc;
        }
        return acc;
      }, {});
      
      // Convert back to array and ensure proper base64 format
      const docs = Object.values(latestDocs).map(doc => {
        if (doc.imageBase64) {
          // Ensure proper base64 format
          doc.imageBase64 = doc.imageBase64.startsWith('data:image/') 
            ? doc.imageBase64 
            : `data:image/jpeg;base64,${doc.imageBase64}`;
        }
        return doc;
      });
      
      docs.forEach((doc, index) => {
        const hasImage = doc.imageBase64 && doc.imageBase64.length > 0;
        console.log(`   [${index}] Document ${doc.id}: Type=${doc.type}, Face=${doc.face}, Status=${doc.status}, HasImage=${hasImage}`);
      });
      
      setProfile(user);
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        identityNumber: user.identityNumber || '',
      });
      setDocuments(docs);
    } catch (e) {
      console.error('ProfileDetailsScreen fetchData error:', e);
      setError(e?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate form data
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
        Toast.show({
          type: 'error',
          text1: t('errors.validation'),
          text2: t('errors.allFieldsRequired')
        });
        return;
      }

      await updateUser(formData);

      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('profile.updateSuccessDesc', 'Bilgileriniz başarıyla güncellendi.')
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      Toast.show({
        type: 'error',
        text1: t('profile.updateError')
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#e60012" /></View>;
  }
  if (error) {
    return <View style={styles.center}><Text>{typeof error === 'string' ? error : (error?.message || t('common.error'))}</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.personalInfo')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={48} color="#fff" />
        </View>
      </View>
      <View style={styles.infoCard}>
        {/* Ad */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('auth.firstName')}</Text>
          {editMode ? (
            <TextInput
              value={formData.firstName}
              onChangeText={(value) => handleChange('firstName', value)}
              style={styles.infoInput}
              placeholder={t('auth.firstName')}
              placeholderTextColor="#999"
            />
          ) : (
            <Text style={styles.infoValue}>{formData.firstName}</Text>
          )}
        </View>
        {/* Soyad */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('auth.lastName')}</Text>
          {editMode ? (
            <TextInput
              value={formData.lastName}
              onChangeText={(value) => handleChange('lastName', value)}
              style={styles.infoInput}
              placeholder={t('auth.lastName')}
              placeholderTextColor="#999"
            />
          ) : (
            <Text style={styles.infoValue}>{formData.lastName}</Text>
          )}
        </View>
        {/* E-posta (değiştirilemez) */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('auth.email')}</Text>
          <Text style={[styles.infoValue, { color: '#e60012', fontWeight: 'bold' }]}>{formData.email}</Text>
        </View>
        {/* Kimlik No */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('auth.identityNumber')}</Text>
          {editMode ? (
            <TextInput
              value={formData.identityNumber}
              onChangeText={(value) => handleChange('identityNumber', value)}
              style={styles.infoInput}
              placeholder={t('auth.identityNumber')}
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
          ) : (
            <Text style={styles.infoValue}>{formData.identityNumber}</Text>
          )}
        </View>
        {/* Telefon */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('auth.phone')}</Text>
          {editMode ? (
            <TextInput
              value={formData.phone}
              onChangeText={(value) => handleChange('phone', value)}
              style={styles.infoInput}
              placeholder={t('auth.phone')}
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.infoValue}>{formData.phone}</Text>
          )}
        </View>
        {/* Düzenle/Kaydet butonu sağ altta */}
        <View style={styles.actionRow}>
          {editMode ? (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={async () => {
                await handleSubmit();
                setEditMode(false);
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditMode(true)}
            >
              <Ionicons name="create-outline" size={20} color="#e60012" />
              <Text style={styles.editButtonText}>{t('common.edit')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.sectionTitle}>{t('documents.documents')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.docsRow}>
        {documents.length === 0 ? (
          <Text style={styles.noDocs}>{t('documents.statusNotUploaded')}</Text>
        ) : (
          documents.map(doc => (
            <TouchableOpacity key={doc.id} style={styles.docCard} onPress={() => {
              if (doc.imageBase64) {
                setSelectedImage(doc.imageBase64);
                setImageViewerVisible(true);
              } else {
                Alert.alert(
                  t('common.info'), 
                  t('documents.noImageAvailable'),
                  [{ text: t('common.ok') }]
                );
              }
            }}>
              {doc.imageBase64 && doc.imageBase64.length > 0 ? (
                <Image 
                  source={{ uri: doc.imageBase64 }} 
                  style={styles.docImage} 
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.docImagePlaceholder}>
                  <Ionicons name="document-text" size={48} color="#e60012" />
                  <Text style={styles.noImageText}>{t('documents.noImage')}</Text>
                </View>
              )}
              <Text style={styles.docType} numberOfLines={2}>
                {doc.type} {doc.face ? `(${doc.face})` : ''}
              </Text>
              <Text style={[styles.docStatus, { color: getStatusColor(doc.status) }]}> {doc.status} </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      <Modal visible={imageViewerVisible} transparent animationType="fade" onRequestClose={() => setImageViewerVisible(false)}>
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setImageViewerVisible(false)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image 
              source={{ 
                uri: selectedImage.startsWith('data:image/') ? selectedImage : `data:image/jpeg;base64,${selectedImage}`
              }} 
              style={styles.imageViewer}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'APPROVED': return '#2ECC71';
    case 'PENDING': return '#F39C12';
    case 'REJECTED': return '#E74C3C';
    case 'NEEDS_REVIEW': return '#9B59B6';
    default: return '#95A5A6';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  avatarSection: { alignItems: 'center', marginTop: 24, marginBottom: 12 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e60012', justifyContent: 'center', alignItems: 'center' },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 24,
    marginTop: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  infoLabel: { fontSize: 15, color: '#888', flex: 1, fontWeight: '500' },
  infoValue: { fontSize: 16, color: '#222', flex: 1.5, fontWeight: 'bold', textAlign: 'right' },
  infoInput: { backgroundColor: '#f7f7f7', borderRadius: 8, padding: 8, fontSize: 16, flex: 1.5, textAlign: 'right', borderWidth: 1, borderColor: '#eee' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  editButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e60012', paddingVertical: 8, paddingHorizontal: 18 },
  editButtonText: { color: '#e60012', fontWeight: 'bold', fontSize: 16, marginLeft: 6 },
  saveButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e60012', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 18 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 6 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginLeft: 20, marginTop: 10, marginBottom: 8 },
  docsRow: { paddingLeft: 20, paddingBottom: 20 },
  docCard: { width: 120, backgroundColor: '#fff', borderRadius: 10, marginRight: 12, alignItems: 'center', padding: 10, elevation: 1 },
  docImage: { width: 80, height: 60, borderRadius: 6, marginBottom: 6 },
  docType: { fontSize: 13, color: '#333', fontWeight: '500' },
  docStatus: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  noDocs: { color: '#aaa', fontSize: 14, marginTop: 20 },
  docImagePlaceholder: {
    width: 80,
    height: 60,
    borderRadius: 6,
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  noImageText: { color: '#aaa', fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 2,
    padding: 10,
  },
  imageViewer: {
    width: '100%',
    height: '80%',
    borderRadius: 10,
  },
});

export default ProfileDetailsScreen; 