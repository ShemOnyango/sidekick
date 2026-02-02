const ENV = {
  development: {
    API_URL: 'http://localhost:5000/api',
    SOCKET_URL: 'http://localhost:5000',
    MAPBOX_TOKEN: 'your-mapbox-token',
    GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key',
    APP_NAME: 'Herzog Rail Authority (Dev)'
  },
  staging: {
    API_URL: 'https://staging-api.herzog.com/api',
    SOCKET_URL: 'https://staging-api.herzog.com',
    MAPBOX_TOKEN: 'your-mapbox-token-staging',
    GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key-staging',
    APP_NAME: 'Herzog Rail Authority (Staging)'
  },
  production: {
    API_URL: 'https://api.herzog.com/api',
    SOCKET_URL: 'https://api.herzog.com',
    MAPBOX_TOKEN: 'your-mapbox-token-prod',
    GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key-prod',
    APP_NAME: 'Herzog Rail Authority'
  }
};

const getEnvVars = (env = process.env.NODE_ENV || 'development') => {
  if (env === 'production') {
    return ENV.production;
  }
  if (env === 'staging') {
    return ENV.staging;
  }
  return ENV.development;
};

export default getEnvVars();
