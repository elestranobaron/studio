
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@/firebase/provider';
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, linkWithCredential, EmailAuthProvider } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, CheckCircle, Dumbbell, Archive, LineChart } from 'lucide-react';
import { Logo } from '@/components/icons';

const actionCodeSettings = {
    url: typeof window !== 'undefined' ? `${window.location.origin}/login` : '',
    handleCodeInApp: true,
};


function LoginClientContent() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingLink, setIsCheckingLink] = useState(true);
    const [emailSent, setEmailSent] = useState(false);
    const auth = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const { user, isUserLoading } = useUser();

    
    useEffect(() => {
        if (!isUserLoading && user && !user.isAnonymous) {
            router.push('/dashboard');
        }
    }, [user, isUserLoading, router]);
    
    
    useEffect(() => {
        if (!auth || isUserLoading) return;

        const href = window.location.href;
        if (isSignInWithEmailLink(auth, href)) {
            let emailFromStorage = window.localStorage.getItem('emailForSignIn');
            
            if (!emailFromStorage) {
                toast({
                    variant: 'destructive',
                    title: 'Session Invalide',
                    description: "Pour des raisons de sécurité, veuillez cliquer sur le lien de connexion dans le même navigateur où vous avez fait la demande.",
                });
                setIsCheckingLink(false);
                return;
            }

            if (auth.currentUser && auth.currentUser.isAnonymous) {
                const credential = EmailAuthProvider.credentialWithLink(emailFromStorage, href);
                linkWithCredential(auth.currentUser, credential)
                    .then(() => {
                        window.localStorage.removeItem('emailForSignIn');
                        toast({
                            title: 'Account Updated!',
                            description: 'Your account is now permanent. Your WODs are saved!',
                        });
                        router.push('/dashboard');
                    })
                    .catch((error) => {
                        if (error.code === 'auth/credential-already-in-use') {
                            auth.signOut().then(() => {
                                signInWithEmailLink(auth, emailFromStorage!, href).then(() => {
                                     window.localStorage.removeItem('emailForSignIn');
                                     router.push('/dashboard');
                                }).catch(() => {
                                     toast({
                                        variant: 'destructive',
                                        title: 'Login Error',
                                        description: 'The link may be invalid or has expired.',
                                    });
                                    setIsCheckingLink(false);
                                });
                            });
                        } else {
                            toast({
                                variant: 'destructive',
                                title: 'Login Error',
                                description: error.message || 'Could not link account.',
                            });
                            setIsCheckingLink(false);
                        }
                    });
            } else {
                signInWithEmailLink(auth, emailFromStorage, href)
                    .then(() => {
                        window.localStorage.removeItem('emailForSignIn');
                        toast({
                            title: 'Login Successful!',
                            description: 'You are now signed in.',
                        });
                        router.push('/dashboard');
                    })
                    .catch(() => {
                        toast({
                            variant: 'destructive',
                            title: 'Login Error',
                            description: 'The link may be invalid or has expired.',
                        });
                        setIsCheckingLink(false);
                    });
            }
        } else {
            setIsCheckingLink(false);
        }
    }, [auth, isUserLoading, router, toast]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        if(!auth) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: "Authentication service is not ready.",
            });
            setIsLoading(false);
            return;
        }

        try {
            auth.languageCode = navigator.language.split('-')[0] || 'en';
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            setEmailSent(true);
            toast({
                title: 'Link Sent!',
                description: 'Check your inbox to sign in.',
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

    if (isCheckingLink || isUserLoading || (user && !user.isAnonymous)) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Verifying...</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-4">
            <div className="grid lg:grid-cols-2 max-w-4xl w-full gap-16 items-center">
                 <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
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
