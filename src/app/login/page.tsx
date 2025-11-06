
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@/firebase/provider';
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, CheckCircle, Barbell, Archive, LineChart } from 'lucide-react';
import { Logo } from '@/components/icons';

const actionCodeSettings = {
    url: typeof window !== 'undefined' ? `${window.location.origin}/login` : '',
    handleCodeInApp: true,
};

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingLink, setIsCheckingLink] = useState(true);
    const [emailSent, setEmailSent] = useState(false);
    const auth = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const { user } = useUser();

    useEffect(() => {
        if (user) {
            router.push('/dashboard');
        }
    }, [user, router]);
    
    useEffect(() => {
        const href = window.location.href;
        if (isSignInWithEmailLink(auth, href)) {
            let emailFromStorage = window.localStorage.getItem('emailForSignIn');
            if (!emailFromStorage) {
                // If the user opens the link on a different device, they must provide their email.
                emailFromStorage = window.prompt('Please provide your email for confirmation');
            }
            if(emailFromStorage) {
                signInWithEmailLink(auth, emailFromStorage, href)
                    .then(() => {
                        window.localStorage.removeItem('emailForSignIn');
                        toast({
                            title: 'Connexion réussie!',
                            description: 'Vous êtes maintenant connecté.',
                        });
                        router.push('/dashboard');
                    })
                    .catch((error) => {
                        toast({
                            variant: 'destructive',
                            title: 'Erreur de connexion',
                            description: 'Le lien est peut-être invalide ou a expiré.',
                        });
                        setIsCheckingLink(false);
                    });
            } else {
                 setIsCheckingLink(false);
            }
        } else {
            setIsCheckingLink(false);
        }
    }, [auth, router, toast, searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            setEmailSent(true);
            toast({
                title: 'Lien envoyé!',
                description: 'Vérifiez votre boîte de réception pour vous connecter.',
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: "Nous n'avons pas pu envoyer le lien. Veuillez réessayer.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isCheckingLink || user) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Vérification en cours...</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-4">
            <div className="grid lg:grid-cols-2 max-w-4xl w-full gap-16 items-center">
                 <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                    <Logo />
                    <h1 className="text-3xl font-bold tracking-tight font-headline md:text-4xl mt-4">Passez au niveau supérieur.</h1>
                    <p className="text-muted-foreground mt-2">Créez un compte gratuit pour débloquer toutes les fonctionnalités et ne plus jamais perdre un WOD.</p>
                    <div className="space-y-4 mt-8 text-left">
                        <div className="flex items-start gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Barbell className="h-5 w-5"/>
                            </div>
                            <div>
                                <h3 className="font-semibold">Création Manuelle</h3>
                                <p className="text-sm text-muted-foreground">Ajoutez vos propres WODs sans avoir besoin d'une photo.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Archive className="h-5 w-5"/>
                            </div>
                            <div>
                                <h3 className="font-semibold">Historique Complet</h3>
                                <p className="text-sm text-muted-foreground">Sauvegardez et retrouvez tous vos entraînements à tout moment.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                           <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <LineChart className="h-5 w-5"/>
                            </div>
                            <div>
                                <h3 className="font-semibold">Suivi des Performances (Bientôt !)</h3>
                                <p className="text-sm text-muted-foreground">Analysez vos progrès et visualisez vos performances.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>Connexion / Inscription</CardTitle>
                        <CardDescription>Entrez votre email pour recevoir un lien de connexion sécurisé. Pas de mot de passe requis.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {emailSent ? (
                            <div className="text-center text-green-500 flex flex-col items-center gap-4">
                                <CheckCircle className="h-16 w-16" />
                                <p className="font-semibold">Vérifiez votre boîte mail !</p>
                                <p className="text-sm text-muted-foreground">Un lien pour vous connecter a été envoyé à <span className="font-bold">{email}</span>.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <Input
                                    type="email"
                                    placeholder="nom@exemple.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? <LoaderCircle className="animate-spin" /> : 'Envoyer le lien magique'}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
