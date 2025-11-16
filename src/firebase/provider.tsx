
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth, onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, Firestore, onSnapshot } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/index';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// This combines the Auth user with our custom Firestore data
export type AppUser = FirebaseAuthUser & {
    premium?: boolean;
    // Add other custom fields from your Firestore 'users' document here
};


// CONTEXT
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: AppUser | null; // Use our merged user type
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  const services = useMemo(() => {
    try {
      return initializeFirebase();
    } catch (e) {
      console.warn("Firebase init failed", e);
      return { firebaseApp: null, auth: null, firestore: null };
    }
  }, []);

  const { auth, firestore } = services;

  useEffect(() => {
    if (!auth) {
      setIsUserLoading(false);
      return;
    }

    // This is the main authentication state listener
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          // User is signed in, now listen for Firestore data
          if (!firestore) {
              setUser(firebaseUser as AppUser);
              setIsUserLoading(false);
              return;
          }
          
          const userDocRef = doc(firestore, 'users', firebaseUser.uid);
          
          const unsubscribeFirestore = onSnapshot(userDocRef, (docSnapshot) => {
              if (docSnapshot.exists()) {
                  const firestoreData = docSnapshot.data();
                  // Merge auth data with firestore data
                  setUser({
                      ...firebaseUser,
                      ...firestoreData,
                  } as AppUser);
              } else {
                  // User exists in Auth, but not in Firestore yet.
                  // This can happen briefly during sign-up.
                  setUser(firebaseUser as AppUser);
              }
              setIsUserLoading(false);
          }, (error) => {
              console.error("Firestore error listening to user doc:", error);
              setUser(firebaseUser as AppUser); // Fallback to auth user
              setIsUserLoading(false);
          });

          // Return the firestore unsubscribe function to be called when auth state changes
          return unsubscribeFirestore;

        } else {
          // User is signed out
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
  if (!context) throw new Error('useFirebase must be used within FirebaseProvider');
  return context;
};

export const useAuth = (): Auth | null => {
  const { auth } = useFirebase();
  return auth;
};

export const useUser = (): { user: AppUser | null; isUserLoading: boolean; userError: Error | null } => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
