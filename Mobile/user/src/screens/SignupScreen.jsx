import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  BackHandler,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { signInWithGoogle } from '../utils/googleSignIn';
import Header from '../components/Header';

const SignupScreen = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    region: '',
    profilePicture: null,
    agree: false,
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const { handleSignup, handleGoogleSignIn, loading } = useAuth();
  const navigation = useNavigation();

  // Handle Android back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        return false;
      };

      if (Platform.OS === 'android') {
        const BackHandler = require('react-native').BackHandler;
        BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      }
    }, [navigation])
  );

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError('');
  };

  const handleImagePicker = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        return;
      } else if (response.errorMessage) {
        Alert.alert('Error', 'Failed to pick image');
        return;
      } else if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setFormData({
          ...formData,
          profilePicture: {
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || 'profile.jpg',
          },
        });
        setPreviewUrl(asset.uri);
      }
    });
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        // Cleanup preview URL if needed
      }
    };
  }, [previewUrl]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword || !formData.role) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!formData.agree) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setError('');
    try {
      await handleSignup(formData);
      Alert.alert(
        'Success',
        'Account created successfully! Please check your email for OTP verification.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      console.log('Starting Google Sign-Up...');
      const idToken = await signInWithGoogle();
      console.log('Got ID Token:', idToken ? 'Yes' : 'No');
      
      if (!idToken) {
        throw new Error('Failed to get Google ID token');
      }
      
      console.log('Sending token to backend...');
      await handleGoogleSignIn(idToken);
      console.log('Google Sign-Up successful!');
      // Navigation will be handled by the navigation stack based on auth state
    } catch (err) {
      console.error('Google Sign-Up Error:', err);
      const errorMessage = err.message || err.response?.data?.message || 'Google sign-up failed. Please try again.';
      setError(errorMessage);
      Alert.alert('Google Sign-Up Error', errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>
            Embark on your journey. Fill in your details below.
          </Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
              value={formData.fullName}
              onChangeText={(text) => handleChange('fullName', text)}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              value={formData.email}
              onChangeText={(text) => handleChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              value={formData.password}
              onChangeText={(text) => handleChange('password', text)}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor="#999"
              value={formData.confirmPassword}
              onChangeText={(text) => handleChange('confirmPassword', text)}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Select Role</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.role}
                onValueChange={(value) => handleChange('role', value)}
                style={styles.picker}
              >
                <Picker.Item label="Select your role" value="" />
                <Picker.Item label="Local" value="local" />
                <Picker.Item label="Tourist" value="tourist" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Region/City (Relevant for Locals)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Lahore, Karachi, Islamabad"
              placeholderTextColor="#999"
              value={formData.region}
              onChangeText={(text) => handleChange('region', text)}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Profile Picture</Text>
            <View style={styles.imagePickerContainer}>
              <TouchableOpacity
                style={styles.imagePreview}
                onPress={handleImagePicker}
              >
                {previewUrl ? (
                  <Image source={{ uri: previewUrl }} style={styles.previewImage} />
                ) : (
                  <Text style={styles.imagePlaceholder}>📷</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={handleImagePicker}
              >
                <Text style={styles.imagePickerButtonText}>
                  {previewUrl ? 'Change image' : '📷 Click to upload (Optional)'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => handleChange('agree', !formData.agree)}
            >
              <View style={[styles.checkboxBox, formData.agree && styles.checkboxBoxChecked]}>
                {formData.agree && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>
              By creating an account, you agree to our{' '}
              <Text style={styles.linkText}>Terms of Service</Text> and{' '}
              <Text style={styles.linkText}>Privacy Policy</Text>.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Creating...</Text>
              </>
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.socialButton, (loading || googleLoading) && styles.buttonDisabled]}
            onPress={handleGoogleSignup}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#333" />
            ) : (
              <>
                <Text style={styles.socialButtonIcon}>G</Text>
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => Alert.alert('Coming Soon', 'Apple Sign-In will be available soon')}
          >
            <Text style={styles.socialButtonIcon}>🍎</Text>
            <Text style={styles.socialButtonText}>Continue with Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => Alert.alert('Coming Soon', 'Facebook Sign-In will be available soon')}
          >
            <Text style={styles.socialButtonIcon}>f</Text>
            <Text style={styles.socialButtonText}>Continue with Facebook</Text>
          </TouchableOpacity>

          <View style={styles.bottomNote}>
            <Text style={styles.bottomNoteText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  imagePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    fontSize: 32,
  },
  imagePickerButton: {
    flex: 1,
    minHeight: 52,
    borderWidth: 2,
    borderColor: '#ced4da',
    borderStyle: 'dashed',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  imagePickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 10,
    marginTop: 2,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#999',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxBoxChecked: {
    backgroundColor: '#E65100',
    borderColor: '#E65100',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#E65100',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#999',
    fontSize: 14,
  },
  bottomNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  bottomNoteText: {
    color: '#666',
    fontSize: 14,
  },
  linkText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '600',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    padding: 14,
    borderRadius: 6,
    marginBottom: 8,
  },
  socialButtonIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
    width: 24,
    textAlign: 'center',
  },
  socialButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SignupScreen;

