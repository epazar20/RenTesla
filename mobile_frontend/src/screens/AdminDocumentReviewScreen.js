import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { selectUserId, selectUserRole } from '../store/slices/authSlice';
import { apiService } from '../services/apiService';

const AdminDocumentReviewScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const userRole = useSelector(selectUserRole);
  const userId = useSelector(selectUserId);

  const [stats, setStats] = useState(null);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Check admin permission
    if (userRole !== 'ADMIN') {
      Alert.alert(
        t('common.error'),
        'Bu sayfaya erişim yetkiniz yok',
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
      return;
    }

    loadData();
  }, [userRole]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load statistics and pending documents in parallel
      const [statsData, documentsData] = await Promise.all([
        apiService.getDocumentStats(),
        apiService.getDocumentsNeedingReview()
      ]);

      setStats(statsData);
      setPendingDocuments(documentsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert(t('common.error'), 'Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDocumentPress = async (document) => {
    try {
      // Get detailed verification info
      const details = await apiService.getDocumentVerificationDetails(document.id);
      setSelectedDocument({ ...document, details });
      setModalVisible(true);
    } catch (error) {
      console.error('Error loading document details:', error);
      Alert.alert(t('common.error'), 'Belge detayları yüklenirken hata oluştu');
    }
  };

  const handleApprove = async (documentId) => {
    try {
      setProcessing(true);
      await apiService.adminApproveDocument(documentId, userId, 'Admin onayı');
      
      Alert.alert(t('common.success'), t('profile.documentApproved'));
      setModalVisible(false);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error approving document:', error);
      Alert.alert(t('common.error'), 'Belge onaylanırken hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (documentId) => {
    if (!rejectionReason.trim()) {
      Alert.alert(t('common.error'), 'Lütfen ret nedenini girin');
      return;
    }

    try {
      setProcessing(true);
      await apiService.adminRejectDocument(documentId, userId, rejectionReason);
      
      Alert.alert(t('common.success'), t('profile.documentRejected'));
      setModalVisible(false);
      setRejectionReason('');
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting document:', error);
      Alert.alert(t('common.error'), 'Belge reddedilirken hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  const renderStatsCard = (title, value, icon, color) => (
    <View style={[styles.statsCard, { borderColor: color }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </View>
  );

  const renderDocumentItem = (document) => (
    <TouchableOpacity
      key={document.id}
      style={styles.documentItem}
      onPress={() => handleDocumentPress(document)}
    >
      <View style={styles.documentHeader}>
        <Text style={styles.documentType}>{document.type}</Text>
        <Text style={styles.ocrConfidence}>
          OCR: {document.ocrConfidence ? `${(document.ocrConfidence * 100).toFixed(1)}%` : 'N/A'}
        </Text>
      </View>
      
      <Text style={styles.documentUser}>
        Kullanıcı ID: {document.userId}
      </Text>
      
      <Text style={styles.documentDate}>
        Yükleme Tarihi: {new Date(document.createdAt).toLocaleDateString('tr-TR')}
      </Text>
      
      <View style={styles.documentActions}>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E31E2E" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Statistics Section */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>{t('profile.documentStatistics')}</Text>
            <View style={styles.statsGrid}>
              {renderStatsCard('Toplam', stats.totalDocuments, 'documents', '#3498DB')}
              {renderStatsCard('Bekleyen', stats.needsReviewDocuments, 'time', '#F39C12')}
              {renderStatsCard('Onaylanan', stats.approvedDocuments, 'checkmark-circle', '#27AE60')}
              {renderStatsCard('Reddedilen', stats.rejectedDocuments, 'close-circle', '#E74C3C')}
            </View>
          </View>
        )}

        {/* Pending Documents Section */}
        <View style={styles.documentsSection}>
          <Text style={styles.sectionTitle}>{t('profile.pendingDocuments')}</Text>
          
          {pendingDocuments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>{t('profile.noDocumentsToReview')}</Text>
            </View>
          ) : (
            pendingDocuments.map(renderDocumentItem)
          )}
        </View>
      </ScrollView>

      {/* Document Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.verificationDetails')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedDocument && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.detailsText}>
                  {selectedDocument.details?.verificationDetails || 'Detay bilgi bulunamadı'}
                </Text>

                <TextInput
                  style={styles.reasonInput}
                  placeholder={t('profile.rejectionReason')}
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(selectedDocument.id)}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={20} color="white" />
                        <Text style={styles.actionButtonText}>{t('profile.approveDocument')}</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(selectedDocument.id)}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Ionicons name="close" size={20} color="white" />
                        <Text style={styles.actionButtonText}>{t('profile.rejectDocument')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  statsSection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    width: '48%',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 5,
    color: '#333',
  },
  statsTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  documentsSection: {
    padding: 20,
    backgroundColor: 'white',
  },
  documentItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  documentType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ocrConfidence: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  documentUser: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  documentDate: {
    fontSize: 12,
    color: '#999',
  },
  documentActions: {
    alignItems: 'flex-end',
    marginTop: 5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  detailsText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 20,
    lineHeight: 20,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: '#27AE60',
  },
  rejectButton: {
    backgroundColor: '#E74C3C',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default AdminDocumentReviewScreen; 