
'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { TimerClient } from '@/components/timer-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { WOD } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase/provider';
import { useMemo } from 'react';
import Image from 'next/image';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { WodContentParser } from '@/components/wod-content-parser';

function TimerPageSkeleton() {
    return (
        <div className="relative flex flex-col items-center justify-center h-screen bg-background p-4">
            {/* Background Skeleton */}
            <div className="absolute inset-0 bg-muted/50 z-0"></div>
            
            {/* Header Skeleton */}
             <div className="absolute top-4 left-4 z-20">
                <Skeleton className="h-10 w-48" />
             </div>
             <div className="absolute top-4 right-4 z-20">
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Main Content Skeleton */}
            <div className="relative z-10 flex flex-col items-center justify-center gap-8 w-full max-w-6xl">
                <div className="text-center">
                    <Skeleton className="h-12 w-80 mb-4" />
                    <Skeleton className="h-8 w-32 mx-auto" />
                </div>
                <div className="relative flex items-center justify-center">
                    <Skeleton className="h-80 w-80 rounded-full" />
                </div>
                <div className="flex justify-center gap-4">
                    <Skeleton className="h-12 w-32" />
                    <Skeleton className="h-12 w-32" />
                </div>
            </div>
        </div>
    )
}


export default function TimerPage() {
  const params = useParams();
  const { id } = params;
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();

  const wodRef = useMemo(() => {
    if (!firestore || !user || typeof id !== 'string') return null;
    return doc(firestore, 'users', user.uid, 'wods', id);
  }, [firestore, user, id]);

  const { data: wod, isLoading } = useDoc<WOD>(wodRef);

  if (isLoading || isUserLoading) {
    return <TimerPageSkeleton />;
  }

  if (!wod && !isLoading) {
    notFound();
  }

  // Handle both old (string) and new (array) description formats
  const descriptionSections = Array.isArray(wod?.description)
    ? wod.description
    : [{ title: "Workout", content: wod?.description || "" }];

  return wod ? (
    <div className="relative flex flex-col items-center justify-center h-screen bg-background p-4 overflow-hidden">
        {/* Background Image */}
        <Image
            src={wod.imageUrl}
            alt={`${wod.name} background`}
            fill
            className="object-cover z-0 opacity-20 blur-lg"
            data-ai-hint={wod.imageHint}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/50 z-0" />
      
        <div className="absolute top-4 left-4 z-20">
            <Button asChild variant="outline" className="bg-background/50 backdrop-blur-sm">
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
            </Button>
        </div>

         <div className="absolute top-4 right-4 z-20">
             <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" className="bg-background/50 backdrop-blur-sm">
                        <BookOpen className="mr-2 h-4 w-4" /> View WOD
                    </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="font-headline text-primary text-2xl">{wod.name}</SheetTitle>
                        <SheetDescription>
                            {wod.type} - {wod.date}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="py-4 space-y-6">
                        {descriptionSections.map((section, index) => (
                            <div key={index}>
                                <h4 className="font-headline text-lg text-foreground mb-2">{section.title}</h4>
                                <WodContentParser content={section.content} />
                                {index < descriptionSections.length - 1 && <Separator className="mt-6" />}
                            </div>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        </div>

      <div className="relative z-10 flex flex-col items-center justify-center gap-8 w-full max-w-6xl">
        <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold font-headline text-foreground">
                {wod.name}
            </h1>
            <p className="text-xl text-muted-foreground mt-2">{wod.type}</p>
        </div>
        <TimerClient wod={wod} />
      </div>
    </div>
  ) : null;
}
