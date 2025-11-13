
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WodCard } from '@/components/wod-card';
import { LogIn, PlusCircle, Search, ScanLine, ArrowDownUp, ArrowUp } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useCollection, useFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { WOD } from '@/lib/types';
import { useUser } from '@/firebase/provider';
import { useMemo, useState, Suspense, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { WelcomeEmptyState } from '@/components/welcome-empty-state';
import { useSearchParams, useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';


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
    const [sortBy, setSortBy] = useState<'date' | 'popularity' | 'name'>('date');

    const shouldFetchData = !isUserLoading && user && !user.isAnonymous;
    
    const communityWodsCollection = useMemo(() => {
        if (!firestore || !shouldFetchData) return null;
        
        let q = query(collection(firestore, 'communityWods'));

        switch (sortBy) {
            case 'popularity':
                q = query(q, orderBy('reactions.fire', 'desc'));
                break;
            case 'name':
                q = query(q, orderBy('name', 'asc'));
                break;
            case 'date':
            default:
                q = query(q, orderBy('date', 'desc'));
                break;
        }

        return query(q, limit(50));
    }, [firestore, shouldFetchData, sortBy]);


    const { data: communityWods, isLoading: isCommunityWodsLoading, error } = useCollection<WOD>(communityWodsCollection);

    const filteredWods = useMemo(() => {
        if (!communityWods) return null;
        if (!searchTerm) return communityWods;

        const lowercasedTerm = searchTerm.toLowerCase();
        return communityWods.filter(wod => {
            // Check if wod.description exists and is an array before processing
            const descriptionString = wod.description && Array.isArray(wod.description)
                ? wod.description.map(d => d.content).join(' ').toLowerCase()
                : typeof wod.description === 'string' ? wod.description.toLowerCase() : '';
            
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
    
    if (!user || user.isAnonymous) {
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
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search community WODs..."
                        className="pl-10 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="sort-by" className="text-sm font-medium hidden md:block">
                        <ArrowDownUp className="h-4 w-4 inline-block mr-1 text-muted-foreground"/>
                        Sort by
                    </Label>
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                        <SelectTrigger className="w-full md:w-[180px]" id="sort-by">
                            <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date">Most Recent</SelectItem>
                            <SelectItem value="popularity">Most Popular</SelectItem>
                            <SelectItem value="name">Alphabetical (A-Z)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <WodList
                wods={filteredWods}
                isLoading={isCommunityWodsLoading}
                emptyStateTitle={searchTerm ? "No WODs match your search." : "Be the first to share one!"}
                emptyStateDescription={searchTerm ? "Try a different search term." : ""}
                source="community"
            />
        </div>
    );
}

function DashboardContent() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultTab = searchParams.get('tab') === 'community' ? 'community' : 'personal';
  const mainContentRef = useRef<HTMLElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const mainEl = mainContentRef.current;
    if (!mainEl) return;

    const handleScroll = () => {
      if (mainEl.scrollTop > 200) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFabClick = () => {
    if (showScrollTop) {
      mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/scan');
    }
  };

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
        <Button asChild className="hidden md:inline-flex">
          <Link href="/scan">
            <PlusCircle className="mr-2 h-4 w-4" />
            Scan New WOD
          </Link>
        </Button>
      </header>
      <main ref={mainContentRef} className="flex-1 overflow-y-auto">
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
      
      <div className="md:hidden fixed bottom-6 right-6 z-50">
          <Button
              onClick={handleFabClick}
              size="icon"
              className={cn(
                  "h-16 w-16 rounded-full shadow-2xl transition-colors duration-300",
                  showScrollTop ? "bg-secondary hover:bg-secondary/80" : "bg-primary hover:bg-primary/90 shadow-primary/40"
              )}
              aria-label={showScrollTop ? 'Scroll to top' : 'Scan New WOD'}
          >
              <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                      key={showScrollTop ? 'arrow' : 'scan'}
                      initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                      transition={{ duration: 0.2 }}
                  >
                      {showScrollTop ? <ArrowUp className="h-8 w-8 text-secondary-foreground" /> : <ScanLine className="h-8 w-8 text-primary-foreground" />}
                  </motion.div>
              </AnimatePresence>
          </Button>
      </div>
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
    

    



    

    