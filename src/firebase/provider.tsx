// src/firebase/provider.tsx
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState } from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, Auth, User as FirebaseAuthUser } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, Firestore } from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// ON INITIALISE UNE SEULE FOIS, CÔTÉ CLIENT
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth: Auth = getAuth(app);
const firestore: Firestore = getFirestore(app);

export type AppUser = FirebaseAuthUser & {
  premium?: boolean;
  [key: string]: any;
};

export interface FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  useEffect(() => {
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
  }, []); // plus de dépendances → tout est global

  const contextValue = useMemo(
    (): FirebaseContextState => ({
      firebaseApp: app,
      firestore,
      auth,
      user,
      isUserLoading,
      userError,
    }),
    [user, isUserLoading, userError]
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