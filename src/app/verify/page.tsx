'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { LoaderCircle } from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    const href = window.location.href;
    const email = window.localStorage.getItem('emailForSignIn');

    if (!email || !isSignInWithEmailLink(auth, href)) {
      router.push('/login?error=invalid');
      return;
    }

    signInWithEmailLink(auth, email, href)
      .then(() => {
        window.localStorage.removeItem('emailForSignIn');
        router.push('/dashboard');
      })
      .catch((err) => {
        console.error(err);
        router.push('/login?error=expired');
      });
  }, [auth, router]);

  return (
    <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-black p-3 rounded-lg shadow-lg border">
      <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
      <span className="text-sm font-medium">Connexion magique en cours...</span>
    </div>
  );
}