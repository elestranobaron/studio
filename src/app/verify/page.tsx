// src/app/verify/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { LoaderCircle } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

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

    const functions = getFunctions();
    const verify = httpsCallable(functions, 'verifyMagicLinkAccess');
    const createUser = httpsCallable(functions, 'onUserSignIn'); // ← NOUVEAU

    verify({ email })
      .then((res: any) => {
        if (!res.data.allowed) {
          router.push(`/login?error=${res.data.reason}`);
          return;
        }
        return signInWithEmailLink(auth, email, href);
      })
      .then(async () => {
        window.localStorage.removeItem('emailForSignIn');

        // CRÉE LE DOCUMENT USER APRÈS CONNEXION RÉUSSIE
        try {
          await createUser();
          console.log("Document user créé !");
        } catch (err) {
          console.log("User déjà existant ou erreur :", err);
        }

        router.push('/(app)/community-timer'); // ou /dashboard
      })
      .catch(() => {
        router.push('/login?error=firebase');
      });
  }, [auth, router]);

  return (
    <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-black p-3 rounded-lg shadow-lg border">
      <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
      <span className="text-sm font-medium">Vérification en cours...</span>
    </div>
  );
}