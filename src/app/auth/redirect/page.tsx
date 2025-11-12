'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ExternalLink, LoaderCircle } from 'lucide-react';
import Image from 'next/image';

function Redirector() {
  const searchParams = useSearchParams();
  const continueUrl = searchParams.get('continueUrl');

  if (!continueUrl) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="text-xl font-bold text-destructive">Lien invalide</h1>
        <p className="text-muted-foreground mt-2">Ce lien de connexion est incorrect ou a expiré. Veuillez en demander un nouveau.</p>
        <Button onClick={() => window.location.href = '/login'} className="mt-4">
          Retour à la page de connexion
        </Button>
      </div>
    );
  }

  const handleOpenInBrowser = () => {
    // This line forces the link to open in the main system browser (Safari/Chrome)
    window.location.href = continueUrl;
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-card p-8 text-center shadow-2xl shadow-primary/10">
            <Image
                src="/icon-512.png"
                alt="WODBurner Logo"
                width={80}
                height={80}
                className="mx-auto mb-6 rounded-2xl"
            />
            <h1 className="text-2xl font-bold font-headline text-primary mb-3">
                Finaliser la connexion
            </h1>
            <p className="text-muted-foreground mb-6">
                Cliquez ci-dessous pour ouvrir l'application et vous connecter en toute sécurité.
            </p>
            <Button
                onClick={handleOpenInBrowser}
                size="lg"
                className="w-full h-14 text-lg"
            >
                <ExternalLink className="mr-3 h-5 w-5" />
                Ouvrir dans le navigateur
            </Button>
            <p className="text-xs text-muted-foreground/80 mt-4">
                Cette étape est nécessaire pour quitter la vue interne de votre application e-mail.
            </p>
        </div>
    </div>
  );
}


export default function RedirectPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Chargement...</p>
            </div>
        }>
            <Redirector />
        </Suspense>
    );
}
