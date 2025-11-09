
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { loadStripe } from '@stripe/stripe-js';
import { Check, LoaderCircle } from 'lucide-react';

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

export default function PremiumPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<null | 'monthly' | 'yearly'>(null);
  const [isYearly, setIsYearly] = useState(true);

  const handleCheckout = async (priceId: string, plan: 'monthly' | 'yearly') => {
    if (!user || user.isAnonymous) {
      toast({
        title: 'Please sign in',
        description: 'You need to have an account to subscribe.',
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }

    setIsLoading(plan);

    try {
      const functions = getFunctions();
      const createCheckout = httpsCallable(functions, 'createCheckout');
      const { data } = await createCheckout({ priceId, userId: user.uid });
      
      const sessionId = (data as { id: string }).id;
      if (!sessionId) {
          throw new Error("Could not retrieve a checkout session ID.");
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe.js has not loaded yet.");
      }
      
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      toast({
        title: 'Checkout Error',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(null);
    }
  };

  const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || '';
  const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID || '';

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 p-4 border-b md:p-6">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
          Go Premium
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
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
            <Switch
              id="plan-switch"
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
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
                        <span className="block text-muted-foreground">{typeof feature.free === 'string' ? feature.free : 'Not included'}</span>
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
                 <div className="relative">
                    <p className={cn("text-4xl font-bold transition-opacity duration-300", !isYearly ? "opacity-100" : "opacity-0 h-0")}>
                        €1.99<span className="text-lg font-normal text-muted-foreground">/month</span>
                    </p>
                    <div className={cn("transition-opacity duration-300 absolute top-0 w-full", isYearly ? "opacity-100" : "opacity-0")}>
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
                        <span className="block text-muted-foreground">{feature.premium === true ? 'Unlimited' : feature.premium}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button onClick={() => handleCheckout(isYearly ? yearlyPriceId : monthlyPriceId, isYearly ? 'yearly' : 'monthly')} className="w-full" disabled={!!isLoading || isUserLoading}>
                  {isLoading ? <LoaderCircle className="animate-spin" /> : 'Go Premium'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
