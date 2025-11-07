'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (getApps().length) {
    const app = getApp();
    return {
      firebaseApp: app,
      auth: getAuth(app),
      firestore: getFirestore(app)
    };
  }

  // This check is important! It validates that the config object is populated.
  // It's not enough to just check for the existence of the object, we need to check the keys.
  const isConfigured = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId;

  if (!isConfigured) {
    // We are NOT throwing an error here. We are returning null services.
    // A warning will be logged by the provider.
    // This allows the app to load without crashing, even if Firebase is not configured.
    return { firebaseApp: null, auth: null, firestore: null };
  }

  const app = initializeApp(firebaseConfig);
  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';