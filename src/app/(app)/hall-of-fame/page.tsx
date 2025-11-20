
'use client';

import { useCollection, useFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Crown, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface HallOfFameEntry {
  rank: number;
  displayName: string;
  uid: string;
}

function HallOfFameSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-2/3 mx-auto" />
            <Skeleton className="h-24 w-1/2 mx-auto" />
            <Skeleton className="h-6 w-3/4 mx-auto" />
             <div className="max-w-md mx-auto space-y-2 mt-8">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        </div>
    )
}

export default function HallOfFamePage() {
  const { firestore } = useFirebase();

  const ogsQuery = useMemo(() => {
    if (!firestore) return null;
    const ogsCollection = collection(firestore, 'hallOfFame');
    return query(ogsCollection, orderBy('rank', 'asc'));
  }, [firestore]);
  
  const { data: ogs, isLoading } = useCollection<HallOfFameEntry>(ogsQuery);

  const ogCount = ogs?.length ?? 0;
  const spotsLeft = 300 - ogCount;
  const isFull = spotsLeft <= 0;

  return (
    <div className="flex flex-col h-full">
         <header className="flex items-center gap-4 p-4 border-b md:p-6">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl flex items-center gap-2">
              <Crown className="text-yellow-400"/>
              Hall of Fame
            </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl mx-auto text-center">
                 <Card className="bg-card/50 backdrop-blur-sm overflow-hidden">
                     <CardHeader className="pb-2">
                        <div className="w-16 h-16 mx-auto bg-yellow-400/20 text-yellow-400 rounded-full flex items-center justify-center mb-4 ring-4 ring-yellow-400/30">
                            <Crown className="w-8 h-8" />
                        </div>
                        <CardTitle className="font-headline text-4xl text-yellow-400">The First 300 OGs</CardTitle>
                        <CardDescription className="text-lg">Free for life. A permanent spot for our earliest supporters.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isLoading && !ogs ? (
                           <HallOfFameSkeleton />
                        ) : (
                            <>
                                <div className="p-4 rounded-lg bg-background/50">
                                    <div className="text-6xl font-bold text-green-400">{ogCount} / 300</div>
                                    <p className="text-sm font-medium text-red-400 animate-pulse">
                                        {isFull ? "The list is now closed forever." : `Only ${spotsLeft} spots remaining!`}
                                    </p>
                                </div>
                                <Card>
                                    <ScrollArea className="h-72">
                                        <CardContent className="p-4">
                                            {ogs && ogs.length > 0 ? (
                                                <div className="space-y-3">
                                                    {ogs.map(og => (
                                                        <div key={og.uid} className="flex items-center justify-between text-yellow-400 font-semibold p-2 rounded-md bg-yellow-400/10">
                                                            <span className="text-lg">#{og.rank}</span>
                                                            <span className="text-lg">@{og.displayName}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                                    Be the first to claim a spot!
                                                </div>
                                            )}
                                        </CardContent>
                                    </ScrollArea>
                                </Card>
                                 {!isFull && (
                                    <Button asChild size="lg" className="w-full bg-green-500 hover:bg-green-600 text-primary-foreground shadow-lg shadow-green-500/20 transition-transform hover:scale-105">
                                        <Link href="/premium">
                                            <ShieldCheck className="mr-2 h-5 w-5" />
                                            Claim Your Spot Now
                                        </Link>
                                    </Button>
                                 )}
                            </>
                        )}
                    </CardContent>
                 </Card>
            </div>
        </main>
    </div>
  );
}
