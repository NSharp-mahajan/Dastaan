/**
 * Dastaan Reusable Frontend API Client
 * Compatible with Vite environment variables.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Generic fetch wrapper with JSON parsing and standardized error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Automatically attach Bearer token if present
  try {
    const token = localStorage.getItem('dastaan_token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Ignore localStorage access issues
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || `Request failed with status ${response.status}`;
      return {
        success: false,
        status: response.status,
        error: errorMsg,
        data: null
      };
    }

    return {
      success: true,
      status: response.status,
      data
    };
  } catch (err) {
    return {
      success: false,
      status: 0,
      error: err.message || 'Network error or server unreachable',
      data: null
    };
  }
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),

  // Trip API Methods
  createTrip: (tripData) => request('trips', { method: 'POST', body: JSON.stringify(tripData) }),
  getUserTrips: () => request('trips', { method: 'GET' }),
  getTripById: (id) => request(`trips/${id}`, { method: 'GET' }),
  updateTrip: (id, tripData) => request(`trips/${id}`, { method: 'PUT', body: JSON.stringify(tripData) }),
  deleteTrip: (id) => request(`trips/${id}`, { method: 'DELETE' }),

  // Auth API Methods
  login: (credentials) => request('auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  signup: (userData) => request('auth/signup', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => request('auth/me', { method: 'GET' }),

  /**
   * Health check query
   */
  checkHealth: async () => {
    return await request('health', { method: 'GET' });
  },

  getBaseUrl: () => API_BASE_URL
};

export default apiClient;
