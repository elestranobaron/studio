
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WodCard } from '@/components/wod-card';
import { LogIn, PlusCircle, Search, ScanLine, ArrowUp, ArrowLeft, SlidersHorizontal, Gem, X } from 'lucide-react';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useCollection, useFirebase } from '@/firebase';
import { collection, query, orderBy, limit, Query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { WOD, WodType } from '@/lib/types';
import { useUser } from '@/firebase/provider';
import { useMemo, useState, Suspense, useEffect, useId } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { WelcomeEmptyState } from '@/components/welcome-empty-state';
import { useSearchParams, useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';


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
  const t = useTranslations('DashboardPage');
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
            {t('scanNewWod')}
            </Link>
        </Button>
      )}
    </div>
  );
}

const WOD_TYPES: WodType[] = ["For Time", "AMRAP", "EMOM", "Tabata", "Other"];

function CommunityWodList() {
    const t = useTranslations('DashboardPage.CommunityWodList');
    const { firestore } = useFirebase();
    const { user, isUserLoading } = useUser();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'popularity' | 'name'>('date');
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    
    // Filter states
    const [selectedTypes, setSelectedTypes] = useState<WodType[]>([]);
    const [cardioRange, setCardioRange] = useState<[number, number]>([0, 100]);
    const [bodyFocusRange, setBodyFocusRange] = useState<[number, number]>([0, 100]);

    const shouldFetchData = !isUserLoading && user && !user.isAnonymous;
    
    const communityWodsQuery = useMemo(() => {
        if (!firestore || !shouldFetchData) return null;
        
        let q: Query = collection(firestore, 'communityWods');

        // Apply sorting
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

        return query(q, limit(100)); // Increased limit for better client-side filtering
    }, [firestore, shouldFetchData, sortBy]);


    const { data: communityWods, isLoading: isCommunityWodsLoading, error } = useCollection<WOD>(communityWodsQuery);

    const filteredWods = useMemo(() => {
        if (!communityWods) return null;
        
        return communityWods.filter(wod => {
            // Search term filter
            if (searchTerm) {
                const lowercasedTerm = searchTerm.toLowerCase();
                 const descriptionString = wod.description && Array.isArray(wod.description)
                    ? wod.description.map(d => d.content).join(' ').toLowerCase()
                    : typeof wod.description === 'string' ? wod.description.toLowerCase() : '';
                
                const matchesSearch = (
                    wod.name.toLowerCase().includes(lowercasedTerm) ||
                    wod.type.toLowerCase().includes(lowercasedTerm) ||
                    descriptionString.includes(lowercasedTerm)
                );
                if (!matchesSearch) return false;
            }

            // Premium filters (only apply if user is premium)
            if (user?.premium) {
                // Type filter
                if (selectedTypes.length > 0 && !selectedTypes.includes(wod.type)) {
                    return false;
                }
                const isCardioFilterActive = cardioRange[0] > 0 || cardioRange[1] < 100;
                if (isCardioFilterActive) {
                    if (wod.cardio === undefined) return false;
                    if (wod.cardio < cardioRange[0] || wod.cardio > cardioRange[1]) return false;
                }

                const isBodyFocusFilterActive = bodyFocusRange[0] > 0 || bodyFocusRange[1] < 100;
                 if (isBodyFocusFilterActive) {
                    if (wod.upperBody === undefined) return false;
                    if (wod.upperBody < bodyFocusRange[0] || wod.upperBody > bodyFocusRange[1]) return false;
                }
            }

            return true;
        });
    }, [communityWods, searchTerm, user?.premium, selectedTypes, cardioRange, bodyFocusRange]);
    
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedTypes.length > 0) count++;
        if (cardioRange[0] > 0 || cardioRange[1] < 100) count++;
        if (bodyFocusRange[0] > 0 || bodyFocusRange[1] < 100) count++;
        return count;
    }, [selectedTypes, cardioRange, bodyFocusRange]);

    const resetFilters = () => {
        setSelectedTypes([]);
        setCardioRange([0, 100]);
        setBodyFocusRange([0, 100]);
    }

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
                    <CardTitle>{t('joinTitle')}</CardTitle>
                    <CardDescription>
                        {t('joinDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/login">
                            <LogIn className="mr-2 h-4 w-4" />
                            {t('joinButton')}
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
                <p className="text-lg text-destructive">{t('errorTitle')}</p>
                <p className="text-sm text-muted-foreground">
                    {t('errorDescription')}
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
                        placeholder={t('searchInputPlaceholder')}
                        className="pl-10 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                 <div className="flex items-center gap-2">
                    <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full md:w-auto relative">
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{activeFilterCount}</span>
                                )}
                                {!user?.premium && (
                                     <Gem className="ml-2 h-3 w-3 text-yellow-500"/>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                            <div className="grid gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm leading-none">Filters</h4>
                                        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={resetFilters}>Reset</Button>
                                    </div>
                                    {!user?.premium && (
                                        <Card className="p-3 text-center bg-muted/50">
                                            <p className="text-sm">Unlock advanced filters with Premium.</p>
                                            <Button asChild size="sm" className="mt-2">
                                                <Link href="/premium">
                                                    <Gem className="mr-2 h-4 w-4"/> Go Premium
                                                </Link>
                                            </Button>
                                        </Card>
                                    )}
                                </div>
                                <div className={cn("grid gap-4", !user?.premium && "opacity-50 pointer-events-none")}>
                                     <div>
                                        <p className="font-medium text-xs text-muted-foreground mb-2">WOD Type</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {WOD_TYPES.map(type => (
                                                <Button 
                                                    key={type}
                                                    variant={selectedTypes.includes(type) ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="text-xs h-8"
                                                    onClick={() => {
                                                        setSelectedTypes(prev => 
                                                            prev.includes(type) 
                                                                ? prev.filter(t => t !== type)
                                                                : [...prev, type]
                                                        );
                                                    }}
                                                >{type}</Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-medium text-xs text-muted-foreground mb-2">Cardio vs. Lifting</p>
                                        <Slider
                                            value={cardioRange}
                                            onValueChange={(value) => setCardioRange(value as [number, number])}
                                            min={0}
                                            max={100}
                                            step={10}
                                            minStepsBetweenThumbs={0}
                                        />
                                         <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                            <span>Cardio</span>
                                            <span>Lifting</span>
                                        </div>
                                    </div>
                                     <div>
                                        <p className="font-medium text-xs text-muted-foreground mb-2">Body Focus</p>
                                        <Slider
                                            value={bodyFocusRange}
                                            onValueChange={(value) => setBodyFocusRange(value as [number, number])}
                                            min={0}
                                            max={100}
                                            step={10}
                                            minStepsBetweenThumbs={0}
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                            <span>Lower</span>
                                             <span>Balanced</span>
                                            <span>Upper</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                        <SelectTrigger className="w-full md:w-[180px]" id="sort-by">
                            <SelectValue placeholder={`${t('sortByLabel')}...`} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date">{t('sort.recent')}</SelectItem>
                            <SelectItem value="popularity">{t('sort.popular')}</SelectItem>
                            <SelectItem value="name">{t('sort.alphabetical')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <WodList
                wods={filteredWods}
                isLoading={isCommunityWodsLoading}
                emptyStateTitle={searchTerm || activeFilterCount > 0 ? t('emptySearchTitle') : t('emptyCommunityTitle')}
                emptyStateDescription={searchTerm || activeFilterCount > 0 ? t('emptySearchDescription') : ""}
                source="community"
            />
        </div>
    );
}

function DashboardContent({ t }: { t: (key: string) => string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [defaultTab, setDefaultTab] = useState('personal');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { toggleSidebar } = useSidebar();
  const baseId = useId();

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const isNewUser = sessionStorage.getItem('isNewUser') === 'true';

    if (isNewUser) {
        setDefaultTab('community');
        // Use a clean URL replacement that works on the client
        window.history.replaceState(null, '', '/dashboard');
        sessionStorage.removeItem('isNewUser');
    } else if (tabParam === 'community') {
        setDefaultTab('community');
    } else {
        setDefaultTab('personal');
    }

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowScrollTop(scrollTop > 200);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [searchParams]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToScanPage = () => {
    router.push('/scan');
  };

  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();

  const userWodsCollection = useMemo(() => {
    // Stricter check: only create query if we have a definite, non-anonymous user UID.
    if (!firestore || !user?.uid || user.isAnonymous) return null;
    return query(collection(firestore, 'users', user.uid, 'wods'), orderBy('date', 'desc'));
  }, [firestore, user?.uid, user?.isAnonymous]);

  const { data: userWods, isLoading: isUserWodsLoading } = useCollection<WOD>(userWodsCollection);

  const showPersonalLoadingState = isUserLoading || (user && !user.isAnonymous && isUserWodsLoading);

  return (
    <div className="flex flex-col h-full overflow-x-hidden">
      <header className="flex items-center justify-between p-4 border-b md:p-6">
        <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div onClick={toggleSidebar} className="flex items-center gap-4 cursor-pointer">
                <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
                  {t('title')}
                </h1>
            </div>
        </div>
        <div className="hidden items-center gap-4 md:flex">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
              {t('title')}
            </h1>
        </div>
        <Button asChild className="hidden md:inline-flex">
          <Link href="/scan">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('scanNewWod')}
          </Link>
        </Button>
      </header>
      <div className="flex-1 flex flex-col min-h-0">
        <main className="flex-1 overflow-y-auto" id="dashboard-main-content">
          <Tabs value={defaultTab} onValueChange={setDefaultTab} className="w-full" id={baseId}>
            <div className="p-4 md:p-6 border-b">
              <TabsList className="grid w-full grid-cols-2 md:w-auto">
                <TabsTrigger value="personal">{t('tabs.personal')}</TabsTrigger>
                <TabsTrigger value="community">{t('tabs.community')}</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="personal" className="p-4 md:p-6">
              <WodList 
                  wods={userWods} 
                  isLoading={!!showPersonalLoadingState}
                  emptyStateTitle={t('PersonalWodList.emptyTitle')}
                  emptyStateDescription={t('PersonalWodList.emptyDescription')}
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
      
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {showScrollTop ? (
            <motion.div
              key="scroll"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                onClick={scrollToTop}
                size="icon"
                className="h-16 w-16 rounded-full shadow-2xl shadow-primary/40"
                aria-label={t('ScrollTop.label')}
              >
                <ArrowUp className="h-8 w-8" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="scan"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                onClick={goToScanPage}
                size="icon"
                className="h-16 w-16 rounded-full shadow-2xl shadow-primary/40 animate-pulse-glow"
                aria-label={t('scanNewWod')}
              >
                <ScanLine className="h-8 w-8" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations('DashboardPage');
  const t_nav = useTranslations('UserNav');
  return (
    <Suspense fallback={<div>{t_nav('loading')}</div>}>
      <DashboardContent t={t} />
    </Suspense>
  )
}
    

    

    




    

    

