'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { loadStripe } from '@stripe/stripe-js';
import { Check, LoaderCircle, PartyPopper } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const features = [
  { text: 'Unlimited WOD Scans', free: '3 per month', premium: true },
  { text: 'Unlimited Community Reactions', free: '5 per day', premium: true },
  { text: 'Post Comments', free: 'Read-only', premium: true },
  { text: 'Unlimited Favorite WODs', free: 'Max 10', premium: true },
  { text: 'Unlimited Custom WODs', free: 'Max 3', premium: true },
  { text: 'Advanced Search Filters', free: false, premium: true },
  { text: 'Exclusive Supporter Badge', free: false, premium: true },
];

// COMPOSANT INTERNE POUR useSearchParams (dans Suspense)
function PremiumContent() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const cancel = searchParams.get('cancel') === 'true';
  const [isLoading, setIsLoading] = useState<null | 'monthly' | 'yearly'>(null);
  const [isYearly, setIsYearly] = useState(true);

  useEffect(() => {
    if (success) {
      toast({
        title: "Bienvenue dans WODBurner Premium !",
        description: "Ton badge Supporter est activé.",
      });
    }
    if (cancel) {
      toast({
        title: "Paiement annulé",
        description: "Tu peux réessayer quand tu veux.",
      });
    }
  }, [success, cancel, toast]);

  const handleCheckout = async (plan: 'monthly' | 'yearly') => {
    if (!user || user.isAnonymous) {
      toast({ title: 'Please sign in', description: 'You need to have an account.', variant: 'destructive' });
      router.push('/login');
      return;
    }
  
    setIsLoading(plan);
    try {
      const functions = getFunctions();
      const createStripeCheckout = httpsCallable(functions, 'createStripeCheckout');
      
      // Pass 'yearly' boolean instead of priceId
      const { data } = await createStripeCheckout({ yearly: plan === 'yearly' });
  
      const sessionId = (data as { id: string }).id;
      if (!sessionId) throw new Error("No session ID");
  
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe not loaded");
  
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: 'Checkout Error', description: error.message || 'Error', variant: 'destructive' });
    } finally {
      setIsLoading(null);
    }
  };

  if (user?.premium) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-8 max-w-md">
          <PartyPopper className="w-24 h-24 mx-auto text-yellow-500 animate-bounce" />
          <h2 className="text-5xl font-extrabold text-green-500">TU ES PREMIUM !</h2>
          <p className="text-2xl text-muted-foreground">Badge Supporter activé</p>
          <p className="text-lg">Merci de soutenir WODBurner ❤️</p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => router.push('/dashboard?tab=community')} className="bg-green-600 hover:bg-green-700">
              Voir la communauté
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/dashboard')}>
              Tableau de bord
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold font-headline text-primary">Unleash Your Full Potential</h2>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            Become a WODBurner Premium member to get unlimited access to all features and support the app's development.
          </p>
          <div className="inline-block mt-4 bg-destructive/80 text-destructive-foreground text-xs font-bold px-3 py-1 rounded-full">
            LIFETIME LAUNCH OFFER for the first 500 members!
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 my-8">
          <Label htmlFor="plan-switch" className={cn(!isYearly && "text-primary")}>Monthly</Label>
          <Switch id="plan-switch" checked={isYearly} onCheckedChange={setIsYearly} />
          <Label htmlFor="plan-switch" className={cn(isYearly && "text-primary")}>Yearly</Label>
          <Badge variant="destructive">-20%</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Free Plan */}
          <Card className="border-muted/50">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Free</CardTitle>
              <CardDescription>For casual tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-4xl font-bold">€0<span className="text-lg font-normal text-muted-foreground">/month</span></p>
              <ul className="space-y-3 text-sm">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-foreground">{feature.text}</span>
                      <span className="block text-muted-foreground">
                        {typeof feature.free === 'string' ? feature.free : 'Not included'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            </CardFooter>
          </Card>

          {/* Premium Plan */}
          <Card className="border-2 border-primary shadow-2xl shadow-primary/20">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary">Premium</CardTitle>
              <CardDescription>For dedicated athletes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative h-16">
                <div className={cn("absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300", isYearly ? "opacity-0" : "opacity-100")}>
                  <p className="text-4xl font-bold">€1.99<span className="text-lg font-normal text-muted-foreground">/month</span></p>
                </div>
                <div className={cn("absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300", isYearly ? "opacity-100" : "opacity-0")}>
                  <p className="text-4xl font-bold">€19.99<span className="text-lg font-normal text-muted-foreground">/year</span></p>
                  <p className="text-sm text-muted-foreground -mt-1">Billed annually</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-foreground">{feature.text}</span>
                      <span className="block text-muted-foreground">
                        {feature.premium === true ? 'Unlimited' : feature.premium}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => handleCheckout(isYearly ? 'yearly' : 'monthly')} 
                className="w-full text-xl py-8" 
                disabled={!!isLoading || isUserLoading}
              >
                {isLoading ? <LoaderCircle className="animate-spin mr-2" /> : 'Go Premium'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PremiumPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 p-4 border-b md:p-6">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
          Premium
        </h1>
      </header>
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LoaderCircle className="animate-spin" /></div>}>
        <PremiumContent />
      </Suspense>
    </div>
  );
}

    