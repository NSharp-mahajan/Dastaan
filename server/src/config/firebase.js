import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseApp = null;
export let hasServiceAccountCredential = false;

export const initFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'dastaan-32c4e';

  // 1. Try explicit service account JSON string from environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
      hasServiceAccountCredential = true;
      console.log('[Firebase Admin] Authenticated with FIREBASE_SERVICE_ACCOUNT_KEY JSON string');
      return firebaseApp;
    } catch (err) {
      console.warn('[Firebase Admin] Failed parsing FIREBASE_SERVICE_ACCOUNT_KEY:', err.message);
    }
  }

  // 2. Try file path specified in GOOGLE_APPLICATION_CREDENTIALS or standard local paths
  const candidatePaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(process.cwd(), 'server/serviceAccountKey.json'),
    path.resolve(__dirname, '../../serviceAccountKey.json'),
    path.resolve(__dirname, '../serviceAccountKey.json')
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    const resolvedPath = path.resolve(candidatePath);
    if (fs.existsSync(resolvedPath)) {
      try {
        const fileContent = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        firebaseApp = initializeApp({
          credential: cert(fileContent),
          projectId: fileContent.project_id || projectId
        });
        hasServiceAccountCredential = true;
        console.log(`[Firebase Admin] Authenticated with local service account key: ${path.basename(resolvedPath)}`);
        return firebaseApp;
      } catch (err) {
        console.warn(`[Firebase Admin] Failed reading credential file at ${candidatePath}:`, err.message);
      }
    }
  }

  // 3. Fallback: Initialize with Project ID for cryptographic public certificate verification
  firebaseApp = initializeApp({
    projectId
  });
  hasServiceAccountCredential = false;
  console.log(`[Firebase Admin] Initialized with projectId: ${projectId} (Public Certificate Verification mode)`);
  console.log('[Firebase Admin] Note: checkRevoked is disabled in local development without a service account. Token signature, issuer, audience, and expiry are verified cryptographically via Google public certificates.');
  return firebaseApp;
};

// Initialize app upon loading
firebaseApp = initFirebaseAdmin();

export const auth = getAuth(firebaseApp);
export default firebaseApp;
