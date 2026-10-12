/**
 * HINCH MART — Main Application Entry Point
 * "EVERYTHING FOR EVERY CONSTRUCTION"
 */
import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens(true);

import './src/localization';
import React, { useEffect } from 'react';
import { View, StyleSheet, LogBox } from 'react-native';

// Suppress transient network warning popups from interrupting mobile screen in development
LogBox.ignoreLogs([
  'Network error',
  'Network request failed',
  '[productsApi]',
  '[categoriesApi]',
  '[subcategoriesApi]',
  '[brandsApi]',
  '[bannersApi]',
  '[addressesApi]',
  '[useLiveProducts]',
  '[useLiveCategories]',
  '[useLiveBrands]',
  '[useLiveBanners]',
]);
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { store, persistor } from './src/redux';
import { queryClient } from './src/services/api/queryClient';
import { ThemeProvider } from './src/theme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initAppPermissions } from './src/services/permissions/permissionsService';

export default function App() {
  useEffect(() => {
    // Request permissions (Notification + Location) and configure channels on app startup
    initAppPermissions().catch((err) => {
      console.warn('[App] Permissions initialization error:', err);
    });
  }, []);

  return (
    <View style={styles.rootWrapper}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider>
                <NavigationContainer>
                  <RootNavigator />
                </NavigationContainer>
              </ThemeProvider>
            </QueryClientProvider>
          </PersistGate>
        </ReduxProvider>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
  },
});
