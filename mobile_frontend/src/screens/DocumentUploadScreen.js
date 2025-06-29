import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import apiService from '../services/apiService';

const DocumentUploadScreen = ({ route }) => {
  const navigation = useNavigation();
  const { userId, onDocumentUploadComplete } = route.params;
  
  const [documents, setDocuments] = useState({
    DRIVING_LICENSE_FRONT: null,
    DRIVING_LICENSE_BACK: null,
    IDENTITY_CARD_FRONT: null,
    IDENTITY_CARD_BACK: null,
    PASSPORT: null,
  });
  
  const [uploadProgress, setUploadProgress] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);

  useEffect(() => {
    checkPermissions();
    loadUserDocuments();
  }, []);

  const checkPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraPermission.status !== 'granted' || mediaLibraryPermission.status !== 'granted') {
      Alert.alert(
        'İzin Gerekli',
        'Belge yüklemek için kamera ve fotoğraf galerisi erişim izni gerekiyor.',
        [{ text: 'Tamam' }]
      );
    }
  };

  const loadUserDocuments = async () => {
    try {
      const userDocuments = await apiService.getUserDocuments(userId);
      const documentMap = {
        DRIVING_LICENSE_FRONT: null,
        DRIVING_LICENSE_BACK: null,
        IDENTITY_CARD_FRONT: null,
        IDENTITY_CARD_BACK: null,
        PASSPORT: null,
      };
      
      userDocuments.forEach(doc => {
        // Map documents based on type and face
        if (doc.type === 'DRIVING_LICENSE') {
          if (doc.face === 'FRONT') {
            documentMap['DRIVING_LICENSE_FRONT'] = doc;
          } else if (doc.face === 'BACK') {
            documentMap['DRIVING_LICENSE_BACK'] = doc;
          }
        } else if (doc.type === 'IDENTITY_CARD') {
          if (doc.face === 'FRONT') {
            documentMap['IDENTITY_CARD_FRONT'] = doc;
          } else if (doc.face === 'BACK') {
            documentMap['IDENTITY_CARD_BACK'] = doc;
          }
        } else if (doc.type === 'PASSPORT') {
          documentMap['PASSPORT'] = doc;
        }
      });
      
      setDocuments(documentMap);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const openImagePicker = (documentType) => {
    setSelectedDocumentType(documentType);
    setShowImagePicker(true);
  };

  const selectImageSource = (source) => {
    setShowImagePicker(false);
    
    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    };

    if (source === 'camera') {
      ImagePicker.launchCameraAsync(options).then(handleImageResult);
    } else {
      ImagePicker.launchImageLibraryAsync(options).then(handleImageResult);
    }
  };

  const handleImageResult = async (result) => {
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await uploadDocument(selectedDocumentType, asset);
    }
  };

  const uploadDocument = async (documentType, asset) => {
    setUploadProgress(prev => ({ ...prev, [documentType]: 0 }));
    
    try {
      const base64Image = `data:image/jpeg;base64,${asset.base64}`;
      const fileName = `${documentType}_${Date.now()}.jpg`;
      
      // Determine actual document type and face
      let actualDocumentType, face;
      if (documentType.includes('DRIVING_LICENSE')) {
        actualDocumentType = 'DRIVING_LICENSE';
        face = documentType.includes('FRONT') ? 'FRONT' : 'BACK';
      } else if (documentType.includes('IDENTITY_CARD')) {
        actualDocumentType = 'IDENTITY_CARD';
        face = documentType.includes('FRONT') ? 'FRONT' : 'BACK';
      } else {
        actualDocumentType = 'PASSPORT';
        face = null; // Passport doesn't need face
      }
      
      // Show progress animation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[documentType] || 0;
          if (currentProgress < 90) {
            return { ...prev, [documentType]: currentProgress + 10 };
          }
          return prev;
        });
      }, 200);

      const response = await apiService.uploadDocument(userId, actualDocumentType, base64Image, fileName, face);
      
      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [documentType]: 100 }));
      
      // Update document state
      setDocuments(prev => ({
        ...prev,
        [documentType]: response
      }));
      
      setTimeout(() => {
        setUploadProgress(prev => ({ ...prev, [documentType]: undefined }));
      }, 1000);
      
      Alert.alert(
        'Başarılı',
        'Belgeniz yüklendi ve işleme alındı. OCR analizi yapılıyor...',
        [{ text: 'Tamam' }]
      );
      
    } catch (error) {
      console.error('Document upload error:', error);
      setUploadProgress(prev => ({ ...prev, [documentType]: undefined }));
      
      Alert.alert(
        'Hata',
        'Belge yüklenirken bir hata oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
    }
  };

  const getDocumentStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return '#2ECC71';
      case 'PENDING':
        return '#F39C12';
      case 'REJECTED':
        return '#E74C3C';
      case 'NEEDS_REVIEW':
        return '#9B59B6';
      default:
        return '#95A5A6';
    }
  };

  const getDocumentStatusText = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'Onaylandı';
      case 'PENDING':
        return 'İnceleniyor';
      case 'REJECTED':
        return 'Reddedildi';
      case 'NEEDS_REVIEW':
        return 'Manuel İnceleme';
      default:
        return 'Yüklenmedi';
    }
  };

  const canContinue = () => {
    // Ehliyet ön ve arka yüz zorunlu
    const drivingLicenseComplete = documents.DRIVING_LICENSE_FRONT?.status === 'APPROVED' && 
                                  documents.DRIVING_LICENSE_BACK?.status === 'APPROVED';
    
    // Ehliyet varsa kimlik kartı optional, yoksa kimlik kartı veya pasaport zorunlu
    if (drivingLicenseComplete) {
      return true; // Ehliyet varsa yeterli
    } else {
      // Ehliyet yoksa kimlik kartı veya pasaport gerekli
      const identityComplete = documents.IDENTITY_CARD_FRONT?.status === 'APPROVED' && 
                              documents.IDENTITY_CARD_BACK?.status === 'APPROVED';
      const passportComplete = documents.PASSPORT?.status === 'APPROVED';
      
      return identityComplete || passportComplete;
    }
  };

  const handleContinue = () => {
    if (canContinue()) {
      // Call the onboarding complete callback instead of navigating directly
      if (onDocumentUploadComplete) {
        onDocumentUploadComplete();
      } else {
        // Fallback - try to navigate to Home if callback not provided
        navigation.navigate('Home');
      }
    } else {
      Alert.alert(
        'Belge Onayı Bekleniyor',
        'Devam edebilmek için ehliyet ve kimlik belgelerinizin onaylanması gerekiyor.',
        [{ text: 'Tamam' }]
      );
    }
  };

  const refreshDocumentStatus = async () => {
    setRefreshing(true);
    try {
      await loadUserDocuments();
      Alert.alert(
        'Güncellendi',
        'Belge durumları güncellendi.',
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      console.error('Error refreshing documents:', error);
      Alert.alert(
        'Hata',
        'Belge durumları güncellenirken bir hata oluştu.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setRefreshing(false);
    }
  };

  const DocumentCard = ({ type, title, description, required = false }) => {
    const document = documents[type];
    const progress = uploadProgress[type];
    const isUploading = progress !== undefined;
    
    return (
      <View style={styles.documentCard}>
        <View style={styles.documentHeader}>
          <View style={styles.documentInfo}>
            <Text style={[styles.documentTitle, required && styles.requiredTitle]}>
              {title} {required && <Text style={styles.asterisk}>*</Text>}
            </Text>
            <Text style={styles.documentDescription}>{description}</Text>
          </View>
          
          {document && (
            <View style={[styles.statusBadge, { backgroundColor: getDocumentStatusColor(document.status) }]}>
              <Text style={styles.statusText}>{getDocumentStatusText(document.status)}</Text>
            </View>
          )}
        </View>
        
        {isUploading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}
        
        {document?.imageBase64 && (
          <Image 
            source={{ uri: document.imageBase64 }} 
            style={styles.documentImage}
            resizeMode="cover"
          />
        )}
        
        <TouchableOpacity
          style={[styles.uploadButton, isUploading && styles.disabledButton]}
          onPress={() => openImagePicker(type)}
          disabled={isUploading}
        >
          <Ionicons 
            name={document ? "camera-outline" : "add-circle-outline"} 
            size={20} 
            color="#FFF" 
          />
          <Text style={styles.uploadButtonText}>
            {isUploading ? 'Yükleniyor...' : document ? 'Yeniden Yükle' : 'Belge Yükle'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Belge Yükleme</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Kimlik Doğrulama</Text>
          <Text style={styles.introText}>
            Araç kiralayabilmek için kimlik belgelerinizi yüklemeniz gerekiyor. 
            Belgeleriniz OCR teknolojisi ile otomatik olarak analiz edilecek.
          </Text>
        </View>

        <DocumentCard
          type="DRIVING_LICENSE_FRONT"
          title="Ehliyet Ön Yüz"
          description="Geçerli sürücü belgenizin ön yüzünü yükleyin"
          required={true}
        />

        <DocumentCard
          type="DRIVING_LICENSE_BACK"
          title="Ehliyet Arka Yüz"
          description="Geçerli sürücü belgenizin arka yüzünü yükleyin"
          required={true}
        />

        <DocumentCard
          type="IDENTITY_CARD_FRONT"
          title="Kimlik Kartı Ön Yüz"
          description="T.C. Kimlik Kartınızın ön yüzünü yükleyin"
          required={false}
        />

        <DocumentCard
          type="IDENTITY_CARD_BACK"
          title="Kimlik Kartı Arka Yüz"
          description="T.C. Kimlik Kartınızın arka yüzünü yükleyin"
          required={false}
        />

        <DocumentCard
          type="PASSPORT"
          title="Pasaport (Alternatif)"
          description="Kimlik kartı yerine pasaportunuzu da kullanabilirsiniz"
        />

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshDocumentStatus}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#3498DB" />
          ) : (
            <Ionicons name="refresh" size={20} color="#3498DB" />
          )}
          <Text style={styles.refreshButtonText}>
            {refreshing ? 'Güncelleniyor...' : 'Durumu Yenile'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#3498DB" />
          <Text style={styles.infoText}>
            Ehliyet belgesi yüklerseniz kimlik kartı yüklemeniz zorunlu değildir. 
            Belgeleriniz OCR teknolojisi ile otomatik olarak analiz edilecek.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, !canContinue() && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!canContinue()}
        >
          <Text style={styles.continueButtonText}>
            {canContinue() ? 'Devam Et' : 'Belge Onayı Bekleniyor'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Fotoğraf Seç</Text>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => selectImageSource('camera')}
            >
              <Ionicons name="camera" size={24} color="#333" />
              <Text style={styles.modalButtonText}>Kamera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => selectImageSource('gallery')}
            >
              <Ionicons name="images" size={24} color="#333" />
              <Text style={styles.modalButtonText}>Galeri</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowImagePicker(false)}
            >
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  documentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  requiredTitle: {
    color: '#E74C3C',
  },
  asterisk: {
    color: '#E74C3C',
    fontWeight: 'bold',
  },
  documentDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2ECC71',
  },
  progressText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  documentImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498DB',
    borderRadius: 8,
    paddingVertical: 12,
  },
  disabledButton: {
    backgroundColor: '#95A5A6',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 8,
    lineHeight: 18,
  },
  continueButton: {
    backgroundColor: '#2ECC71',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginVertical: 20,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  bottomSpacing: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  modalCancelButton: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#E74C3C',
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: '#3498DB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498DB',
    marginLeft: 8,
  },
});

export default DocumentUploadScreen; 