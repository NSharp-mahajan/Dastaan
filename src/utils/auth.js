/**
 * Dastaan Authentication Utilities
 * Backed by Firebase Authentication (Identity) and MongoDB Atlas (User Profiles).
 */
import {
  auth,
  googleProvider,
  signInWithEmailAndPassword as fbSignIn,
  createUserWithEmailAndPassword as fbCreateUser,
  signInWithPopup,
  signOut as fbSignOut,
  sendEmailVerification as fbSendEmailVerification,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  updateProfile as fbUpdateProfile,
  onAuthStateChanged
} from '../firebase';
import apiClient from '../services/api';

const USER_STORAGE_KEY = 'dastaanUser';

/**
 * Returns the currently cached user profile for instant synchronous UI display.
 * (Source of truth is Firebase Authentication + MongoDB Atlas API).
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Internal helper to update user profile cache in localStorage and notify listeners.
 */
function setCachedUser(user) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem('dastaan_token');
    sessionStorage.removeItem('dastaan_session');
  }
  window.dispatchEvent(new Event('dastaan-auth-change'));
}

/**
 * Backwards compatibility session creator.
 */
export function createSession(user, token = null) {
  setCachedUser(user);
  if (token) {
    localStorage.setItem('dastaan_token', token);
  }
  return user;
}

/**
 * Sign out of Firebase and clear local profile cache.
 */
export async function clearSession() {
  try {
    await fbSignOut(auth);
  } catch {
    // Ignore signOut errors if already offline
  } finally {
    setCachedUser(null);
  }
}

export const logoutUser = clearSession;

/**
 * Sign up a new user with Firebase and initialize their MongoDB profile.
 */
export async function signupWithEmail(email, password, profileDetails = {}) {
  const { name, mobile, travelStyle } = profileDetails;

  // 1. Create user in Firebase Authentication
  const userCredential = await fbCreateUser(auth, email, password);
  const fbUser = userCredential.user;

  // 2. Set Firebase displayName
  if (name) {
    try {
      await fbUpdateProfile(fbUser, { displayName: name });
    } catch (err) {
      console.warn('[Auth] Failed setting Firebase displayName:', err.message);
    }
  }

  // 3. Send email verification (non-blocking)
  try {
    await fbSendEmailVerification(fbUser);
  } catch (err) {
    console.warn('[Auth] Email verification could not be sent immediately:', err.message);
  }

  // 4. Obtain fresh Firebase ID Token
  const idToken = await fbUser.getIdToken(true);

  // 5. Initialize MongoDB Atlas User Profile via Express backend
  const profilePayload = {
    name: name || fbUser.displayName || email.split('@')[0],
    mobile: mobile || null,
    phoneNumber: mobile || null,
    travelStyle: travelStyle || 'Balanced'
  };

  const response = await apiClient.createProfile(profilePayload, idToken);

  let mongoProfile = null;
  if (response.success && response.data?.user) {
    mongoProfile = response.data.user;
  } else {
    // Fallback if backend was temporarily slow, provide safe client object
    mongoProfile = {
      firebaseUid: fbUser.uid,
      name: profilePayload.name,
      email: fbUser.email,
      mobile: profilePayload.mobile,
      travelStyle: profilePayload.travelStyle,
      role: 'user',
      emailVerified: fbUser.emailVerified
    };
  }

  setCachedUser(mongoProfile);
  return { mongoProfile, firebaseUser: fbUser };
}

/**
 * Log in an existing user with email and password, then fetch their MongoDB profile.
 */
export async function loginWithEmail(email, password) {
  // 1. Authenticate with Firebase
  const userCredential = await fbSignIn(auth, email, password);
  const fbUser = userCredential.user;

  // 2. Get fresh Firebase ID Token
  const idToken = await fbUser.getIdToken();

  // 3. Fetch or sync profile from MongoDB Atlas backend
  const response = await apiClient.getMe(idToken);

  let mongoProfile = null;
  if (response.success && response.data?.user) {
    mongoProfile = response.data.user;
  } else {
    mongoProfile = {
      firebaseUid: fbUser.uid,
      name: fbUser.displayName || fbUser.email.split('@')[0],
      email: fbUser.email,
      role: 'user',
      emailVerified: fbUser.emailVerified
    };
  }

  setCachedUser(mongoProfile);
  return { mongoProfile, firebaseUser: fbUser };
}

/**
 * Sign in using Google popup provider, then sync with MongoDB Atlas.
 */
export async function loginWithGoogle() {
  const userCredential = await signInWithPopup(auth, googleProvider);
  const fbUser = userCredential.user;

  const idToken = await fbUser.getIdToken();
  const response = await apiClient.getMe(idToken);

  let mongoProfile = null;
  if (response.success && response.data?.user) {
    mongoProfile = response.data.user;
  } else {
    mongoProfile = {
      firebaseUid: fbUser.uid,
      name: fbUser.displayName || fbUser.email.split('@')[0],
      email: fbUser.email,
      photoURL: fbUser.photoURL,
      role: 'user',
      emailVerified: fbUser.emailVerified
    };
  }

  setCachedUser(mongoProfile);
  return { mongoProfile, firebaseUser: fbUser };
}

/**
 * Send password reset email.
 */
export async function sendPasswordReset(email) {
  return await fbSendPasswordResetEmail(auth, email);
}

/**
 * Resend email verification to current user.
 */
export async function resendVerification() {
  if (auth.currentUser) {
    return await fbSendEmailVerification(auth.currentUser);
  }
  throw new Error('No signed-in user to send verification to');
}

/**
 * Initialize Firebase authentication state listener with automatic token refresh and MongoDB session sync.
 */
export function initAuthListener(onUserChange) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const idToken = await firebaseUser.getIdToken();
        const res = await apiClient.getMe(idToken);
        if (res.success && res.data?.user) {
          setCachedUser(res.data.user);
          if (onUserChange) onUserChange(res.data.user, firebaseUser);
          return;
        }
      } catch (err) {
        console.warn('[Auth] Session sync failed:', err.message);
      }

      // Minimal fallback if backend unreachable
      const fallback = {
        firebaseUid: firebaseUser.uid,
        name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Traveler'),
        email: firebaseUser.email,
        role: 'user',
        emailVerified: firebaseUser.emailVerified
      };
      setCachedUser(fallback);
      if (onUserChange) onUserChange(fallback, firebaseUser);
    } else {
      setCachedUser(null);
      if (onUserChange) onUserChange(null, null);
    }
  });
}

/**
 * Translate Firebase error codes into understandable user-facing messages.
 */
export function getFriendlyAuthErrorMessage(error) {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const code = error.code || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/configuration-not-found':
      return 'Email/Password sign-in is not enabled in Firebase Console. Go to Firebase Console > Authentication > Sign-in method and enable Email/Password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled for this project.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 6 characters.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email address. Please sign up first.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify your credentials and try again.';
    case 'auth/too-many-requests':
      return 'Access temporarily blocked due to too many failed attempts. Please try again in a few minutes or reset your password.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled before completion.';
    case 'auth/popup-blocked':
      return 'The sign-in popup was blocked by your browser. Please allow popups for this site.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}

// Stubs for legacy code compatibility
export async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getUsers() {
  try {
    return JSON.parse(localStorage.getItem('dastaan_users') || '[]');
  } catch {
    return [];
  }
}

export function setUsers(users) {
  localStorage.setItem('dastaan_users', JSON.stringify(users));
}
