import * as Device from 'expo-device';
import { Alert } from 'react-native';

class NotificationService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize notification service (stub for Expo Go)
   */
  async initialize() {
    console.log('NotificationService: initialize() called (Expo Go stub, no push notifications)');
      this.isInitialized = true;
      return true;
  }

  /**
   * Test local notification (Alert only)
   */
  async sendTestNotification() {
    try {
      console.log('🧪 Sending test notification (local Alert)...');
      Alert.alert(
        'Test Notification',
        'Notification service is working correctly!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService; 