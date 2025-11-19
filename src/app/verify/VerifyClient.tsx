'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { LoaderCircle } from 'lucide-react';

export default function VerifyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = getAuth();

  useEffect(() => {
    const href = window.location.href;

    if (!isSignInWithEmailLink(auth, href)) {
      router.replace('/login?error=invalid_link');
      return;
    }

    let email = searchParams.get('email');

    if (!email) {
      const stored = window.localStorage.getItem('emailForSignIn');
      if (stored) email = stored;
    }

    if (!email) {
      router.replace('/login?error=no_email');
      return;
    }

    signInWithEmailLink(auth, email, href)
      .then(() => {
        window.localStorage.removeItem('emailForSignIn');
        router.replace('/dashboard');
      })
      .catch((error) => {
        console.error('signInWithEmailLink failed:', error);
        router.replace('/login?error=expired_or_invalid');
      });
  }, [auth, router, searchParams]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <LoaderCircle className="h-16 w-16 animate-spin text-primary" />
        <p className="text-lg font-medium">Magic sign-in in progress...</p>
      </div>
    </div>
  );
}
