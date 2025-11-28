
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { LoaderCircle, CheckCircle, Dumbbell, Archive, LineChart, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import { signInWithCustomToken } from 'firebase/auth';

function LoginClientContent({ t }: { t: any }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState<string | null>(null);

  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && user && !user.isAnonymous) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed to send code');
      toast({ title: t('linkSentToast'), description: t('linkSentToastDescription') });
      setStep('code');
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('sendLinkError'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('The code must be 6 digits long.');
      return;
    }
    if (!auth) {
        setError(t('authError'));
        return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      await signInWithCustomToken(auth, data.token);

      toast({ title: t('signInSuccessToast'), description: t('signInSuccessToastDescription') });
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('invalidLinkError'));
    } finally {
      setIsVerifying(false);
    }
  };

   if (isUserLoading || (user && !user.isAnonymous)) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">{t('verifying')}</p>
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
          <h1 className="text-3xl font-bold tracking-tight font-headline md:text-4xl mt-4">{t('featureTitle')}</h1>
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
                  onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                  required
                  disabled={isLoading}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <LoaderCircle className="animate-spin" /> : t('sendLinkButton')}
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
                  onChange={(e) => setCode(e.target.value)}
                  required
                  disabled={isVerifying}
                />
                <Button type="submit" className="w-full" disabled={isVerifying}>
                  {isVerifying ? <LoaderCircle className="animate-spin" /> : t('confirmEmailSignInButton')}
                </Button>
                 <Button variant="link" size="sm" onClick={() => setStep('email')} className="w-full">
                    Use a different email
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
      <LoginClientContent t={t} />
    </Suspense>
  );
}
