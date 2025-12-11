
'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { LoaderCircle, AlertTriangle, Dumbbell, Archive, LineChart } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';

function LoginClientContent() {
  const t = useTranslations('LoginPage');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState<string | null>(null);

  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const functions = getFunctions();

  useEffect(() => {
    // Handle the new user parameter for redirection
    const isNewUser = searchParams.get('new') === 'true';
    if (isNewUser) {
        sessionStorage.setItem('isNewUser', 'true');
        // Clean the URL
        window.history.replaceState(null, '', '/login');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isUserLoading && user && !user.isAnonymous) {
      const isNewUser = sessionStorage.getItem('isNewUser') === 'true';
      if(isNewUser){
        router.push('/dashboard?tab=community');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, isUserLoading, router]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentEmail = email.trim().toLowerCase();
    if (!currentEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sendDigicode = httpsCallable(functions, 'sendDigicode');
      await sendDigicode({ email: currentEmail });

      setEmail(currentEmail);
      setStep('code');
      toast({
        title: t('linkSentToast') || 'Code envoyé !',
        description: t.rich ? t.rich('emailSentDescription', {
          bold: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
          email: currentEmail
        }) : `Un code a été envoyé à ${currentEmail}`,
      });
    } catch (err: any) {
      console.error('sendDigicode error:', err);
      setError(err.message || 'Impossible d\'envoyer le code. Réessaie.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Le code doit contenir exactement 6 chiffres');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const verifyDigicode = httpsCallable(functions, 'verifyDigicode');
      const result = await verifyDigicode({ email: email.trim().toLowerCase(), code });

      const data = result.data as { token?: string, isNewUser?: boolean };
      if (!data.token) {
        throw new Error('Token manquant dans la réponse');
      }
      
      if(data.isNewUser){
          sessionStorage.setItem('isNewUser', 'true');
      }

      await signInWithCustomToken(auth!, data.token);

      toast({ title: 'Connecté !', description: 'Bienvenue sur WODBurner !' });
      // The useEffect will handle the redirection
    } catch (err: any) {
      console.error('Verification error:', err);

      let msg = 'Erreur inconnue';

      if (err.code === 'not-found' || err.code === 'unauthenticated') {
        msg = 'Code invalide. Demande un nouveau code.';
      } else if (err.code === 'deadline-exceeded') {
        msg = 'Code expiré. Demande un nouveau code.';
      } else if (err.code === 'internal') {
        msg = 'Erreur serveur. Réessaie dans quelques secondes.';
        console.error('INTERNAL ERROR DETAILS:', err.details || err.message);
      } else {
        msg = err.message || 'Impossible de se connecter';
      }

      setError(msg);
      toast({ variant: 'destructive', title: 'Erreur', description: msg });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isUserLoading || (user && !user.isAnonymous)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('verifying') || 'Vérification en cours...'}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <div className="grid lg:grid-cols-2 max-w-4xl w-full gap-16 items-center">
        <div className="flex-col items-center lg:items-start text-center hidden lg:flex">
          <div className="text-3xl font-bold font-headline text-primary tracking-wider">
            WODBurner
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-headline md:text-4xl mt-4">
            {t('featureTitle')}
          </h1>
          <p className="text-muted-foreground mt-2">{t('featureDescription')}</p>
          <div className="space-y-4 mt-8 text-left">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Dumbbell className="h-5 w-5"/>
              </div>
              <div>
                <h3 className="font-semibold">{t('featureManual')}</h3>
                <p className="text-sm text-muted-foreground">{t('featureManualDescription')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Archive className="h-5 w-5"/>
              </div>
              <div>
                <h3 className="font-semibold">{t('featureHistory')}</h3>
                <p className="text-sm text-muted-foreground">{t('featureHistoryDescription')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LineChart className="h-5 w-5"/>
              </div>
              <div>
                <h3 className="font-semibold">{t('featureTracking')}</h3>
                <p className="text-sm text-muted-foreground">{t('featureTrackingDescription')}</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t('formTitle')}</CardTitle>
            <CardDescription>
              {step === 'email'
                ? t('formDescription')
                : t.rich?.('emailSentDescription', {
                    bold: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
                    email
                  }) || `Code envoyé à ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('confirmEmailFailedTitle') || 'Erreur'}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 'email' ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <LoaderCircle className="animate-spin mr-2" /> : t('sendLinkButton') || 'Envoyer le code'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  autoFocus
                  disabled={isVerifying}
                />
                <Button type="submit" className="w-full" disabled={isVerifying}>
                  {isVerifying ? <LoaderCircle className="animate-spin mr-2" /> : t('confirmEmailSignInButton') || 'Se connecter'}
                </Button>
                <Button variant="link" size="sm" onClick={() => { setStep('email'); setCode(''); }} className="w-full">
                  Utiliser une autre adresse e-mail
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage({params: {locale}}: {params: {locale: string}}) {
  // Enable static rendering
  // setRequestLocale(locale); // This would be needed if we used translations here directly. But the logic is in the client component.

  return (
    <Suspense fallback={
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    }>
      <LoginClientContent />
    </Suspense>
  );
}
