import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';

const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env ? process.env : {});

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || 'dastaan-32c4e.firebaseapp.com',
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || 'dastaan-32c4e',
  appId: metaEnv.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.appId &&
  !firebaseConfig.apiKey.startsWith('replace_with_') &&
  !firebaseConfig.apiKey.startsWith('your_') &&
  !firebaseConfig.appId.startsWith('replace_with_') &&
  !firebaseConfig.appId.startsWith('your_')
);

export const firebaseConfigError = !isFirebaseConfigured
  ? 'Firebase Web configuration is missing or still contains example values.'
  : '';

// Singleton initialization to prevent duplicate Firebase apps in Vite HMR.
// Never initialize Auth with the example/missing config: it throws before React can render.
const app = isFirebaseConfigured
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  : null;

export const auth = app ? getAuth(app) : null;

export const googleProvider = app ? new GoogleAuthProvider() : null;
googleProvider?.setCustomParameters({ prompt: 'select_account' });

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
};

export default app;
