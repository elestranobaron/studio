// src/app/auth/redirect/page.tsx
'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function Redirector() {
  const searchParams = useSearchParams();
  const continueUrl = searchParams.get('continueUrl');

  useEffect(() => {
    if (continueUrl) {
      // Attempt to redirect automatically
      const timeoutId = setTimeout(() => {
        window.location.href = continueUrl;
      }, 500);

      // Clean up the timeout if the component unmounts
      return () => clearTimeout(timeoutId);
    }
  }, [continueUrl]);

  const handleManualRedirect = () => {
    if (continueUrl) {
      window.location.href = continueUrl;
    }
  };

  if (!continueUrl) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center p-4">
            <h1 className="text-xl font-bold text-destructive">Invalid Link</h1>
            <p className="text-muted-foreground">The redirection link is missing or corrupted. Please request a new sign-in link.</p>
            <Button onClick={() => window.location.href = '/login'}>Back to Login</Button>
        </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center p-4">
      <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      <h1 className="text-2xl font-bold">Redirecting you securely...</h1>
      <p className="text-muted-foreground">Please wait while we open the WODBurner app.</p>
      <Button onClick={handleManualRedirect} variant="outline" className="mt-4">
        Click here if you are not redirected
      </Button>
    </div>
  );
}

export default function RedirectPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading...</p>
            </div>
        }>
            <Redirector />
        </Suspense>
    );
}
