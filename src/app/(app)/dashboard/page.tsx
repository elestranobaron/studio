
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WodCard } from '@/components/wod-card';
import { LogIn, PlusCircle, Search } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useCollection, useFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { WOD } from '@/lib/types';
import { useUser } from '@/firebase/provider';
import { useMemo, useState, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { WelcomeEmptyState } from '@/components/welcome-empty-state';
import { useSearchParams } from 'next/navigation';

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
  emptyStateTitle,
  emptyStateDescription,
  showAddButton = false,
  source = 'personal'
}: {
  wods: WOD[] | null;
  isLoading: boolean;
  emptyStateTitle: string;
  emptyStateDescription: string;
  showAddButton?: boolean;
  source?: 'personal' | 'community';
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
          <WodCard key={wod.id} wod={wod} source={source} />
        ))}
      </div>
    );
  }

  // Use the new WelcomeEmptyState for personal wods if empty
  if (source === 'personal') {
    return <WelcomeEmptyState />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16">
      <p className="text-lg text-muted-foreground">{emptyStateTitle}</p>
      <p className="text-sm text-muted-foreground">
        {emptyStateDescription}
      </p>
      {showAddButton && (
        <Button asChild className="mt-4">
            <Link href="/scan">
            <PlusCircle className="mr-2 h-4 w-4" />
            Scan New WOD
            </Link>
        </Button>
      )}
    </div>
  );
}

function CommunityWodList() {
    const { firestore } = useFirebase();
    const { user, isUserLoading } = useUser();
    const [searchTerm, setSearchTerm] = useState('');

    const shouldFetchData = !isUserLoading && user && !user.isAnonymous;

    const communityWodsCollection = useMemo(() => {
        if (!firestore || !shouldFetchData) return null;
        // Increase limit to get a larger pool for client-side search
        return query(collection(firestore, 'communityWods'), orderBy('date', 'desc'), limit(50));
    }, [firestore, shouldFetchData]);

    const { data: communityWods, isLoading: isCommunityWodsLoading, error } = useCollection<WOD>(communityWodsCollection);

    const filteredWods = useMemo(() => {
        if (!communityWods) return null;
        if (!searchTerm) return communityWods;

        const lowercasedTerm = searchTerm.toLowerCase();
        return communityWods.filter(wod => {
            const descriptionString = Array.isArray(wod.description)
                ? wod.description.map(d => d.content).join(' ').toLowerCase()
                : wod.description.toLowerCase();
            
            return (
                wod.name.toLowerCase().includes(lowercasedTerm) ||
                wod.type.toLowerCase().includes(lowercasedTerm) ||
                descriptionString.includes(lowercasedTerm)
            );
        });
    }, [communityWods, searchTerm]);

    if (isUserLoading) {
      return (
         <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <WodSkeleton />
            <WodSkeleton />
         </div>
      );
    }
    
    if (user?.isAnonymous) {
      return (
        <div className="flex items-center justify-center h-full py-16">
            <Card className="max-w-md text-center">
                <CardHeader>
                    <CardTitle>Join the Community!</CardTitle>
                    <CardDescription>
                        Create a free account to view, share, and get inspired by WODs from the entire community.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/login">
                            <LogIn className="mr-2 h-4 w-4" />
                            Sign Up / Log In
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
      )
    }

    if (error) {
        return (
             <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <p className="text-lg text-destructive">An error occurred</p>
                <p className="text-sm text-muted-foreground">
                    Could not load community WODs. Please try again later.
                </p>
            </div>
        )
    }
    
    return (
        <div className="space-y-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search community WODs by name, type, or exercise..."
                    className="pl-10 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <WodList
                wods={filteredWods}
                isLoading={isCommunityWodsLoading}
                emptyStateTitle={searchTerm ? "No WODs match your search." : "No community WODs yet."}
                emptyStateDescription={searchTerm ? "Try a different search term." : "Be the first to share one!"}
                source="community"
            />
        </div>
    );
}

function DashboardContent() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'community' ? 'community' : 'personal';

  const userWodsCollection = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'wods'), orderBy('date', 'desc'));
  }, [firestore, user]);


  const { data: userWods, isLoading: isUserWodsLoading } = useCollection<WOD>(userWodsCollection);

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
        <Tabs defaultValue={defaultTab} className="w-full">
          <div className="p-4 md:p-6 border-b">
            <TabsList className="grid w-full grid-cols-2 md:w-auto">
              <TabsTrigger value="personal">My WODs</TabsTrigger>
              <TabsTrigger value="community">Community</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="personal" className="p-4 md:p-6">
            <WodList 
                wods={userWods} 
                isLoading={showPersonalLoadingState}
                emptyStateTitle="No WODs found here."
                emptyStateDescription="Scan your first WOD to get started!"
                showAddButton={true}
                source="personal"
            />
          </TabsContent>
          <TabsContent value="community" className="p-4 md:p-6">
            <CommunityWodList />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
