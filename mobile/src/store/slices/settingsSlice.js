import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Notification settings
  notificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  proximityAlertsEnabled: true,
  
  // Alert distance thresholds (in miles)
  alertDistances: {
    informational: 1.0,
    warning: 0.75,
    critical: 0.50,
    emergency: 0.25,
  },
  
  // Location settings
  locationAlways: false,
  backgroundLocationEnabled: false,
  gpsUpdateInterval: 2000, // milliseconds
  
  // Map settings
  mapType: 'standard', // 'standard', 'satellite', 'hybrid'
  showMileposts: false,
  showTrackNumbers: true,
  showAuthorities: true,
  showPins: true,
  
  // Offline settings
  offlineMode: false,
  autoDownloadEnabled: false,
  wifiOnlyDownloads: true,
  
  // App settings
  theme: 'dark', // 'light', 'dark'
  language: 'en',
  
  // Performance settings
  highAccuracyGPS: true,
  powerSavingMode: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateNotificationSettings: (state, action) => {
      const { notificationsEnabled, soundEnabled, vibrationEnabled, proximityAlertsEnabled } = action.payload;
      console.log('🔍 updateNotificationSettings called with:', {
        notificationsEnabled: { value: notificationsEnabled, type: typeof notificationsEnabled },
        soundEnabled: { value: soundEnabled, type: typeof soundEnabled },
        vibrationEnabled: { value: vibrationEnabled, type: typeof vibrationEnabled },
        proximityAlertsEnabled: { value: proximityAlertsEnabled, type: typeof proximityAlertsEnabled }
      });
      if (notificationsEnabled !== undefined) state.notificationsEnabled = Boolean(notificationsEnabled);
      if (soundEnabled !== undefined) state.soundEnabled = Boolean(soundEnabled);
      if (vibrationEnabled !== undefined) state.vibrationEnabled = Boolean(vibrationEnabled);
      if (proximityAlertsEnabled !== undefined) state.proximityAlertsEnabled = Boolean(proximityAlertsEnabled);
    },
    updateAlertDistances: (state, action) => {
      state.alertDistances = { ...state.alertDistances, ...action.payload };
    },
    updateLocationSettings: (state, action) => {
      const { locationAlways, backgroundLocationEnabled, gpsUpdateInterval, highAccuracyGPS } = action.payload;
      if (locationAlways !== undefined) state.locationAlways = Boolean(locationAlways);
      if (backgroundLocationEnabled !== undefined) state.backgroundLocationEnabled = Boolean(backgroundLocationEnabled);
      if (gpsUpdateInterval !== undefined) state.gpsUpdateInterval = gpsUpdateInterval;
      if (highAccuracyGPS !== undefined) state.highAccuracyGPS = Boolean(highAccuracyGPS);
    },
    updateMapSettings: (state, action) => {
      const { mapType, showMileposts, showTrackNumbers, showAuthorities, showPins } = action.payload;
      if (mapType !== undefined) state.mapType = mapType;
      if (showMileposts !== undefined) state.showMileposts = Boolean(showMileposts);
      if (showTrackNumbers !== undefined) state.showTrackNumbers = Boolean(showTrackNumbers);
      if (showAuthorities !== undefined) state.showAuthorities = Boolean(showAuthorities);
      if (showPins !== undefined) state.showPins = Boolean(showPins);
    },
    updateOfflineSettings: (state, action) => {
      const { offlineMode, autoDownloadEnabled, wifiOnlyDownloads } = action.payload;
      if (offlineMode !== undefined) state.offlineMode = Boolean(offlineMode);
      if (autoDownloadEnabled !== undefined) state.autoDownloadEnabled = Boolean(autoDownloadEnabled);
      if (wifiOnlyDownloads !== undefined) state.wifiOnlyDownloads = Boolean(wifiOnlyDownloads);
    },
    updateAppSettings: (state, action) => {
      const { theme, language, powerSavingMode } = action.payload;
      if (theme !== undefined) state.theme = theme;
      if (language !== undefined) state.language = language;
      if (powerSavingMode !== undefined) state.powerSavingMode = Boolean(powerSavingMode);
    },
    resetSettings: () => initialState,
  },
});

export const {
  updateNotificationSettings,
  updateAlertDistances,
  updateLocationSettings,
  updateMapSettings,
  updateOfflineSettings,
  updateAppSettings,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
