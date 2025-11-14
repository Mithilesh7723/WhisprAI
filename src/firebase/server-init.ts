// IMPORTANT: This file is for server-side Firebase initialization only.
// It should not be imported into any client-side code.

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Initializes and returns Firebase services for server-side use.
 * Ensures that initialization happens only once.
 */
export function initializeServerSideFirebase() {
  // Check if any app is initialized. If not, initialize one.
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    return {
      firebaseApp,
      auth: getAuth(firebaseApp),
      firestore: getFirestore(firebaseApp)
    };
  } else {
    // If an app is already initialized, get it and return the services.
    const firebaseApp = getApp();
    return {
      firebaseApp,
      auth: getAuth(firebaseApp),
      firestore: getFirestore(firebaseApp)
    };
  }
}
