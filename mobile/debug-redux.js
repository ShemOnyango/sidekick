// Debug Redux Store - Add this temporarily to App.js useEffect

import { store } from './src/store/store';

// Add this to App.js after store is created:
const debugReduxState = () => {
  const state = store.getState();
  
  console.log('=== REDUX STATE TYPE CHECK ===');
  
  // Check auth slice
  if (state.auth) {
    console.log('auth.isLoading:', typeof state.auth.isLoading, '=', state.auth.isLoading);
    console.log('auth.isAuthenticated:', typeof state.auth.isAuthenticated, '=', state.auth.isAuthenticated);
    
    // Check for string booleans
    Object.keys(state.auth).forEach(key => {
      const value = state.auth[key];
      if (value === 'true' || value === 'false') {
        console.error(`❌ FOUND STRING BOOLEAN: auth.${key} = "${value}"`);
      }
    });
  }
  
  // Check all slices
  Object.keys(state).forEach(sliceName => {
    const slice = state[sliceName];
    if (slice && typeof slice === 'object') {
      Object.keys(slice).forEach(key => {
        const value = slice[key];
        if (value === 'true' || value === 'false') {
          console.error(`❌ FOUND STRING BOOLEAN: ${sliceName}.${key} = "${value}"`);
        }
      });
    }
  });
  
  console.log('=== END TYPE CHECK ===');
};

// Call this in App.js useEffect:
// debugReduxState();
