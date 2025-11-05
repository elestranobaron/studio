'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { TimerClient } from '@/components/timer-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { WOD } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase/provider';

export default function TimerPage() {
  const params = useParams();
  const { id } = params;
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();

  const wodRef = useMemoFirebase(() => {
    if (!firestore || !user || typeof id !== 'string') return null;
    return doc(firestore, 'users', user.uid, 'wods', id);
  }, [firestore, user, id]);

  const { data: wod, isLoading } = useDoc<WOD>(wodRef);

  if (isLoading || isUserLoading) {
    return (
       <div className="relative flex flex-col items-center justify-center h-screen bg-background p-4">
         <div className="grid lg:grid-cols-2 gap-16 items-center w-full max-w-6xl">
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Card>
                <CardHeader>
                  <CardTitle>The Workout</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            </div>
            <div className="flex items-center justify-center">
               <Skeleton className="h-64 w-64 rounded-full" />
            </div>
         </div>
       </div>
    )
  }

  if (!wod && !isLoading) {
    notFound();
  }

  return wod ? (
    <div className="relative flex flex-col items-center justify-center h-screen bg-gradient-to-br from-background to-card p-4">
      <div className="absolute top-4 left-4">
        <Button asChild variant="ghost">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>
      <div className="grid lg:grid-cols-2 gap-16 items-center w-full max-w-6xl">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold font-headline text-primary">
            {wod.name}
          </h1>
          <p className="text-xl text-muted-foreground">{wod.type}</p>
          <Card>
            <CardHeader>
              <CardTitle>The Workout</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-muted-foreground text-lg">
              {wod.description}
            </CardContent>
          </Card>
        </div>
        <div className="flex items-center justify-center">
          <TimerClient wod={wod} />
        </div>
      </div>
    </div>
  ) : null;
}
