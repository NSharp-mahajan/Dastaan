/**
 * Dastaan Reusable Frontend API Client
 * Compatible with Vite environment variables and Firebase Bearer authentication.
 */
import { auth } from '../firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Helper to retrieve the current fresh Firebase ID token.
 */
export async function getAuthToken(forceRefresh = false) {
  try {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken(forceRefresh);
    }
  } catch (err) {
    console.warn('[API Client] Error getting auth token:', err);
  }
  return null;
}

/**
 * Generic fetch wrapper with JSON parsing, Firebase Bearer token attachment, and standardized error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

  // Automatically attach fresh Firebase ID token if user is authenticated
  const token = options.token || (await getAuthToken());

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
        data: data || null
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
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),

  // Trip API Methods
  createTrip: (tripData) => request('trips', { method: 'POST', body: JSON.stringify(tripData) }),
  getUserTrips: () => request('trips', { method: 'GET' }),
  getTripById: (id) => request(`trips/${id}`, { method: 'GET' }),
  updateTrip: (id, tripData) => request(`trips/${id}`, { method: 'PUT', body: JSON.stringify(tripData) }),
  deleteTrip: (id) => request(`trips/${id}`, { method: 'DELETE' }),

  // Saved Destination API Methods
  getSavedDestinations: () => request('destinations/saved', { method: 'GET' }),
  saveDestination: (destination) => request('destinations/save', { method: 'POST', body: JSON.stringify(destination) }),
  removeSavedDestination: (destinationId) => request(`destinations/${encodeURIComponent(destinationId)}`, { method: 'DELETE' }),

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

  /**
   * Auth API methods
   */
  getMe: async (token) => {
    return await request('auth/me', { method: 'GET', token });
  },

  createProfile: async (profileData, token) => {
    return await request('auth/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
      token
    });
  },

  updateProfile: async (updateData, token) => {
    return await request('auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(updateData),
      token
    });
  },

  getBaseUrl: () => API_BASE_URL
};

export default apiClient;
