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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const requiredConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId
];
export const firebaseConfigError = requiredConfig.some(value =>
  !value || value.startsWith('your_') || value.startsWith('replace_with_')
)
  ? 'Firebase Web configuration is missing or still contains example values.'
  : '';

// Singleton initialization to prevent duplicate Firebase apps in Vite HMR.
// Never initialize Auth with the example/missing config: it throws before React can render.
const app = firebaseConfigError
  ? null
  : getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
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
