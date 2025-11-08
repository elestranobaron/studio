
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase/provider';
import { 
    sendSignInLinkToEmail, 
    isSignInWithEmailLink, 
    signInWithEmailLink, 
    Auth, 
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, CheckCircle, Dumbbell, Archive, LineChart, AlertTriangle } from 'lucide-react';
import { Logo } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


// This is defined outside the component to ensure it's stable.
const getActionCodeSettings = () => ({
    // Use the origin and pathname to build a clean URL without any existing query params.
    url: typeof window !== 'undefined' ? `${window.location.origin}/login` : '',
    handleCodeInApp: true,
});

function LoginClientContent() {
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
                title: 'Login Successful!',
                description: 'You are now signed in.',
            });
            window.localStorage.removeItem('emailForSignIn');
            router.push('/dashboard');
        } catch (error: any) {
            console.error('Sign-in error:', error);
            // This is the generic error message if the link is bad or expired.
            setSignInError('The sign-in link is invalid, has expired, or the email is incorrect. Please request a new one.');
            setPromptForEmail(true); // Fallback to asking for email if any step fails.
        } finally {
            setIsCheckingLink(false);
        }
    }, [router, toast]);


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
                description: "Authentication service is not ready.",
            });
            setIsLoading(false);
            return;
        }

        try {
            const actionCodeSettings = getActionCodeSettings();
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            setEmailSent(true);
            toast({
                title: 'Link Sent!',
                description: 'Check your inbox for a sign-in link. If you do not see it, please check your spam folder.',
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: "We couldn't send the link. Please try again.",
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
                <p className="text-muted-foreground">Verifying...</p>
            </div>
        );
    }
    
    if (promptForEmail) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-background p-4">
                 <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle>Confirm Email</CardTitle>
                        <CardDescription>To complete sign-in on this device, please provide the email address where you received the link.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <form onSubmit={handleConfirmEmailAndSignIn} className="space-y-4">
                            {signInError && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Login Failed</AlertTitle>
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
                                {isLoading ? <LoaderCircle className="animate-spin" /> : 'Sign In'}
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
                    <Logo />
                    <h1 className="text-3xl font-bold tracking-tight font-headline md:text-4xl mt-4">Take it to the next level.</h1>
                    <p className="text-muted-foreground mt-2">Create a free account to unlock all features and never lose a WOD again.</p>
                    <div className="space-y-4 mt-8 text-left">
                        <div className="flex items-start gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Dumbbell className="h-5 w-5"/>
                            </div>
                            <div>
                                <h3 className="font-semibold">Manual Creation</h3>
                                <p className="text-sm text-muted-foreground">Add your own WODs without needing a photo.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Archive className="h-5 w-5"/>
                            </div>
                            <div>
                                <h3 className="font-semibold">Full History</h3>
                                <p className="text-sm text-muted-foreground">Save and find all your workouts at any time.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                           <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <LineChart className="h-5 w-5"/>
                            </div>
                            <div>
                                <h3 className="font-semibold">Performance Tracking (Soon!)</h3>
                                <p className="text-sm text-muted-foreground">Analyze your progress and visualize your performance.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>Login / Sign Up</CardTitle>
                        <CardDescription>Enter your email to receive a secure sign-in link. No password required.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {emailSent ? (
                            <div className="text-center text-green-500 flex flex-col items-center gap-4">
                                <CheckCircle className="h-16 w-16" />
                                <p className="font-semibold">Check your email!</p>
                                <p className="text-sm text-muted-foreground">A link to sign in has been sent to <span className="font-bold">{email}</span>.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-4">
                                {signInError && (
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Login Failed</AlertTitle>
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
                                    {isLoading ? <LoaderCircle className="animate-spin" /> : 'Send Magic Link'}
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
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading...</p>
            </div>
        }>
            <LoginClientContent />
        </Suspense>
    )
}

    