'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WodCard } from '@/components/wod-card';
import { PlusCircle } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useCollection, useFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { WOD } from '@/lib/types';
import { useUser } from '@/firebase/provider';
import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

function WodList({
  wods,
  isLoading,
}: {
  wods: WOD[] | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <WodSkeleton />
        <WodSkeleton />
        <WodSkeleton />
        <WodSkeleton />
      </div>
    );
  }

  if (wods && wods.length > 0) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {wods.map((wod) => (
          <WodCard key={wod.id} wod={wod} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16">
      <p className="text-lg text-muted-foreground">No WODs found here.</p>
      <p className="text-sm text-muted-foreground">
        Scan your first WOD to get started!
      </p>
      <Button asChild className="mt-4">
        <Link href="/scan">
          <PlusCircle className="mr-2 h-4 w-4" />
          Scan New WOD
        </Link>
      </Button>
    </div>
  );
}

export default function DashboardPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();

  const userWodsCollection = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'wods');
  }, [firestore, user]);

  const communityWodsCollection = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'communityWods'), orderBy('date', 'desc'), limit(20));
  }, [firestore]);

  const { data: userWods, isLoading: isUserWodsLoading } = useCollection<WOD>(userWodsCollection);
  const { data: communityWods, isLoading: isCommunityWodsLoading } = useCollection<WOD>(communityWodsCollection);

  const showPersonalLoadingState = isUserLoading || (user && isUserWodsLoading);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-4 border-b md:p-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
            Dashboard
          </h1>
        </div>
        <Button asChild>
          <Link href="/scan">
            <PlusCircle className="mr-2 h-4 w-4" />
            Scan New WOD
          </Link>
        </Button>
      </header>
      <main className="flex-1 overflow-y-auto">
        <Tabs defaultValue="personal" className="w-full">
          <div className="p-4 md:p-6 border-b">
            <TabsList className="grid w-full grid-cols-2 md:w-auto">
              <TabsTrigger value="personal">My WODs</TabsTrigger>
              <TabsTrigger value="community">Community</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="personal" className="p-4 md:p-6">
            <WodList wods={userWods} isLoading={showPersonalLoadingState} />
          </TabsContent>
          <TabsContent value="community" className="p-4 md:p-6">
            <WodList wods={communityWods} isLoading={isCommunityWodsLoading} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
