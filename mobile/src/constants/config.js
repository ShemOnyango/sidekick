import env from '../config/environment';

export const CONFIG = {
  API: {
    BASE_URL: env.API_URL,
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
  },
  
  SOCKET: {
    URL: env.SOCKET_URL,
    RECONNECTION_ATTEMPTS: 5,
    RECONNECTION_DELAY: 1000
  },
  
  MAP: {
    MAPBOX_TOKEN: env.MAPBOX_TOKEN,
    GOOGLE_MAPS_API_KEY: env.GOOGLE_MAPS_API_KEY,
    DEFAULT_ZOOM: 15,
    MAX_ZOOM: 18,
    MIN_ZOOM: 5,
    INITIAL_REGION: {
      latitude: 39.8283,
      longitude: -98.5795,
      latitudeDelta: 50,
      longitudeDelta: 50
    }
  },
  
  GPS: {
    UPDATE_INTERVAL: 30000, // 30 seconds
    FASTEST_INTERVAL: 10000, // 10 seconds
    DISTANCE_FILTER: 10, // meters
    DESIRED_ACCURACY: 'high', // 'high', 'balanced', 'low', 'passive'
    BACKGROUND_TRACKING: true
  },
  
  ALERTS: {
    DEFAULT_DISTANCES: [1.0, 0.75, 0.5, 0.25], // miles
    BOUNDARY_CHECK_INTERVAL: 30000, // 30 seconds
    PROXIMITY_CHECK_INTERVAL: 15000 // 15 seconds
  },
  
  SYNC: {
    BATCH_SIZE: 50,
    RETRY_INTERVAL: 60000, // 1 minute
    MAX_RETRIES: 5
  },
  
  STORAGE: {
    DATABASE_NAME: 'herzog_rail_authority.db',
    ASYNC_STORAGE_KEY: '@HerzogRailAuthority',
    MAX_DB_SIZE: 100 * 1024 * 1024 // 100MB
  },
  
  APP: {
    NAME: env.APP_NAME,
    VERSION: '1.0.0',
    BUILD_NUMBER: '1'
  }
};

export default CONFIG;
