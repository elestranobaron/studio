
'use client';

import { WodCard } from '@/components/wod-card';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { heroWods } from '@/lib/hero-wods';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function HeroWodsPage() {
  const { user, isUserLoading } = useUser();

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 p-4 border-b md:p-6">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
          Hero WODs
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-6">
            <p className="text-lg text-muted-foreground">
                "Hero" WODs are special workouts in CrossFit dedicated to men and women who have given their lives in the line of duty. They are an opportunity to reflect and honor their sacrifice.
            </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isUserLoading ? (
            <>
              <WodSkeleton />
              <WodSkeleton />
              <WodSkeleton />
              <WodSkeleton />
            </>
          ) : (
            heroWods.map((wod) => {
              const isLocked = wod.isPremium && !user?.premium;
              return (
                <WodCard 
                  key={wod.id} 
                  wod={wod} 
                  source="community" 
                  isLocked={isLocked}
                />
              )
            })
          )}
        </div>
      </main>
    </div>
  );
}
