import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logIn, resetPassword } from '../lib/auth';
import { FloatingCaps } from '../components/FloatingCaps';

interface Props {
  onNavigateToSignUp: () => void;
}

export default function LoginScreen({ onNavigateToSignUp }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await logIn(email.trim(), password);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      Alert.alert('Enter your email first', 'Type your email above then tap Forgot Password.');
      return;
    }
    try {
      await resetPassword(email.trim());
      Alert.alert('Email sent', 'Check your inbox for a password reset link.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FloatingCaps />
      <Image
        source={require('../../assets/teersticker.webp')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Caps Tracker</Text>
      <Text style={styles.subtitle}>Track your game.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleForgotPassword}>
        <Text style={styles.link}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onNavigateToSignUp} style={styles.signupRow}>
        <Text style={styles.mutedText}>Don't have an account? </Text>
        <Text style={styles.link}>Sign Up</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f2e',
    justifyContent: 'center',
    padding: 28,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#c9a844',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#111d4a',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e2d6b',
  },
  button: {
    backgroundColor: '#c9a844',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  buttonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
  link: {
    color: '#c9a844',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  mutedText: {
    color: '#888',
    fontSize: 14,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
});
