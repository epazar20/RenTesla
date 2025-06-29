import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import apiService from '../services/apiService';

const { width, height } = Dimensions.get('window');

const QRScannerScreen = ({ route }) => {
  const navigation = useNavigation();
  const { userId } = route.params;
  
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scannedVehicle, setScannedVehicle] = useState(null);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    
    if (status !== 'granted') {
      Alert.alert(
        'Kamera İzni Gerekli',
        'QR kod okutabilmek için kamera erişim izni gerekiyor.',
        [
          { text: 'İptal', onPress: () => navigation.goBack() },
          { text: 'Ayarlar', onPress: () => {/* Open settings */} }
        ]
      );
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    
    setScanned(true);
    setLoading(true);

    try {
      console.log('QR Code scanned:', data);
      
      // Call API to get vehicle by QR code
      const vehicle = await apiService.scanVehicleQR(data);
      
      if (vehicle) {
        setScannedVehicle(vehicle);
        setShowSuccessModal(true);
      } else {
        Alert.alert(
          'Araç Bulunamadı',
          'Bu QR kod geçerli bir araca ait değil.',
          [
            { text: 'Tamam', onPress: () => setScanned(false) }
          ]
        );
      }
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert(
        'Hata',
        'QR kod okutulurken bir hata oluştu. Lütfen tekrar deneyin.',
        [
          { text: 'Tamam', onPress: () => setScanned(false) }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setScanned(false);
    setScannedVehicle(null);
  };

  const handleGoToVehicle = () => {
    setShowSuccessModal(false);
    navigation.navigate('VehicleDetail', {
      vehicleUuid: scannedVehicle.uuid,
      userId: userId,
      fromQRScan: true
    });
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
  };

  const resetScanner = () => {
    setScanned(false);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <Text>Kamera izni isteniyor...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#95A5A6" />
        <Text style={styles.permissionTitle}>Kamera Erişimi Gerekli</Text>
        <Text style={styles.permissionText}>
          QR kod okutabilmek için kamera erişim izni vermeniz gerekiyor.
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestCameraPermission}
        >
          <Text style={styles.permissionButtonText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Kod Tarayıcı</Text>
        <TouchableOpacity onPress={toggleFlash}>
          <Ionicons 
            name={flashOn ? "flash" : "flash-off"} 
            size={24} 
            color="#FFF" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          flashMode={flashOn ? 'torch' : 'off'}
          barcodeTypes={['qr', 'pdf417']}
        />
        
        {/* Scan overlay */}
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />
            <View style={styles.scanArea}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>
            <View style={styles.sideOverlay} />
          </View>
          <View style={styles.bottomOverlay} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>QR Kodu Tarayın</Text>
          <Text style={styles.instructionsText}>
            Araç üzerindeki QR kodu kamera ile okutun
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={resetScanner}
            disabled={!scanned}
          >
            <Ionicons name="refresh" size={24} color="#FFF" />
            <Text style={styles.controlButtonText}>Tekrar Tara</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => navigation.navigate('VehicleListing', { userId })}
          >
            <Ionicons name="list" size={24} color="#FFF" />
            <Text style={styles.controlButtonText}>Liste Görünümü</Text>
          </TouchableOpacity>
        </View>

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingBox}>
              <Ionicons name="hourglass" size={32} color="#3498DB" />
              <Text style={styles.loadingText}>QR kod işleniyor...</Text>
            </View>
          </View>
        )}
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleSuccessModalClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#2ECC71" />
            </View>
            
            <Text style={styles.modalTitle}>Araç Bulundu!</Text>
            
            {scannedVehicle && (
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>{scannedVehicle.displayName}</Text>
                <Text style={styles.vehicleModel}>
                  {scannedVehicle.make} {scannedVehicle.model}
                </Text>
                
                <View style={styles.vehicleStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="battery-half" size={16} color="#2ECC71" />
                    <Text style={styles.statText}>
                      {scannedVehicle.batteryLevel || 'N/A'}% Şarj
                    </Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Ionicons name="cash" size={16} color="#3498DB" />
                    <Text style={styles.statText}>
                      ₺{scannedVehicle.pricePerDay || scannedVehicle.dailyRate || 'N/A'}/gün
                    </Text>
                  </View>
                </View>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.secondaryButton]}
                onPress={handleSuccessModalClose}
              >
                <Text style={styles.secondaryButtonText}>Kapat</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.primaryButton]}
                onPress={handleGoToVehicle}
              >
                <Text style={styles.primaryButtonText}>Araç Detayı</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 250,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 220,
    height: 220,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#FFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
    opacity: 0.8,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  controlButton: {
    alignItems: 'center',
    opacity: 0.9,
  },
  controlButtonText: {
    fontSize: 12,
    color: '#FFF',
    marginTop: 4,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 12,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#3498DB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  successIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  vehicleInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  vehicleModel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  vehicleStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#F8F9FA',
    marginRight: 8,
  },
  primaryButton: {
    backgroundColor: '#3498DB',
    marginLeft: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default QRScannerScreen; 