'use client';

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth, User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/index';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// Combined state for the Firebase context
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// Props for the provider
interface FirebaseProviderProps {
  children: ReactNode;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  const services = useMemo(() => {
    try {
      return initializeFirebase();
    } catch (e) {
      console.warn("Firebase initialization failed. This may be expected in a development environment if the config is not set. Please update src/firebase/config.ts.", e);
      return { firebaseApp: null, auth: null, firestore: null };
    }
  }, []);

  const { auth } = services;

  useEffect(() => {
    if (!auth) {
      setIsUserLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          setIsUserLoading(false);
        } else {
          // If no user, sign in anonymously. This ensures a user object is always available.
          signInAnonymously(auth).catch((error) => {
            // Handle anonymous sign-in error
            console.error("Anonymous sign-in failed:", error);
            setUser(null);
            setIsUserLoading(false);
            setUserError(error);
          });
        }
      },
      (error) => {
        console.error("Firebase Auth state change error:", error);
        setUser(null);
        setIsUserLoading(false);
        setUserError(error);
      }
    );

    return () => unsubscribe();
  }, [auth]);

  const contextValue = useMemo((): FirebaseContextState => ({
    ...services,
    user,
    isUserLoading,
    userError,
  }), [services, user, isUserLoading, userError]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};


export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};


export const useAuth = (): Auth | null => {
  const { auth } = useFirebase();
  return auth;
};


export const useUser = (): { user: User | null; isUserLoading: boolean; userError: Error | null } => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};