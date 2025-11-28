
// src/firebase/provider.tsx
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState } from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, Auth, User as FirebaseAuthUser } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, Firestore } from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { firebaseConfig } from './config';

export type AppUser = FirebaseAuthUser & {
  premium?: boolean;
  [key: string]: any;
};

export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  const services = useMemo(() => {
    const isConfigured = firebaseConfig && firebaseConfig.apiKey;
    if (!isConfigured) {
      console.warn("Firebase config is missing or incomplete. App will run without Firebase services.");
      return { app: null, auth: null, firestore: null };
    }
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    return { app, auth: getAuth(app), firestore: getFirestore(app) };
  }, []);

  const { app, auth, firestore } = services;

  useEffect(() => {
    if (!auth || !firestore) {
        setIsUserLoading(false);
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          const userDocRef = doc(firestore, 'users', firebaseUser.uid);
          const unsubscribeFirestore = onSnapshot(
            userDocRef,
            (docSnapshot) => {
              if (docSnapshot.exists()) {
                const firestoreData = docSnapshot.data();
                setUser({
                  ...firebaseUser,
                  ...firestoreData,
                } as AppUser);
              } else {
                setUser(firebaseUser as AppUser);
              }
              setIsUserLoading(false);
            },
            (error) => {
              console.error("Firestore error:", error);
              setUser(firebaseUser as AppUser);
              setIsUserLoading(false);
            }
          );

          return unsubscribeFirestore;
        } else {
          setUser(null);
          setIsUserLoading(false);
        }
      },
      (error) => {
        console.error("Auth error:", error);
        setUser(null);
        setIsUserLoading(false);
        setUserError(error);
      }
    );

    return () => unsubscribeAuth();
  }, [auth, firestore]); 

  const contextValue = useMemo(
    (): FirebaseContextState => ({
      firebaseApp: app,
      firestore,
      auth,
      user,
      isUserLoading,
      userError,
    }),
    [app, firestore, auth, user, isUserLoading, userError]
  );

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebase must be used within FirebaseProvider');
  return context;
};

export const useAuth = () => useFirebase().auth;
export const useUser = () => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
