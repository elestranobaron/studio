
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@/firebase/provider';
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, linkWithCredential, EmailAuthProvider, Auth, signOut } from 'firebase/auth';
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
    const { user, isUserLoading } = useUser();

    
    useEffect(() => {
        if (!isUserLoading && user && !user.isAnonymous) {
            router.push('/dashboard');
        }
    }, [user, isUserLoading, router]);
    
    
    const handleSignInWithLink = useCallback(async (authInstance: Auth, emailForSignIn: string, link: string) => {
        setIsCheckingLink(true);
        try {
            // Case 1: An anonymous user is trying to upgrade/sign in.
            if (authInstance.currentUser && authInstance.currentUser.isAnonymous) {
                const credential = EmailAuthProvider.credentialWithLink(emailForSignIn, link);
                try {
                    // Try to link the anonymous account with the email credential.
                    await linkWithCredential(authInstance.currentUser, credential);
                    toast({
                        title: 'Account Updated!',
                        description: 'Your account is now permanent. Your WODs are saved!',
                    });
                } catch (error: any) {
                    // This is the critical case: the email is already in use by another account.
                    if (error.code === 'auth/credential-already-in-use') {
                        // Sign out the anonymous user first.
                        await signOut(authInstance);
                        // Then, sign in the permanent user with the same link.
                        await signInWithEmailLink(authInstance, emailForSignIn, link);
                        toast({
                            title: 'Login Successful!',
                            description: 'Welcome back!',
                        });
                    } else {
                        // For other linking errors, show a generic message.
                        throw error;
                    }
                }
            } else {
                // Case 2: Standard sign-in for a new or returning user (not anonymous).
                await signInWithEmailLink(authInstance, emailForSignIn, link);
                toast({
                    title: 'Login Successful!',
                    description: 'You are now signed in.',
                });
            }
            
            // On success, clean up and redirect.
            window.localStorage.removeItem('emailForSignIn');
            router.push('/dashboard');

        } catch (error: any) {
            console.error('Sign-in error:', error);
            toast({
                variant: 'destructive',
                title: 'Login Error',
                description: 'The link may be invalid or has expired. Please try again.',
            });
        } finally {
            setIsCheckingLink(false);
        }
    }, [router, toast]);


    useEffect(() => {
        if (!auth || isUserLoading) return;

        const href = window.location.href;
        if (isSignInWithEmailLink(auth, href)) {
            let emailFromStorage = window.localStorage.getItem('emailForSignIn');
            
            if (!emailFromStorage) {
                // Do not show an error. Silently allow the flow to proceed.
                // The user might be on a different device.
                // Firebase can handle this if the link is valid.
                // We let handleSignInWithLink do its job.
                // If it fails, it will show a generic "invalid link" error, which is correct.
            }
            
            // We need an email to proceed. If it's not in storage, we can't do anything.
            // A more advanced flow could ask the user for their email again.
            // For now, we rely on the link having enough info or local storage.
            const emailToUse = emailFromStorage || new URL(href).searchParams.get('email');

            if (emailToUse) {
                handleSignInWithLink(auth, emailToUse, href);
            } else {
                // This state means we have a sign-in link but no email, which is an invalid state.
                 toast({
                    variant: 'destructive',
                    title: 'Login Incomplete',
                    description: "Your sign-in link is missing information. Please request a new one.",
                });
                setIsCheckingLink(false);
            }

        } else {
            setIsCheckingLink(false);
        }
    }, [auth, isUserLoading, handleSignInWithLink]);


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
