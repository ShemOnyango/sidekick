// MUST BE FIRST - Intercepts native props BEFORE any components load
import './src/utils/nativePropsInterceptor';

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Alert, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { store, persistor } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/NavigationService';
import databaseService from './src/services/database/DatabaseService';
import socketService from './src/services/socket/SocketService';
import gpsTrackingService from './src/services/gps/GPSTrackingService';
import syncService from './src/services/sync/SyncService';
import ErrorBoundary from './src/components/ErrorBoundary';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Setting a timer for a long period of time',
]);

// Keep splash screen visible while we prepare the app
SplashScreen.preventAutoHideAsync();

// CRITICAL: Run migration BEFORE app renders to prevent Redux from loading corrupted data
let migrationPromise = null;
const runMigration = async () => {
  try {
    const migrationKey = 'migration_boolean_fix_v1';
    const migrationDone = await AsyncStorage.getItem(migrationKey);
    if (!migrationDone) {
      console.log('[MIGRATION] Clearing corrupted persisted data with string booleans...');
      await AsyncStorage.clear();
      await AsyncStorage.setItem(migrationKey, 'true');
      console.log('[MIGRATION] Complete - app will reload with clean state');
    } else {
      console.log('[MIGRATION] Already completed, skipping');
    }
  } catch (error) {
    console.error('[MIGRATION] Failed:', error);
  }
};
// Start migration immediately
migrationPromise = runMigration();

const App = () => {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        // Wait for migration to complete before allowing app to render
        await migrationPromise;
        
        // Initialize services (don't await to prevent blocking)
        databaseService.init().catch(err => console.log('DB init skipped:', err));
        syncService.init().catch(err => console.log('Sync init skipped:', err));
        
        // App is ready
        setAppIsReady(true);
      } catch (error) {
        console.error('Failed to prepare app:', error);
        // Still set app as ready to allow user to continue
        setAppIsReady(true);
      } finally {
        // Hide splash screen
        await SplashScreen.hideAsync();
      }
    };

    prepareApp();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
      gpsTrackingService.cleanup();
      syncService.cleanup();
    };
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate persistor={persistor}>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <AppNavigator ref={navigationRef} />
          </SafeAreaProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
// TODO: Remove after one run - clears corrupted persisted data
// import AsyncStorage from '@react-native-async-storage/async-storage';
// AsyncStorage.clear();
