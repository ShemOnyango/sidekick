const DEV_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.212.208:5000/api';
const DEV_SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://192.168.212.208:5000';
const OVERRIDE_API_URL = process.env.EXPO_PUBLIC_API_URL;
const OVERRIDE_SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

const ENV = {
  development: {
    API_URL: DEV_API_URL,
    SOCKET_URL: DEV_SOCKET_URL,
    MAPBOX_TOKEN: 'your-mapbox-token',
    GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key',
    APP_NAME: 'Sidekick (Dev)'
  },
  staging: {
    API_URL: 'https://staging-api.herzog.com/api',
    SOCKET_URL: 'https://staging-api.herzog.com',
    MAPBOX_TOKEN: 'your-mapbox-token-staging',
    GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key-staging',
    APP_NAME: 'Sidekick (Staging)'
  },
  production: {
    API_URL: 'https://api.herzog.com/api',
    SOCKET_URL: 'https://api.herzog.com',
    MAPBOX_TOKEN: 'your-mapbox-token-prod',
    GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key-prod',
    APP_NAME: 'Sidekick'
  }
};

const getEnvVars = (env = process.env.NODE_ENV || 'development') => {
  let base = ENV.development;
  if (env === 'production') base = ENV.production;
  if (env === 'staging') base = ENV.staging;

  if (OVERRIDE_API_URL || OVERRIDE_SOCKET_URL) {
    return {
      ...base,
      API_URL: OVERRIDE_API_URL || base.API_URL,
      SOCKET_URL: OVERRIDE_SOCKET_URL || base.SOCKET_URL,
    };
  }

  return base;
};

export default getEnvVars();
