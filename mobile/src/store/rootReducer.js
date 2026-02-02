import { combineReducers } from '@reduxjs/toolkit';

import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import authorityReducer from './slices/authoritySlice';
import mapReducer from './slices/mapSlice';
import alertReducer from './slices/alertSlice';
import gpsReducer from './slices/gpsSlice';
import pinReducer from './slices/pinSlice';
import offlineReducer from './slices/offlineSlice';
import settingsReducer from './slices/settingsSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  authority: authorityReducer,
  map: mapReducer,
  alerts: alertReducer,
  gps: gpsReducer,
  pins: pinReducer,
  offline: offlineReducer,
  settings: settingsReducer,
});

export default rootReducer;
