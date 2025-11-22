
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase/provider';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    isSignInWithEmailLink,
    signInWithEmailLink,
    Auth,
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { LoaderCircle, CheckCircle, Dumbbell, Archive, LineChart, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';


function LoginClientContent() {
    const t = useTranslations('LoginPage');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingLink, setIsCheckingLink] = useState(true);
    const [emailSent, setEmailSent] = useState(false);
    const [signInError, setSignInError] = useState<string | null>(null);
    const [promptForEmail, setPromptForEmail] = useState(false);
    
    const auth = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();

    useEffect(() => {
        if (!isUserLoading && user && !user.isAnonymous) {
            router.push('/dashboard');
        }
    }, [user, isUserLoading, router]);

    const handleSignInWithLink = useCallback(async (authInstance: Auth, emailForSignIn: string) => {
        setIsCheckingLink(true);
        setSignInError(null);
        setPromptForEmail(false);
        const link = window.location.href;

        try {
            // The simplest, most robust flow: sign in directly.
            // This will create a new user or sign in an existing one.
            // If an anonymous user was active, their session is replaced by this new permanent one.
            await signInWithEmailLink(authInstance, emailForSignIn, link);
            toast({
                title: t('signInSuccessToast'),
                description: t('signInSuccessToastDescription'),
            });
            window.localStorage.removeItem('emailForSignIn');
            router.push('/dashboard');
        } catch (error: any) {
            console.error('Sign-in error:', error);
            // This is the generic error message if the link is bad or expired.
            setSignInError(t('invalidLinkError'));
            setPromptForEmail(true); // Fallback to asking for email if any step fails.
        } finally {
            setIsCheckingLink(false);
        }
    }, [router, toast, t]);


    useEffect(() => {
        if (!auth || isUserLoading) return;
    
        const href = window.location.href;
    
        if (isSignInWithEmailLink(auth, href)) {
            let emailFromStorage = window.localStorage.getItem('emailForSignIn');
    
            if (emailFromStorage) {
                handleSignInWithLink(auth, emailFromStorage);
            } else {
                // If email is not in storage, prompt the user to enter it.
                // This is the robust fallback for cross-device sign-in.
                setPromptForEmail(true);
                setIsCheckingLink(false);
            }
        } else {
            setIsCheckingLink(false);
        }
    }, [auth, isUserLoading, handleSignInWithLink]);


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setSignInError(null);
        
        if (!auth) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: t('authError'),
            });
            setIsLoading(false);
            return;
        }

        try {
            // === SEND VIA BREVO (CLOUD FUNCTION) ===
            const functions = getFunctions();
            const sendMagicLink = httpsCallable(functions, 'sendMagicLink');

            await sendMagicLink({ email: email });
            window.localStorage.setItem('emailForSignIn', email);
            setEmailSent(true);
            toast({
                title: t('linkSentToast'),
                description: t('linkSentToastDescription'),
            });
        } catch (error: any) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || t('sendLinkError'),
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmEmailAndSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (auth && email) {
            handleSignInWithLink(auth, email);
        }
    };

    if (isCheckingLink || isUserLoading || (user && !user.isAnonymous)) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">{t('verifying')}</p>
            </div>
        );
    }
    
    if (promptForEmail) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-background p-4">
                 <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle>{t('confirmEmailTitle')}</CardTitle>
                        <CardDescription>{t('confirmEmailDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <form onSubmit={handleConfirmEmailAndSignIn} className="space-y-4">
                            {signInError && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>{t('confirmEmailFailedTitle')}</AlertTitle>
                                    <AlertDescription>{signInError}</AlertDescription>
                                </Alert>
                            )}
                            <Input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? <LoaderCircle className="animate-spin" /> : t('confirmEmailSignInButton')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
             </div>
        )
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-4">
            <div className="grid lg:grid-cols-2 max-w-4xl w-full gap-16 items-center">
                 <div className="flex-col items-center lg:items-start text-center lg:text-left hidden lg:flex">
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
                        <CardDescription>{t('formDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {emailSent ? (
                            <div className="text-center text-green-500 flex flex-col items-center gap-4">
                                <CheckCircle className="h-16 w-16" />
                                <p className="font-semibold">{t('emailSentTitle')}</p>
                                <p className="text-sm text-muted-foreground">{t('emailSentDescription', { email: <span className="font-bold">{email}</span> })}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-4">
                                {signInError && (
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>{t('confirmEmailFailedTitle')}</AlertTitle>
                                        <AlertDescription>{signInError}</AlertDescription>
                                    </Alert>
                                )}
                                <Input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? <LoaderCircle className="animate-spin" /> : t('sendLinkButton')}
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
    )
}
