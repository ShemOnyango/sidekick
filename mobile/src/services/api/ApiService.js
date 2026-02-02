import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../../constants/config';
import databaseService from '../database/DatabaseService';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: CONFIG.API.BASE_URL,
      timeout: CONFIG.API.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        // Get token from database
        const user = await databaseService.getUser();
        if (user && user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Handle token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const newToken = await this.refreshToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, log user out
            await this.handleLogout();
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  async refreshToken() {
    try {
      const response = await this.api.post('/auth/refresh-token');
      if (response.data.success && response.data.data.token) {
        const user = await databaseService.getUser();
        if (user) {
          await databaseService.updateUserToken(user.user_id, response.data.data.token);
        }
        return response.data.data.token;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  async handleLogout() {
    // Clear local storage
    await AsyncStorage.clear();
    await databaseService.clearDatabase();
    
    // Navigate to login (handled by auth service)
    return true;
  }

  // Auth endpoints
  async login(username, password) {
    try {
      const response = await this.api.post('/auth/login', { username, password });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(userData) {
    try {
      const response = await this.api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getProfile() {
    try {
      const response = await this.api.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await this.api.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await this.api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Agency endpoints
  async getAgencies(page = 1, limit = 20, search = '') {
    try {
      const response = await this.api.get('/agencies', {
        params: { page, limit, search }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAgencyStats(agencyId) {
    try {
      const response = await this.api.get(`/agencies/${agencyId}/stats`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Authority endpoints
  async createAuthority(authorityData) {
    try {
      const response = await this.api.post('/authorities', authorityData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getActiveAuthorities(subdivisionId = null, trackType = null, trackNumber = null) {
    try {
      const response = await this.api.get('/authorities/active', {
        params: { subdivisionId, trackType, trackNumber }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserAuthorities(activeOnly = true) {
    try {
      const response = await this.api.get('/authorities/my', {
        params: { activeOnly }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async endAuthority(authorityId, confirmEndTracking = true) {
    try {
      const response = await this.api.post(`/authorities/${authorityId}/end`, {
        confirmEndTracking
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async checkProximity(authorityId, latitude, longitude, maxDistance = 1.0) {
    try {
      const response = await this.api.post(`/authorities/${authorityId}/check-proximity`, {
        latitude,
        longitude,
        maxDistance
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Alert endpoints
  async getAlertConfigurations(agencyId) {
    try {
      const response = await this.api.get(`/alerts/config/${agencyId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserAlerts(limit = 50, unreadOnly = false) {
    try {
      const response = await this.api.get('/alerts/my', {
        params: { limit, unreadOnly }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async markAlertAsRead(alertId) {
    try {
      const response = await this.api.put(`/alerts/read/${alertId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // GPS endpoints
  async updateGPSPosition(gpsData) {
    try {
      const response = await this.api.post('/gps/update', gpsData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getActivePositions() {
    try {
      const response = await this.api.get('/gps/active-positions');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Data download endpoints
  async downloadAgencyData(agencyId) {
    try {
      const response = await this.api.get(`/agencies/${agencyId}/data`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async downloadSubdivisionData(agencyId, subdivisionId) {
    try {
      // Backend exposes subdivision downloads under /offline/agency/:agencyId/subdivision/:subdivisionId
      const response = await this.api.get(`/offline/agency/${agencyId}/subdivision/${subdivisionId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Upload endpoints
  async uploadPinPhoto(formData) {
    try {
      const response = await this.api.post('/upload/pin-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async syncData(syncItems) {
    try {
      const response = await this.api.post('/sync', { items: syncItems });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handling
  handleError(error) {
    if (error.response) {
      // Server responded with error
      const { data, status } = error.response;
      
      if (data && data.error) {
        return {
          message: data.error,
          status,
          details: data.details
        };
      }
      
      return {
        message: `Server error: ${status}`,
        status
      };
    } else if (error.request) {
      // Request made but no response
      return {
        message: 'Network error. Please check your connection.',
        status: 0
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unknown error occurred',
        status: -1
      };
    }
  }

  // Network status
  isNetworkError(error) {
    return error.status === 0;
  }
}

// Export singleton instance
const apiService = new ApiService();
export default apiService;
