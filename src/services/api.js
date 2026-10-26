/**
 * Dastaan Reusable Frontend API Client
 *
 * Implements robust frontend-to-backend communication:
 *  - Primary and automatic fallback URL resolution (localhost <-> 127.0.0.1 <-> /api)
 *  - Distinguishes connection refused, timeout, CORS, 404, 500, and provider errors
 *  - Never swallows the original exception
 *  - Automatically handles Firebase Bearer tokens and legacy tokens
 *  - Request timeout management via AbortController
 */
import { auth } from '../firebase.js';

const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env ? process.env : {});
const CONFIGURED_BASE_URL = (metaEnv.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

// Dynamic active base URL (with automatic failover support between localhost, 127.0.0.1, and Vite /api proxy)
let activeBaseUrl = CONFIGURED_BASE_URL;

/**
 * Builds ordered list of candidate API base URLs to try if primary fails with network error.
 */
function getCandidateBaseUrls() {
  const candidates = [CONFIGURED_BASE_URL];

  if (CONFIGURED_BASE_URL.includes('localhost:5000')) {
    candidates.push(CONFIGURED_BASE_URL.replace('localhost:5000', '127.0.0.1:5000'));
  } else if (CONFIGURED_BASE_URL.includes('127.0.0.1:5000')) {
    candidates.push(CONFIGURED_BASE_URL.replace('127.0.0.1:5000', 'localhost:5000'));
  }

  // Also include relative Vite proxy path in browser environments
  if (typeof window !== 'undefined' && !candidates.includes('/api')) {
    candidates.push('/api');
  }

  return Array.from(new Set(candidates));
}

/**
 * Helper to retrieve the current fresh Firebase ID token.
 */
export async function getAuthToken(forceRefresh = false) {
  try {
    if (auth && auth.currentUser) {
      return await auth.currentUser.getIdToken(forceRefresh);
    }
  } catch (err) {
    console.warn('[API Client] Error retrieving Firebase auth token:', err);
  }
  return null;
}

/**
 * Categorizes HTTP status codes and exceptions into distinct diagnostic error types.
 */
function categorizeError(status, data, err = null, url = '') {
  const serverMsg = (data && typeof data === 'object')
    ? (data.message || (typeof data.error === 'string' ? data.error : null) || data.msg || null)
    : (typeof data === 'string' && data.length < 200 ? data : null);

  if (status === 400 || status === 422) {
    return {
      errorType: 'VALIDATION_ERROR',
      error: serverMsg || 'The request was invalid or could not be processed.'
    };
  }

  if (status === 401) {
    return {
      errorType: 'AUTH_ERROR',
      error: serverMsg || 'Authentication required. Please log in to your account.'
    };
  }

  if (status === 403) {
    return {
      errorType: 'AUTH_ERROR',
      error: serverMsg || 'Access denied. You do not have permission to access this resource.'
    };
  }

  if (status === 404) {
    return {
      errorType: 'NOT_FOUND',
      error: serverMsg || `Resource not found on Dastaan API server (${url || 'endpoint'}).`
    };
  }

  if (status === 429) {
    return {
      errorType: 'RATE_LIMIT',
      error: serverMsg || 'Rate limit reached. Please wait a moment before trying again.'
    };
  }

  if (status === 502 || status === 503 || status === 504) {
    return {
      errorType: 'PROVIDER_ERROR',
      error: serverMsg || `Upstream provider service temporarily unavailable (status ${status}). Please retry in a moment.`
    };
  }

  if (status >= 500) {
    return {
      errorType: 'SERVER_ERROR',
      error: serverMsg || `Internal server error occurred (status ${status}). Please check server logs or database connectivity.`
    };
  }

  // Network / client exceptions (status === 0)
  if (err) {
    if (err.name === 'AbortError' || /timeout/i.test(err.message)) {
      return {
        errorType: 'TIMEOUT',
        error: 'The request to Dastaan API server timed out. Please check your connection and retry.'
      };
    }

    if (err.message && /cors|cross-origin/i.test(err.message)) {
      return {
        errorType: 'CORS_ERROR',
        error: 'Cross-Origin Request blocked (CORS). Please verify backend allowed origins.'
      };
    }

    return {
      errorType: 'CONNECTION_REFUSED',
      error: 'Could not connect to the Dastaan API server. Please ensure the backend is running on port 5000.'
    };
  }

  return {
    errorType: 'HTTP_ERROR',
    error: data?.message || `Request failed with status ${status}.`
  };
}

/**
 * Generic fetch wrapper with JSON parsing, token attachment, timeout, failover, and detailed diagnostics.
 */
async function request(endpoint, options = {}) {
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  const candidateUrls = [activeBaseUrl, ...getCandidateBaseUrls().filter(u => u !== activeBaseUrl)];

  // Automatically attach fresh Firebase ID token if user is authenticated
  const fbToken = options.token || (await getAuthToken());

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(fbToken ? { 'Authorization': `Bearer ${fbToken}` } : {})
  };

  // Fallback to legacy bearer token only if no Firebase token is available
  if (!fbToken) {
    try {
      const legacyToken = localStorage.getItem('dastaan_token');
      if (legacyToken) {
        defaultHeaders['Authorization'] = `Bearer ${legacyToken}`;
      }
    } catch {
      // Ignore localStorage access issues in restricted contexts
    }
  }
  // Safely stringify object bodies if passed directly
  let requestBody = options.body;
  if (requestBody && typeof requestBody === 'object' && !(requestBody instanceof FormData) && !(requestBody instanceof Blob)) {
    try {
      requestBody = JSON.stringify(requestBody);
    } catch (serializeErr) {
      console.warn('[API Client] Body serialization failed:', serializeErr);
    }
  }

  const timeoutMs = options.timeoutMs || 25000;
  let lastError = null;
  let attemptedUrls = [];

  for (let i = 0; i < candidateUrls.length; i++) {
    const baseUrl = candidateUrls[i];
    const fullUrl = `${baseUrl.replace(/\/+$/, '')}/${cleanEndpoint}`;
    attemptedUrls.push(fullUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const config = {
      ...options,
      body: requestBody,
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      signal: controller.signal
    };

    try {
      const response = await fetch(fullUrl, config);
      clearTimeout(timer);

      // On successful connection, remember this working base URL for subsequent calls
      if (activeBaseUrl !== baseUrl) {
        activeBaseUrl = baseUrl;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const { errorType, error: errorMsg } = categorizeError(response.status, data, null, fullUrl);

        if (metaEnv.DEV) {
          console.warn(`[API Client] [${errorType}] ${config.method || 'GET'} ${fullUrl} (HTTP ${response.status}):`, errorMsg);
        }

        return {
          success: false,
          status: response.status,
          errorType,
          error: errorMsg,
          data: data || null,
          url: fullUrl
        };
      }

      return {
        success: true,
        status: response.status,
        data,
        url: fullUrl
      };

    } catch (err) {
      clearTimeout(timer);
      lastError = err;

      // If the error is an AbortError (timeout), do not retry secondary URLs
      if (err.name === 'AbortError') {
        break;
      }

      // If there are more candidate URLs to try for a network/refused error, continue to next candidate
      if (i < candidateUrls.length - 1) {
        continue;
      }
    }
  }

  // All URL candidates failed
  const { errorType, error: errorMsg } = categorizeError(0, null, lastError, attemptedUrls[0]);

  if (metaEnv.DEV) {
    console.warn(`[API Client] [${errorType}] All attempted URLs failed:`, attemptedUrls, lastError?.message);
  }

  return {
    success: false,
    status: 0,
    errorType,
    error: errorMsg,
    originalError: lastError,
    attemptedUrls,
    data: null
  };
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),

  // Trip API Methods
  createTrip: (tripData) => request('trips', { method: 'POST', body: tripData }),
  previewTrip: (tripData) => request('trips/preview', { method: 'POST', body: tripData }),
  recalculateItinerary: (payload) => request('trips/recalculate', { method: 'POST', body: payload }),
  getUserTrips: () => request('trips', { method: 'GET' }),
  getTripById: (id) => request(`trips/${id}`, { method: 'GET' }),
  updateTrip: (id, tripData) => request(`trips/${id}`, { method: 'PUT', body: tripData }),
  deleteTrip: (id) => request(`trips/${id}`, { method: 'DELETE' }),

  // Dynamic Travel Data & Discovery Methods
  searchDestinations: (query) => request(`destinations/search?q=${encodeURIComponent(query || '')}`, { method: 'GET' }),
  getPopularDestinations: () => request('destinations/popular', { method: 'GET' }),
  getAttractionPhoto: (attraction, destination, lat, lng) => {
    let q = `destinations/attraction-photo?attraction=${encodeURIComponent(attraction || '')}`;
    if (destination) q += `&destination=${encodeURIComponent(destination)}`;
    if (lat && lng) q += `&lat=${lat}&lng=${lng}`;
    return request(q, { method: 'GET' });
  },
  getDestinationPlaces: (destination, category = 'all', lat, lng) => {
    let q = `destinations/places?destination=${encodeURIComponent(destination || '')}&category=${encodeURIComponent(category)}`;
    if (lat && lng) q += `&lat=${lat}&lng=${lng}`;
    return request(q, { method: 'GET' });
  },
  getWeather: ({ latitude, longitude, destination }) => {
    let q = 'weather?';
    const params = [];
    if (latitude !== undefined && latitude !== null) params.push(`latitude=${latitude}`);
    if (longitude !== undefined && longitude !== null) params.push(`longitude=${longitude}`);
    if (destination) params.push(`destination=${encodeURIComponent(destination)}`);
    return request(q + params.join('&'), { method: 'GET' });
  },

  // Real-world Routing Methods (Stage 2)
  calculateRoute: ({ waypoints, mode = 'driving' }) => request('routing/calculate', { method: 'POST', body: { waypoints, mode } }),

  // Conversational AI Assistant API Method
  sendAssistantMessage: (payload) => request('assistant/chat', { method: 'POST', body: payload, timeoutMs: 35000 }),

  // Saved Destination API Methods
  getSavedDestinations: () => request('destinations/saved', { method: 'GET' }),
  saveDestination: (destination) => request('destinations/save', { method: 'POST', body: destination }),
  removeSavedDestination: (destinationId) => request(`destinations/${encodeURIComponent(destinationId)}`, { method: 'DELETE' }),

  // Auth & Profile API Methods
  login: (credentials) => request('auth/login', { method: 'POST', body: credentials }),
  signup: (userData) => request('auth/signup', { method: 'POST', body: userData }),
  getMe: (token) => request('auth/me', { method: 'GET', token }),
  createProfile: (profileData, token) => request('auth/profile', { method: 'POST', body: profileData, token }),
  updateProfile: (updateData, token) => request('auth/profile', { method: 'PATCH', body: updateData, token }),

  /**
   * Health check queries
   */
  checkHealth: async () => request('health', { method: 'GET' }),
  checkRootHealth: async () => request('../health', { method: 'GET' }),

  getBaseUrl: () => activeBaseUrl,
  setBaseUrl: (url) => {
    if (url && typeof url === 'string') {
      activeBaseUrl = url.replace(/\/+$/, '');
    }
  }
};

export default apiClient;
