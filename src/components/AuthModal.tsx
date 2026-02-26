// ============================================
// AuthModal — Sign-in / Sign-up modal
//
// Shows when user taps "Sign In" from the header.
// Provides Google OAuth and email/password auth.
//
// UX decisions:
//   - Modal overlay (not a separate screen) so the game
//     stays visible behind — reduces perceived friction
//   - Google button is primary (one tap, highest conversion)
//   - Email form is secondary (toggle between sign-in/up)
//   - Loading states on all buttons prevent double-taps
//   - Error messages inline (not alerts that block interaction)
// ============================================

import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../config/theme';
import { useAuthStore, selectIsLoading } from '../store/authStore';
import { useAuthActions } from '../hooks/useAuth';

export interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

function AuthModal({ visible, onClose }: AuthModalProps) {
  const isLoading = useAuthStore(selectIsLoading);
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } =
    useAuthActions();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setError(null);
    setIsSignUp(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleGoogle = useCallback(async () => {
    setError(null);
    await signInWithGoogle();
    // If successful, onAuthStateChange will fire and we can close
    // The modal stays open during redirect (web) or browser (mobile)
  }, [signInWithGoogle]);

  const handleEmail = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    const result = isSignUp
      ? await signUpWithEmail(email.trim(), password)
      : await signInWithEmail(email.trim(), password);

    if (result.error) {
      setError(result.error);
      return;
    }
    handleClose();
  }, [email, password, isSignUp, signInWithEmail, signUpWithEmail, handleClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={styles.content}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
              <Text style={styles.subtitle}>
                Sync your progress across devices
              </Text>
            </View>

            {/* Google Button */}
            <Pressable
              style={[styles.googleBtn, isLoading && styles.btnDisabled]}
              onPress={handleGoogle}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleText}>
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Form */}
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!isLoading}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                editable={!isLoading}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                style={[styles.emailBtn, isLoading && styles.btnDisabled]}
                onPress={handleEmail}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.emailBtnText}>
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Toggle sign-in / sign-up */}
            <Pressable
              style={styles.toggleRow}
              onPress={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
            >
              <Text style={styles.toggleText}>
                {isSignUp
                  ? 'Already have an account? '
                  : "Don't have an account? "}
                <Text style={styles.toggleLink}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </Text>
            </Pressable>

            {/* Skip / Close */}
            <Pressable style={styles.skipBtn} onPress={handleClose}>
              <Text style={styles.skipText}>Continue as Guest</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default memo(AuthModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  content: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radii.xl,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Google
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#4285F4',
    borderRadius: Radii.md,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    textAlign: 'center',
    lineHeight: 28,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#4285F4',
    overflow: 'hidden',
  },
  googleText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: '#fff',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderGlass,
  },
  dividerText: {
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },

  // Email form
  form: {
    gap: Spacing.md,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  error: {
    fontSize: FontSizes.sm,
    color: Colors.red,
    textAlign: 'center',
  },
  emailBtn: {
    paddingVertical: Spacing.md,
    backgroundColor: Colors.greenDark,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  emailBtnText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },

  // Toggle
  toggleRow: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  toggleText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  toggleLink: {
    color: Colors.blue,
    fontWeight: FontWeights.semibold,
  },

  // Skip
  skipBtn: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  skipText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
});
