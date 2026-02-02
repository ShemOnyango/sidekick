import api from './api';

/**
 * Analytics Service
 * Handles all analytics and reporting API calls
 */

export const analyticsService = {
  /**
   * Get dashboard statistics
   */
  getDashboardStats: async (agencyId, params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.forceRefresh) queryParams.append('forceRefresh', 'true');

    const response = await api.get(`/analytics/${agencyId}/dashboard?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Get trend data for a specific metric
   */
  getTrendData: async (agencyId, metric, period = '7d') => {
    const response = await api.get(`/analytics/${agencyId}/trends/${metric}?period=${period}`);
    return response.data;
  },

  /**
   * Get safety metrics
   */
  getSafetyMetrics: async (agencyId) => {
    const response = await api.get(`/analytics/${agencyId}/safety-metrics`);
    return response.data;
  },

  /**
   * Generate report
   */
  generateReport: async (agencyId, reportType, params = {}) => {
    const response = await api.post(`/analytics/${agencyId}/reports/${reportType}`, {
      startDate: params.startDate,
      endDate: params.endDate,
      options: params.options || {}
    });
    return response.data;
  },

  /**
   * Clear analytics cache
   */
  clearCache: async (agencyId) => {
    const response = await api.post(`/analytics/${agencyId}/cache/clear`);
    return response.data;
  }
};

export default analyticsService;
