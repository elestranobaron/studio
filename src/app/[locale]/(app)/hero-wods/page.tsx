
'use client';

import Link from 'next/link';
import { WodCard } from '@/components/wod-card';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { heroWods } from '@/lib/hero-wods';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gem, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';


function WodSkeleton() {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="h-[125px] w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
}

function PremiumUpsellCard() {
    const t = useTranslations('HeroWodsPage.premiumUpsell');
    const premiumWodCount = heroWods.filter(w => w.isPremium).length;
    const totalWodCount = heroWods.length;

    return (
        <Card className="sm:col-span-2 lg:col-span-3 xl:col-span-4 bg-gradient-to-br from-primary/10 via-background to-background border-2 border-primary/50 shadow-2xl shadow-primary/10">
            <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8" />
                </div>
                <CardTitle className="font-headline text-3xl text-foreground">
                    {t('title')}
                </CardTitle>
                <CardDescription className="text-lg max-w-2xl mx-auto">
                    {t('description', { totalWodCount, premiumWodCount })}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Button asChild size="lg">
                    <Link href="/premium">
                        <Gem className="mr-2 h-5 w-5" />
                        {t('button')}
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

export default function HeroWodsPage() {
  const t = useTranslations('HeroWodsPage');
  const { user, isUserLoading } = useUser();

  const visibleWods = useMemo(() => {
    if (user?.premium) {
      // Premium users see all WODs
      return heroWods;
    }
    // Free users see only non-premium WODs
    return heroWods.filter(wod => !wod.isPremium);
  }, [user]);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 p-4 border-b md:p-6">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
          {t('title')}
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-6">
            <p className="text-lg text-muted-foreground">
                {t('description')}
            </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:col-span-4">
          {isUserLoading ? (
            <>
              <WodSkeleton />
              <WodSkeleton />
              <WodSkeleton />
              <WodSkeleton />
            </>
          ) : (
            <>
              {visibleWods.map((wod) => (
                <WodCard 
                  key={wod.id} 
                  wod={wod} 
                  source="community" 
                />
              ))}
              {!user?.premium && <PremiumUpsellCard />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
