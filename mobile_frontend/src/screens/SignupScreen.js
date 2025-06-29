import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AuthService from '../services/authService';

const SignupScreen = ({ navigation, onAuthStateChange }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });

  const [consents, setConsents] = useState({
    kvkk: false,
    openConsent: false,
    location: false,
    notification: false,
    marketing: false
  });

  const [permissionsGranted, setPermissionsGranted] = useState({
    camera: false,
    mediaLibrary: false,
    location: false
  });

  const [loading, setLoading] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleConsentChange = (consent, value) => {
    setConsents(prev => ({
      ...prev,
      [consent]: value
    }));
  };

  const setFieldError = (field, message) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: message
    }));
  };

  const clearAllErrors = () => {
    setFieldErrors({});
  };

  const requestPermissions = async () => {
    setPermissionsLoading(true);
    try {
      // Request Camera Permission
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      // Request Media Library Permission  
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      // Request Location Permission
      const locationPermission = await Location.requestForegroundPermissionsAsync();

      const newPermissions = {
        camera: cameraPermission.status === 'granted',
        mediaLibrary: mediaPermission.status === 'granted',
        location: locationPermission.status === 'granted'
      };

      setPermissionsGranted(newPermissions);

      // Update location consent based on permission
      if (newPermissions.location) {
        setConsents(prev => ({ ...prev, location: true }));
      }

      const allGranted = Object.values(newPermissions).every(Boolean);
      
      if (allGranted) {
        Alert.alert('Success', 'All permissions granted successfully!');
      } else {
        Alert.alert(
          'Permissions Required',
          'Some permissions were not granted. Please enable all permissions to complete registration.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert('Error', 'Failed to request permissions');
    } finally {
      setPermissionsLoading(false);
    }
  };

  const validateForm = () => {
    clearAllErrors();
    let isValid = true;

    // Form validation
    if (!formData.firstName.trim()) {
      setFieldError('firstName', 'First name is required');
      isValid = false;
    }
    if (!formData.lastName.trim()) {
      setFieldError('lastName', 'Last name is required');
      isValid = false;
    }
    if (!formData.email.trim()) {
      setFieldError('email', 'Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setFieldError('email', 'Please enter a valid email address');
      isValid = false;
    }
    if (formData.password.length < 6) {
      setFieldError('password', 'Password must be at least 6 characters');
      isValid = false;
    }
    if (formData.password !== formData.confirmPassword) {
      setFieldError('confirmPassword', 'Passwords do not match');
      isValid = false;
    }

    // Consent validation
    if (!consents.kvkk) {
      Alert.alert('Error', 'KVKK consent is required to register');
      isValid = false;
    }
    if (!consents.openConsent) {
      Alert.alert('Error', 'Open consent for data processing is required');
      isValid = false;
    }

    // Permission validation
    const requiredPermissions = ['camera', 'mediaLibrary', 'location'];
    const missingPermissions = requiredPermissions.filter(perm => !permissionsGranted[perm]);
    
    if (missingPermissions.length > 0) {
      Alert.alert(
        'Permissions Required',
        `The following permissions are required: ${missingPermissions.join(', ')}. Please grant all permissions to register.`
      );
      isValid = false;
    }

    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const signupData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        password: formData.password,
        consents: consents,
        permissions: permissionsGranted
      };

      const response = await AuthService.signup(signupData);
      
      Alert.alert(
        'Success', 
        'Registration successful! Welcome to RenTesla!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Notify parent about auth state change
              if (onAuthStateChange) {
                onAuthStateChange(true);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle specific error cases
      const errorMessage = error.message;
      if (errorMessage.includes('email already exists')) {
        setFieldError('email', 'An account with this email already exists');
      } else if (errorMessage.includes('KVKK consent')) {
        Alert.alert('KVKK Consent Required', 'KVKK consent is required to create an account');
      } else if (errorMessage.includes('consent')) {
        Alert.alert('Consent Required', 'Data processing consent is required to create an account');
      } else {
        Alert.alert('Registration Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderConsentItem = (key, title, description, required = false) => (
    <View style={styles.consentItem} key={key}>
      <View style={styles.consentContent}>
        <Text style={[styles.consentTitle, required && styles.requiredText]}>
          {title} {required && <Text style={styles.asterisk}>*</Text>}
        </Text>
        <Text style={styles.consentDescription}>{description}</Text>
      </View>
      <Switch
        value={consents[key]}
        onValueChange={(value) => handleConsentChange(key, value)}
        trackColor={{ false: '#E0E0E0', true: '#E31E2E' }}
        thumbColor={'#FFFFFF'}
      />
    </View>
  );

  const renderPermissionStatus = (permission, label) => (
    <View style={styles.permissionItem} key={permission}>
      <Text style={styles.permissionLabel}>{label}</Text>
      <Ionicons 
        name={permissionsGranted[permission] ? "checkmark-circle" : "close-circle"} 
        size={24} 
        color={permissionsGranted[permission] ? "#2ECC71" : "#E74C3C"} 
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.title}>Create Account</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={[styles.input, fieldErrors.firstName && styles.inputError]}
                  value={formData.firstName}
                  onChangeText={(value) => handleInputChange('firstName', value)}
                  placeholder="Enter first name"
                  placeholderTextColor="#999"
                />
                {fieldErrors.firstName && (
                  <Text style={styles.errorText}>{fieldErrors.firstName}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={[styles.input, fieldErrors.lastName && styles.inputError]}
                  value={formData.lastName}
                  onChangeText={(value) => handleInputChange('lastName', value)}
                  placeholder="Enter last name"
                  placeholderTextColor="#999"
                />
                {fieldErrors.lastName && (
                  <Text style={styles.errorText}>{fieldErrors.lastName}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={[styles.input, fieldErrors.email && styles.inputError]}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  placeholder="Enter email address"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {fieldErrors.email && (
                  <Text style={styles.errorText}>{fieldErrors.email}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={[styles.input, fieldErrors.phoneNumber && styles.inputError]}
                  value={formData.phoneNumber}
                  onChangeText={(value) => handleInputChange('phoneNumber', value)}
                  placeholder="Enter phone number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
                {fieldErrors.phoneNumber && (
                  <Text style={styles.errorText}>{fieldErrors.phoneNumber}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={[styles.input, fieldErrors.password && styles.inputError]}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  placeholder="Enter password (min 6 characters)"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
                {fieldErrors.password && (
                  <Text style={styles.errorText}>{fieldErrors.password}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password *</Text>
                <TextInput
                  style={[styles.input, fieldErrors.confirmPassword && styles.inputError]}
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  placeholder="Confirm password"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
                {fieldErrors.confirmPassword && (
                  <Text style={styles.errorText}>{fieldErrors.confirmPassword}</Text>
                )}
              </View>
            </View>

            {/* Permissions Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Required Permissions</Text>
              <Text style={styles.sectionDescription}>
                These permissions are required for app functionality:
              </Text>

              <View style={styles.permissionsList}>
                {renderPermissionStatus('camera', 'Camera Access')}
                {renderPermissionStatus('mediaLibrary', 'Photo Library Access')}
                {renderPermissionStatus('location', 'Location Access')}
              </View>

              <TouchableOpacity 
                style={[styles.permissionButton, permissionsLoading && styles.buttonDisabled]}
                onPress={requestPermissions}
                disabled={permissionsLoading}
              >
                {permissionsLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.permissionButtonText}>Grant Permissions</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Consents Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Consents & Agreements</Text>
              
              {renderConsentItem(
                'kvkk',
                'KVKK Data Processing',
                'I agree to the processing, storage and sharing of my personal data as described in the privacy notice.',
                true
              )}

              {renderConsentItem(
                'openConsent',
                'Service Data Processing',
                'I give explicit consent for processing my personal data for identity verification, vehicle rental and payment operations.',
                true
              )}

              {renderConsentItem(
                'location',
                'Location Services',
                'I allow access to my location to show nearby vehicles and enhance app functionality.'
              )}

              {renderConsentItem(
                'notification',
                'Push Notifications',
                'I want to receive notifications about reservation status, messages and important updates.'
              )}

              {renderConsentItem(
                'marketing',
                'Marketing Communications',
                'I want to receive information about campaigns, discounts and new services.'
              )}
            </View>

            {/* Signup Button */}
            <TouchableOpacity 
              style={[styles.signupButton, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.signupButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomSpacing} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#E31E2E',
  },
  errorText: {
    color: '#E31E2E',
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  permissionsList: {
    marginBottom: 15,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  permissionLabel: {
    fontSize: 16,
    color: '#333',
  },
  permissionButton: {
    flexDirection: 'row',
    backgroundColor: '#3498DB',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  consentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  consentContent: {
    flex: 1,
    marginRight: 15,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  consentDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  requiredText: {
    color: '#E31E2E',
  },
  asterisk: {
    color: '#E31E2E',
    fontWeight: 'bold',
  },
  signupButton: {
    backgroundColor: '#E31E2E',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginVertical: 20,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    color: '#E31E2E',
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default SignupScreen; 