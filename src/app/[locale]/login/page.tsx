
'use client';
import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { LoaderCircle, AlertTriangle, Dumbbell, Archive, LineChart, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import Turnstile from '@/components/turnstile';
import Link from 'next/link';

function LoginClientContent() {
  const t = useTranslations('LoginPage');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  
  // Ref to track the last code we tried to verify automatically to prevent loops
  const lastVerifiedCode = useRef('');

  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const isNewUser = searchParams.get('new') === 'true';
    if (isNewUser) {
        sessionStorage.setItem('isNewUser', 'true');
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

    if (!turnstileToken) {
        setError("Captcha validation is required.");
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const sendDigicode = httpsCallable(functions, 'sendDigicode');
      await sendDigicode({ email: currentEmail, turnstileToken });

      setEmail(currentEmail);
      setStep('code');
      toast({
        title: t('linkSentToast'),
        description: t.rich('emailSentDescription', {
          bold: (chunks) => <strong>{chunks}</strong>,
          email: currentEmail
        }),
      });
    } catch (err: any) {
      console.error('sendDigicode error:', err);
      setError(err.message || "Could not send code. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Could not send code. Please try again.",
      })
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6 || !/^\d+$/.test(code) || isVerifying) {
      return;
    }

    setIsVerifying(true);
    setError(null);
    lastVerifiedCode.current = code;

    try {
      const functions = getFunctions();
      const verifyDigicode = httpsCallable(functions, 'verifyDigicode');
      const result = await verifyDigicode({ email: email.trim().toLowerCase(), code });

      const data = result.data as { token?: string, isNewUser?: boolean };
      if (!data.token) {
        throw new Error('Missing authentication token in response.');
      }
      
      if(data.isNewUser){
          sessionStorage.setItem('isNewUser', 'true');
      }

      await signInWithCustomToken(auth!, data.token);
      // Success toast removed to avoid UI obstruction. Feedback provided by sidebar status dot.
    } catch (err: any) {
      console.error('Verification error:', err);
      let msg = err.message || 'Could not sign in.';
      if (err.code === 'functions/not-found' || err.code === 'functions/unauthenticated' ) {
          msg = t('invalidLinkError');
      }
      setError(msg);
      toast({ variant: 'destructive', title: t('confirmEmailFailedTitle'), description: msg });
    } finally {
      setIsVerifying(false);
    }
  }, [code, email, auth, t, toast, isVerifying]);

  // Trigger verification automatically when 6 digits are entered
  useEffect(() => {
    if (code.length === 6 && step === 'code' && !isVerifying && code !== lastVerifiedCode.current) {
      handleVerifyCode();
    }
  }, [code, step, isVerifying, handleVerifyCode]);

  const onTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const onTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  if (isUserLoading || (user && !user.isAnonymous)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('verifying')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 left-4 z-20">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToDashboard')}
          </Link>
        </Button>
      </div>

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
                : t.rich('emailSentDescription', {
                    bold: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
                    email
                  })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('confirmEmailFailedTitle')}</AlertTitle>
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
                <div className="flex justify-center">
                    <Turnstile onSuccess={onTurnstileSuccess} onExpire={onTurnstileExpire} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || !turnstileToken}>
                  {isLoading ? <LoaderCircle className="animate-spin mr-2" /> : t('sendLinkButton')}
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
                  onChange={(e) => {
                    const newCode = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(newCode);
                    // Reset verified code ref if user changes the code
                    if (newCode !== lastVerifiedCode.current) {
                      setError(null);
                    }
                  }}
                  maxLength={6}
                  autoFocus
                  disabled={isVerifying}
                />
                <Button type="submit" className="w-full" disabled={isVerifying || code.length !== 6}>
                  {isVerifying ? <LoaderCircle className="animate-spin mr-2" /> : t('confirmEmailSignInButton')}
                </Button>
                <Button variant="link" size="sm" onClick={() => { setStep('email'); setCode(''); lastVerifiedCode.current = ''; }} className="w-full">
                  Use a different email address
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const t = useTranslations('LoginPage');
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('verifying')}</p>
      </div>
    }>
      <LoginClientContent />
    </Suspense>
  );
}
