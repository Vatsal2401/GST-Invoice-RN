import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';

import { getBusinessProfile } from './src/services/businessService';
import { useStore } from './src/store/useStore';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from './src/components/ui/Toast';

export default function App(): React.ReactElement {
  const [ready, setReady] = useState(false);
  const { setAuthenticated, setBusinessProfile } = useStore();

  useEffect(() => {
    async function initialize() {
      try {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
          setAuthenticated(true);
          // Pre-load business profile so it's available immediately
          const profile = await getBusinessProfile().catch(() => null);
          if (profile) setBusinessProfile(profile);
        }
      } catch {
        // No token or network error — stay on login screen
      } finally {
        setReady(true);
      }
    }
    initialize();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>₹</Text>
        </View>
        <Text style={styles.appName}>GST Invoice</Text>
        <ActivityIndicator size="large" color="#f0a500" style={styles.loader} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
          <Toast />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3a5f',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0a500',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1e3a5f',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 32,
    letterSpacing: 1,
  },
  loader: {
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
});
