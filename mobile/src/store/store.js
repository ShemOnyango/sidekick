import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, createTransform } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';

import rootReducer from './rootReducer';
import booleanTypeLoggerMiddleware from './middleware/booleanTypeLogger';

// Transform to ensure booleans stay as booleans (not strings)
const booleanTransform = createTransform(
  // Transform state on its way to being serialized and persisted
  (inboundState, key) => {
    return inboundState;
  },
  // Transform state being rehydrated
  (outboundState, key) => {
    console.log(`🔄 Rehydrating ${key} slice:`, JSON.stringify(outboundState, null, 2));
    
    if (!outboundState || typeof outboundState !== 'object') {
      return outboundState;
    }
    
    // Recursively convert string booleans to actual booleans
    const convertBooleans = (obj, path = '') => {
      if (obj === null || typeof obj !== 'object') {
        // Convert string booleans to actual booleans
        if (obj === 'true') {
          console.warn(`🔧 Converting string "true" to boolean at ${path}`);
          return true;
        }
        if (obj === 'false') {
          console.warn(`🔧 Converting string "false" to boolean at ${path}`);
          return false;
        }
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map((item, i) => convertBooleans(item, `${path}[${i}]`));
      }
      
      const result = {};
      Object.keys(obj).forEach(k => {
        result[k] = convertBooleans(obj[k], path ? `${path}.${k}` : k);
      });
      return result;
    };
    
    const converted = convertBooleans(outboundState);
    console.log(`✅ Rehydrated ${key} slice (after conversion):`, JSON.stringify(converted, null, 2));
    return converted;
  },
  // Apply to these slices
  { whitelist: ['auth', 'settings', 'offline', 'map'] }
);

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  stateReconciler: autoMergeLevel2,
  whitelist: ['auth', 'settings', 'offline', 'map'],
  blacklist: ['navigation', 'gps', 'alerts'],
  transforms: [booleanTransform],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
      immutableCheck: false,
    }).concat(booleanTypeLoggerMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);
