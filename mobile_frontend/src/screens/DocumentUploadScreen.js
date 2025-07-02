import React, { useState, useEffect, useRef } from 'react';
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
  BackHandler,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { apiService } from '../services/apiService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DocumentUploadScreen = ({ route }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { userId = null } = route.params || {};
  
  let insets;
  try {
    insets = useSafeAreaInsets();
  } catch (error) {
    console.warn('SafeAreaInsets not available, using default values:', error);
    insets = { top: 0, bottom: 0, left: 0, right: 0 };
  }
  
  const [documents, setDocuments] = useState({
    DRIVING_LICENSE_FRONT: null,
    DRIVING_LICENSE_BACK: null,
  });
  
  // Separate state for imageBase64 data (not coming from backend)
  const [documentImages, setDocumentImages] = useState({
    DRIVING_LICENSE_FRONT: null,
    DRIVING_LICENSE_BACK: null,
  });
  
  const [uploadProgress, setUploadProgress] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [pollingStatus, setPollingStatus] = useState({}); // Track which documents are being polled
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [processingModal, setProcessingModal] = useState({
    visible: false,
    documentType: '',
    stage: 'uploading', // uploading, processing, completed
    progress: 0
  });
  
  // Image viewer modal state
  const [imageViewerModal, setImageViewerModal] = useState({
    visible: false,
    imageUri: null,
    documentType: ''
  });
  
  // Add state to track if we're in active document workflow
  const [isInDocumentWorkflow, setIsInDocumentWorkflow] = useState(false);
  const [navigationBlocked, setNavigationBlocked] = useState(false);
  
  // Refs for intervals
  const pollingIntervals = useRef({});
  const navigationStateRef = useRef(null);

  // 1. Status modal state
  const [statusModal, setStatusModal] = useState({
    visible: false,
    icon: null,
    title: '',
    description: '',
    onClose: null,
  });

  // Add focus effect for modal - simplified approach
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 DocumentUploadModal focused');
      
      // Screen is focused - refresh documents
      loadUserDocuments();
      
      // For modal, we don't need complex navigation blocking
      // The modal presentation handles navigation separation
      
    }, [])
  );

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: t('documents.upload'),
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('MainTabs', { screen: 'Home' });
            }
          }}
          style={styles.headerButton}
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('MainTabs', { screen: 'Home' });
            }
          }}
          style={styles.headerButton}
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: '#FFF',
        elevation: 2,
        shadowOpacity: 0.1,
      },
      headerTitleStyle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
      },
      gestureEnabled: true
    });
  }, [navigation, t]);

  useEffect(() => {
    // Hardware back button handling for modal
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // If we're in document workflow, show confirmation
      if (isInDocumentWorkflow || navigationBlocked) {
        Alert.alert(
          t('documents.uploadInProgress'),
          t('documents.uploadInProgressDesc'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { 
              text: t('common.forceExit'),
              style: 'destructive',
              onPress: () => {
                // Force cleanup and close modal
                setIsInDocumentWorkflow(false);
                setNavigationBlocked(false);
                Object.values(pollingIntervals.current).forEach(interval => {
                  if (interval) clearInterval(interval);
                });
                // Close modal
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('MainTabs', { screen: 'Home' });
                }
              }
            }
          ]
        );
        return true; // Prevent default back action
      }
      
      // Allow normal modal close
      return false;
    });

    return () => backHandler.remove();
  }, [isInDocumentWorkflow, navigationBlocked, navigation, t]);

  useEffect(() => {
    checkPermissions();
    loadUserDocuments();
    
    // Cleanup intervals on unmount
    return () => {
      Object.values(pollingIntervals.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  const checkPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraPermission.status !== 'granted' || mediaLibraryPermission.status !== 'granted') {
      Alert.alert(
        t('documents.permissionRequired'),
        t('documents.cameraPermission'),
        [{ text: t('common.ok') }]
      );
    }
  };

  const loadUserDocuments = async () => {
    try {
      const userDocuments = await apiService.getUserDocuments(userId);
      
      const documentMap = {
        DRIVING_LICENSE_FRONT: null,
        DRIVING_LICENSE_BACK: null,
      };

      const imageMap = {
        DRIVING_LICENSE_FRONT: null,
        DRIVING_LICENSE_BACK: null,
      };
      
      console.log(`📋 DocumentUploadScreen: Loading ${userDocuments.length} documents`);
      
      // Sort documents by creation date (newest first) and group by type+face
      const sortedDocuments = userDocuments.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      // Track which document types we've already found (to get only the latest)
      const foundTypes = new Set();
      
      sortedDocuments.forEach((doc, index) => {
        let documentKey;
        
        // Map documents based on type and face
        if (doc.type === 'DRIVING_LICENSE') {
          documentKey = doc.face === 'FRONT' ? 'DRIVING_LICENSE_FRONT' : 'DRIVING_LICENSE_BACK';
        }
        
        if (documentKey && !foundTypes.has(documentKey)) {
          foundTypes.add(documentKey);
          
          // Store backend data without imageBase64
          const { imageBase64, ...docWithoutImage } = doc;
          documentMap[documentKey] = docWithoutImage;
          
          // Store imageBase64 separately if exists
          if (imageBase64) {
            console.log(`📸 Loading latest image for ${documentKey}, length: ${imageBase64.length}, docId: ${doc.id}`);
            imageMap[documentKey] = imageBase64;
          } else {
            console.log(`❌ No image data for latest ${documentKey}, docId: ${doc.id}`);
          }
        }
      });
      
      setDocuments(documentMap);
      setDocumentImages(imageMap);
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
    try {
      console.log(`📤 Starting document upload for ${documentType}`);
      
      // Set workflow state to prevent navigation
      setIsInDocumentWorkflow(true);
      setNavigationBlocked(true);
      
      // Show compact processing indicator instead of full modal
      setProcessingModal({
        visible: true,
        documentType: documentType,
        stage: 'uploading',
        progress: 0
      });

      // Delete existing documents of the same type first
      console.log(`🗑️ Deleting old documents for ${documentType}`);
      try {
        // Get all documents for this type
        const userDocs = await apiService.getUserDocuments(userId);
        const docsToDelete = userDocs.filter(doc => 
          doc.type === 'DRIVING_LICENSE' && 
          doc.face === (documentType.includes('FRONT') ? 'FRONT' : 'BACK')
        );
        
        // Delete each document
        for (const doc of docsToDelete) {
          console.log(`🗑️ Deleting document: ${doc.id}`);
          await apiService.deleteDocument(doc.id, userId);
        }
        console.log(`✅ Old documents deleted for ${documentType}`);
      } catch (error) {
        console.error(`❌ Error deleting old documents for ${documentType}:`, error);
        // Continue with upload even if delete fails
      }

      // Prepare base64 image data
      const imageBase64 = `data:image/jpeg;base64,${asset.base64}`;
      const documentTypeValue = 'DRIVING_LICENSE';
      const faceValue = documentType.includes('FRONT') ? 'FRONT' : 'BACK';
      const fileName = `${documentTypeValue}_${faceValue}_${Date.now()}.jpg`;

      console.log(`📤 Uploading document - Type: ${documentTypeValue}, Face: ${faceValue}, File: ${fileName}`);

      // Upload document using base64 format
      const uploadResponse = await apiService.uploadDocument(
        userId,
        documentTypeValue,
        imageBase64,
        fileName,
        faceValue
      );
      
      console.log('✅ Document uploaded successfully:', uploadResponse);

      // Update processing modal to show processing stage
      setProcessingModal(prev => ({
        ...prev,
        stage: 'processing',
        progress: 100
      }));

      // Start polling for document status
      startPollingDocumentStatus(documentType, uploadResponse.documentId);
        
      // Update documents state with new document
        setDocuments(prev => ({
          ...prev,
        [documentType]: uploadResponse
        }));
        
      // Update document images state
      if (asset.base64) {
        setDocumentImages(prev => ({
          ...prev,
          [documentType]: `data:image/jpeg;base64,${asset.base64}`
        }));
      }

      console.log(`🎯 Document upload completed for ${documentType}, staying in screen`);
      
    } catch (error) {
      console.error('Error uploading document:', error);
      
      // Reset workflow state on error
      setIsInDocumentWorkflow(false);
      setNavigationBlocked(false);
      
      Alert.alert(
        t('documents.uploadError'),
        error?.message || t('documents.uploadErrorDesc'),
        [{ text: t('common.ok') }]
      );
      setProcessingModal({
        visible: false,
        documentType: '',
        stage: 'uploading',
        progress: 0
      });
    }
  };

  // Start polling for document status
  const startPollingDocumentStatus = (documentType, documentId) => {
    console.log(`🔄 Starting status polling for ${documentType} (ID: ${documentId})`);
    
    // Clear existing interval if any
    if (pollingIntervals.current[documentType]) {
      clearInterval(pollingIntervals.current[documentType]);
    }
    
    // Set polling status
    setPollingStatus(prev => ({ ...prev, [documentType]: true }));
    
    // Start new interval - check every 3 seconds
    pollingIntervals.current[documentType] = setInterval(async () => {
      console.log(`⏰ Polling status check for ${documentType}`);
      
      try {
        const userDocuments = await apiService.getUserDocuments(userId);
        const updatedDocument = userDocuments.find(doc => doc.id === documentId);
        
        if (updatedDocument) {
          console.log(`📊 Status update for ${documentType}: ${updatedDocument.status}`);
          
          // Preserve imageBase64 data and update document state
          const { imageBase64, ...docWithoutImage } = updatedDocument;
          
          setDocuments(prev => ({
            ...prev,
            [documentType]: docWithoutImage
          }));
          
          // Update imageBase64 separately if available
          if (imageBase64) {
            console.log(`📸 Updating image for ${documentType}, length: ${imageBase64.length}`);
            setDocumentImages(prev => ({
              ...prev,
              [documentType]: imageBase64
          }));
          }
          
          // Stop polling if document is no longer pending
          if (updatedDocument.status !== 'PENDING') {
            console.log(`✅ Stopping polling for ${documentType} - Final status: ${updatedDocument.status}`);
            clearInterval(pollingIntervals.current[documentType]);
            pollingIntervals.current[documentType] = null;
            setPollingStatus(prev => ({ ...prev, [documentType]: false }));
            
            // Close processing modal
            setProcessingModal({
              visible: false,
              documentType: '',
              stage: 'uploading',
              progress: 0
            });
            
            // Reset workflow state after processing is complete
            setIsInDocumentWorkflow(false);
            setNavigationBlocked(false);
            
            console.log(`🔓 Navigation unblocked for ${documentType}`);
            
            // Show subtle notification instead of blocking alert
            showDocumentStatusNotification(documentType, updatedDocument.status, updatedDocument.rejectionReason);
          }
        }
      } catch (error) {
        console.error(`❌ Error polling document status for ${documentType}:`, error);
        // Don't stop polling on error, might be temporary network issue
      }
    }, 3000); // Check every 3 seconds
  };

  // Belge tipini kullanıcıya uygun şekilde göstermek için yardımcı fonksiyon ekliyorum
  const getDocumentDisplayName = (documentType) => {
    switch (documentType) {
      case 'DRIVING_LICENSE_FRONT':
        return t('documents.drivingLicenseFront');
      case 'DRIVING_LICENSE_BACK':
        return t('documents.drivingLicenseBack');
      // Gerekirse diğer belge türleri de eklenebilir
      default:
        return documentType.replace(/_/g, ' ').toLowerCase();
    }
  };

  // 3. Modern modal ile uyarı gösterimi
  const showDocumentStatusNotification = (documentType, status, rejectionReason) => {
    const documentName = getDocumentDisplayName(documentType);
    if (status === 'APPROVED') {
      setStatusModal({
        visible: true,
        icon: 'checkmark-circle',
        title: t('documents.documentApproved'),
        description: t('documents.documentApprovedDesc', { type: documentName }),
        onClose: () => setStatusModal(s => ({ ...s, visible: false })),
      });
    } else if (status === 'REJECTED') {
      const reason = rejectionReason || t('documents.genericRejectionReason');
      setStatusModal({
        visible: true,
        icon: 'close-circle',
        title: t('documents.documentRejected'),
        description: t('documents.documentRejectedDesc', { type: documentName, reason }),
        onClose: () => setStatusModal(s => ({ ...s, visible: false })),
      });
    } else if (status === 'NEEDS_REVIEW') {
      setStatusModal({
        visible: true,
        icon: 'eye',
        title: t('documents.documentNeedsReview'),
        description: t('documents.documentNeedsReviewGeneral', 'Belgeniz inceleme için gönderildi.'),
        onClose: () => setStatusModal(s => ({ ...s, visible: false })),
      });
    }
  };

  // Stop polling for specific document
  const stopPollingDocumentStatus = (documentType) => {
    if (pollingIntervals.current[documentType]) {
      console.log(`⏹️ Stopping polling for ${documentType}`);
      clearInterval(pollingIntervals.current[documentType]);
      pollingIntervals.current[documentType] = null;
      setPollingStatus(prev => ({ ...prev, [documentType]: false }));
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
        return t('documents.statusApproved');
      case 'PENDING':
        return t('documents.statusPending');
      case 'REJECTED':
        return t('documents.statusRejected');
      case 'NEEDS_REVIEW':
        return t('documents.statusNeedsReview');
      default:
        return t('documents.statusNotUploaded');
    }
  };

  const canContinue = () => {
    // Ehliyet ön ve arka yüz zorunlu
    const drivingLicenseComplete = documents.DRIVING_LICENSE_FRONT?.status === 'APPROVED' && 
                                  documents.DRIVING_LICENSE_BACK?.status === 'APPROVED';
    
    return drivingLicenseComplete;
  };

  const handleContinue = () => {
    if (canContinue()) {
      Alert.alert(
        t('documents.documentsApproved'),
        t('documents.documentsApprovedDesc'),
        [
          { 
            text: t('common.ok'),
            onPress: () => {
              // Documents approved - close modal and return to home
              console.log('✅ Documents approved, closing modal');
              if (navigation.canGoBack()) {
                navigation.goBack();
      } else {
                navigation.navigate('MainTabs', { screen: 'Home' });
      }
            }
          }
        ]
      );
    } else {
      Alert.alert(
        t('documents.approvalRequired'),
        t('documents.approvalRequiredDesc'),
        [{ text: t('common.ok') }]
      );
    }
  };

  const refreshDocumentStatus = async () => {
    setRefreshing(true);
    try {
      await loadUserDocuments();
      // Don't show alert, just refresh silently
      console.log('📋 Documents refreshed successfully');
    } catch (error) {
      console.error('Error refreshing documents:', error);
      Alert.alert(
        t('common.error'),
        t('documents.statusUpdateError'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setRefreshing(false);
    }
  };

  const deleteDocument = async (documentType) => {
    const document = documents[documentType];
    if (!document) return;

    Alert.alert(
      t('documents.deleteDocument'),
      t('documents.deleteConfirmation'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('documents.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteDocument(document.id, userId);
              
              // Remove document from state
              setDocuments(prev => ({
                ...prev,
                [documentType]: null
              }));
              
              // Also remove imageBase64
              setDocumentImages(prev => ({
                ...prev,
                [documentType]: null
              }));
              
              console.log(`🗑️ Document ${documentType} deleted successfully`);
            } catch (error) {
              console.error('Error deleting document:', error);
              Alert.alert(
                t('documents.deleteError'),
                t('documents.deleteErrorDesc'),
                [{ text: t('common.ok') }]
              );
            }
          }
        }
      ]
    );
  };

  const DocumentCard = ({ type, title, description, required = false }) => {
    const document = documents[type];
    const imageBase64 = documentImages[type]; // Get image from separate state
    const progress = uploadProgress[type];
    const isUploading = progress !== undefined;
    const isPolling = pollingStatus[type] || false;
    
    // Debug logging for image data
    console.log(`🖼️ DocumentCard ${type}: imageBase64=${imageBase64 ? 'EXISTS' : 'NULL'}, length=${imageBase64?.length || 0}`);
    
    // Ensure proper base64 format
    let imageUri = null;
    if (imageBase64) {
      if (imageBase64.startsWith('data:image/')) {
        imageUri = imageBase64;
      } else {
        imageUri = `data:image/jpeg;base64,${imageBase64}`;
      }
      console.log(`📸 Image URI for ${type}: ${imageUri.substring(0, 50)}...`);
    }
    
    return (
      <View style={styles.documentCard}>
        <View style={styles.documentHeader}>
          <View style={styles.documentInfo}>
            <Text style={[styles.documentTitle, required && styles.requiredTitle]}>
              {title} {required && <Text style={styles.asterisk}>*</Text>}
            </Text>
            <Text style={styles.documentDescription}>{description}</Text>
            
            {/* Show compact processing status */}
            {isPolling && document?.status === 'PENDING' && (
              <View style={styles.compactProcessingContainer}>
                <ActivityIndicator size="small" color="#F39C12" />
                <Text style={styles.compactProcessingText}>
                  {t('documents.analyzing')}...
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.statusContainer}>
            {document && (
              <View style={[styles.statusBadge, { backgroundColor: getDocumentStatusColor(document.status) }]}>
                <Text style={styles.statusText}>{getDocumentStatusText(document.status)}</Text>
              </View>
            )}
          </View>
        </View>
        
        {isUploading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}
        
        {/* Image Display with Error Handling */}
        {imageUri && (
          <TouchableOpacity 
            onPress={() => {
              console.log(`📸 Opening image viewer for ${type}`);
              setImageViewerModal({
                visible: true,
                imageUri: imageUri,
                documentType: type
              });
            }}
          >
          <Image 
              source={{ uri: imageUri }} 
            style={styles.documentImage}
            resizeMode="cover"
              onError={(error) => {
                console.error(`❌ Image load error for ${type}:`, error.nativeEvent.error);
              }}
              onLoad={() => {
                console.log(`✅ Image loaded successfully for ${type}`);
              }}
            />
          </TouchableOpacity>
        )}
        
        {/* Show placeholder if no image */}
        {!imageUri && document && (
          <View style={[styles.documentImage, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={40} color="#95A5A6" />
            <Text style={styles.placeholderText}>Görsel yükleniyor...</Text>
          </View>
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
            {isUploading ? t('documents.uploading') : document ? t('documents.reUpload') : t('documents.uploadDocument')}
          </Text>
        </TouchableOpacity>

        {/* Delete Button for uploaded documents */}
        {document && !isUploading && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteDocument(type)}
          >
            <Ionicons name="trash-outline" size={20} color="#E74C3C" />
            <Text style={styles.deleteButtonText}>{t('documents.deleteDocument')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: (insets.bottom || 0) + 70 }]}>
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
      >
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>{t('documents.identityVerification')}</Text>
          <Text style={styles.introText}>
            {t('documents.identityDescription')}
          </Text>
        </View>

        <DocumentCard
          type="DRIVING_LICENSE_FRONT"
          title={t('documents.drivingLicenseFront')}
          description={t('documents.drivingLicenseFrontDesc')}
          required={true}
        />

        <DocumentCard
          type="DRIVING_LICENSE_BACK"
          title={t('documents.drivingLicenseBack')}
          description={t('documents.drivingLicenseBackDesc')}
          required={true}
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
            {refreshing ? t('documents.refreshing') : t('documents.refreshStatus')}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#3498DB" />
          <Text style={styles.infoText}>
            {t('documents.infoText')}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, !canContinue() && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!canContinue()}
        >
          <Text style={styles.continueButtonText}>
            {canContinue() ? t('documents.continue') : t('documents.waitingApproval')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImagePicker(false)}
        statusBarTranslucent={false}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('documents.selectPhoto')}</Text>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => selectImageSource('camera')}
            >
              <Ionicons name="camera" size={24} color="#333" />
              <Text style={styles.modalButtonText}>{t('documents.camera')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => selectImageSource('gallery')}
            >
              <Ionicons name="images" size={24} color="#333" />
              <Text style={styles.modalButtonText}>{t('documents.gallery')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowImagePicker(false)}
            >
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Compact Processing Modal - Non-blocking */}
      {processingModal.visible && (
        <View style={styles.compactModalContainer}>
          <View style={styles.compactModalContent}>
            <View style={styles.compactModalHeader}>
              <View style={styles.compactProcessingIcon}>
                {processingModal.stage === 'uploading' ? (
                  <Ionicons name="cloud-upload-outline" size={24} color="#3498DB" />
                ) : (
                  <ActivityIndicator size="small" color="#F39C12" />
                )}
              </View>
              
              <View style={styles.compactModalText}>
                <Text style={styles.compactModalTitle}>
                  {processingModal.stage === 'uploading' 
                    ? t('documents.uploading')
                    : t('documents.analyzing')
                  }
                </Text>
                <Text style={styles.compactModalSubtitle}>
                  {processingModal.documentType.replace(/_/g, ' ')}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.compactModalClose}
                onPress={() => {
                  setProcessingModal({ 
                    visible: false, 
                    documentType: '', 
                    stage: 'uploading', 
                    progress: 0 
                  });
                }}
              >
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.compactProgressBar}>
              <View 
                style={[
                  styles.compactProgressFill, 
                  { width: `${processingModal.progress}%` }
                ]} 
              />
            </View>
          </View>
        </View>
      )}

      {/* Image Viewer Modal */}
      <Modal 
        visible={imageViewerModal.visible} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setImageViewerModal({ visible: false, imageUri: null, documentType: '' })}
        statusBarTranslucent={false}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity 
            style={styles.imageViewerCloseButton}
            onPress={() => setImageViewerModal({ visible: false, imageUri: null, documentType: '' })}
          >
            <Ionicons name="close" size={30} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.imageViewerContent}>
            <Text style={styles.imageViewerTitle}>
              {imageViewerModal.documentType?.replace(/_/g, ' ')}
            </Text>
            
            {imageViewerModal.imageUri && (
              <Image 
                source={{ uri: imageViewerModal.imageUri }} 
                style={styles.imageViewerImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* 4. Modern status modal JSX'i ana return içine ekle */}
      <Modal
        visible={statusModal.visible}
        transparent
        animationType="fade"
        onRequestClose={statusModal.onClose}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 32,
            alignItems: 'center',
            width: '80%',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 10,
          }}>
            <Ionicons name={statusModal.icon} size={48} color="#3498DB" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
              {statusModal.title}
            </Text>
            <Text style={{ fontSize: 16, color: '#444', marginBottom: 24, textAlign: 'center' }}>
              {statusModal.description}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#3498DB',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 32,
              }}
              onPress={statusModal.onClose}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>TAMAM</Text>
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
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  headerCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingVertical: 20,
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
  compactProcessingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
  },
  compactProcessingText: {
    fontSize: 12,
    color: '#856404',
    marginLeft: 8,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E74C3C',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E74C3C',
    marginLeft: 8,
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
  compactModalContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  compactModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  compactModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactProcessingIcon: {
    marginRight: 12,
  },
  compactModalText: {
    flex: 1,
  },
  compactModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  compactModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  compactModalClose: {
    padding: 4,
  },
  compactProgressBar: {
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  compactProgressFill: {
    height: '100%',
    backgroundColor: '#3498DB',
    borderRadius: 2,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  placeholderText: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 8,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    zIndex: 1,
  },
  imageViewerContent: {
    width: '95%',
    height: '85%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  imageViewerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  imageViewerImage: {
    flex: 1,
    width: '100%',
    borderRadius: 10,
  },
});

export default DocumentUploadScreen; 