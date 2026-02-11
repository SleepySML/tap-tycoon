// ============================================
// AuthScreen — Full-screen login/register gate
//
// This screen blocks access to the game until
// the user signs in or registers. Replaces the
// old AuthModal approach.
//
// UX decisions:
//   - Full-screen dark theme, centered card with logo
//   - Google sign-in button (primary, highest conversion)
//   - Email/password form (secondary, toggle sign-in/up)
//   - No "Continue as Guest" — login is mandatory
//   - Loading states on all buttons prevent double-taps
//   - Inline error messages (not blocking alerts)
// ============================================

import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../config/theme';
import { useAuthStore, selectIsLoading } from '../store/authStore';
import { useAuthActions } from '../hooks/useAuth';

function AuthScreen() {
  const isLoading = useAuthStore(selectIsLoading);
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } =
    useAuthActions();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = useCallback(async () => {
    setError(null);
    await signInWithGoogle();
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
    }
    // On success, authStore session is set — App.tsx will swap to GameScreen
  }, [email, password, isSignUp, signInWithEmail, signUpWithEmail]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand section */}
        <View style={styles.brand}>
          <Text style={styles.logo}>💰</Text>
          <Text style={styles.appName}>Tap Tycoon</Text>
          <Text style={styles.tagline}>
            Build your empire, one tap at a time
          </Text>
        </View>

        {/* Auth card */}
        <View style={styles.card}>
          {/* Title */}
          <Text style={styles.title}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? 'Sign up to start your journey'
              : 'Sign in to continue playing'}
          </Text>

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
                <Text style={styles.googleText}>Continue with Google</Text>
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default memo(AuthScreen);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
  },

  // Brand
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logo: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: FontSizes.hero,
    fontWeight: FontWeights.extrabold,
    color: Colors.gold,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Card
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radii.xl,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
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
});
