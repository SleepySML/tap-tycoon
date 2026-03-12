// ============================================
// BASEMENT TYCOON — App Entry Point
//
// Responsibilities:
//   1. SafeAreaProvider for consistent insets
//   2. Auth initialization (restore session, listen for changes)
//   3. Auth gate: show AuthScreen until user signs in
//   4. Once authenticated, render the game screen
//
// Auth flow: login-required gate
//   The app shows a full-screen AuthScreen until the
//   user signs in or registers. Only then is the game
//   screen rendered. Sign out returns to AuthScreen.
// ============================================

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthInit } from './src/hooks/useAuth';
import {
  useAuthStore,
  selectIsAuthenticated,
  selectIsInitialized,
} from './src/store/authStore';
import AuthScreen from './src/components/AuthScreen';
import GameScreen from './src/components/GameScreen';

/** Loading splash shown while auth state is being restored. */
function SplashScreen() {
  return (
    <View style={splashStyles.container}>
      <Text style={splashStyles.logo}>💰</Text>
      <Text style={splashStyles.title}>Basement Tycoon</Text>
      <ActivityIndicator
        size="large"
        color="#ffd700"
        style={splashStyles.spinner}
      />
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffd700',
    marginBottom: 24,
  },
  spinner: {
    marginTop: 8,
  },
});

function AppContent() {
  // Initialize auth (restore session, set up listeners, seed local accounts)
  useAuthInit();

  const isInitialized = useAuthStore(selectIsInitialized);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  // Still loading auth state — show splash
  if (!isInitialized) {
    return <SplashScreen />;
  }

  // Not authenticated — show auth gate
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Authenticated — show the game
  return <GameScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={rootStyles.viewport}>
        <AppContent />
      </View>
    </SafeAreaProvider>
  );
}

const rootStyles = StyleSheet.create({
  viewport: Platform.select({
    web: { flex: 1, height: '100vh', overflow: 'hidden' },
    default: { flex: 1 },
  }),
});
