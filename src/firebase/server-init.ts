// IMPORTANT: This file is for server-side Firebase initialization only.
// It should not be imported into any client-side code.

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const firestore = getFirestore(app);

/**
 * Initializes and returns Firebase services for server-side use.
 * Ensures that initialization happens only once.
 */
export function initializeServerSideFirebase() {
  return {
    firebaseApp: app,
    auth: auth,
    firestore: firestore,
  };
}
