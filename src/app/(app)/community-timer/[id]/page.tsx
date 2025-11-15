
'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { TimerClient } from '@/components/timer-client';
import { ArrowLeft, BookOpen, LogIn, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { WOD, WodDescriptionSection } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase/provider';
import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { WodContentParser } from '@/components/wod-content-parser';
import { isValid, format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { heroWods } from '@/lib/hero-wods';

function TimerPageSkeleton() {
    return (
        <div className="relative flex flex-col items-center justify-center h-screen bg-background p-4">
            <div className="absolute inset-0 bg-muted/50 z-0"></div>
             <div className="absolute top-4 left-4 z-20">
                <Skeleton className="h-10 w-48" />
             </div>
             <div className="absolute top-4 right-4 z-20">
                <Skeleton className="h-10 w-32" />
            </div>
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

function createWodFromSection(baseWod: WOD, section: WodDescriptionSection): WOD {
    return {
        id: `${baseWod.id}-${section.title}`,
        name: section.title,
        type: section.timerType || 'Other',
        date: baseWod.date,
        description: [section],
        imageUrl: baseWod.imageUrl,
        imageHint: baseWod.imageHint,
        userId: baseWod.userId,
        duration: section.timerDuration,
        rounds: section.timerRounds,
        emomInterval: section.timerInterval,
    };
}

export default function CommunityTimerPage() {
  const params = useParams();
  const { id } = params;
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const [activeWod, setActiveWod] = useState<WOD | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const wodId = typeof id === 'string' ? id : '';
  const isHeroWod = wodId.startsWith('hero-');

  const heroWod = useMemo(() => {
    if (!isHeroWod) return null;
    return heroWods.find(w => w.id === wodId) || null;
  }, [isHeroWod, wodId]);

  const wodRef = useMemo(() => {
    if (!firestore || isHeroWod || !id) return null;
    return doc(firestore, 'communityWods', id as string);
  }, [firestore, id, isHeroWod]);

  const { data: firestoreWod, isLoading: isFirestoreWodLoading } = useDoc<WOD>(wodRef, {
      onLoad: (data) => {
          if (data && !activeWod) {
            const metconSection = Array.isArray(data.description)
                ? data.description.find(s => s.title.toLowerCase().includes('metcon'))
                : null;
            if (metconSection && metconSection.timerType) {
                setActiveWod(createWodFromSection(data, metconSection));
            } else {
                setActiveWod(data);
            }
          }
      }
  });
  
    useEffect(() => {
        if (heroWod && !activeWod) {
            const mainSection = Array.isArray(heroWod.description)
                ? heroWod.description.find(s => s.timerType) // Find first section with a timer
                : null;
            if (mainSection) {
                setActiveWod(createWodFromSection(heroWod, mainSection));
            } else {
                setActiveWod(heroWod);
            }
        }
    }, [heroWod, activeWod]);


  const wod = isHeroWod ? heroWod : firestoreWod;
  const isLoading = isUserLoading || (isFirestoreWodLoading && !isHeroWod);
  
  if (isLoading || !wod) {
    return <TimerPageSkeleton />;
  }

  // If it's not a Hero WOD, check for authentication
  if (!isHeroWod && (!user || user.isAnonymous)) {
      return (
         <div className="flex flex-col items-center justify-center h-screen bg-background p-4">
            <Card className="max-w-md text-center">
                <CardHeader>
                    <CardTitle>Access Restricted</CardTitle>
                    <CardDescription>
                        Please sign up or log in to view community WODs and use the timer.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button asChild>
                        <Link href="/login">
                            <LogIn className="mr-2 h-4 w-4" />
                            Sign Up / Log In
                        </Link>
                    </Button>
                     <Button asChild variant="outline">
                        <Link href="/dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
      )
  }

  if (!wod && !isLoading) {
    notFound();
  }

  const descriptionSections = Array.isArray(wod?.description)
    ? wod.description
    : [{ title: "Workout", content: wod?.description || "", timerType: wod?.type, timerDuration: wod?.duration }];
  
  const date = wod?.date ? new Date(wod.date) : null;
  const formattedDate = date && isValid(date) ? format(date, "PPP") : wod?.date;

  const handleSectionSelect = (section: WodDescriptionSection) => {
    setActiveWod(createWodFromSection(wod, section));
    setIsSheetOpen(false);
  };
  const handleWodSelect = () => {
      setActiveWod(wod);
      setIsSheetOpen(false);
  }

  return activeWod ? (
    <div className="relative flex flex-col items-center justify-center h-screen bg-background p-4 overflow-hidden">
        {isHeroWod ? (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-800 z-0"/>
        ): (
             <Image
                src={wod.imageUrl}
                alt={`${wod.name} background`}
                fill
                className="object-cover z-0 opacity-20 blur-lg"
                data-ai-hint={wod.imageHint}
            />
        )}
       
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/50 z-0" />
      
        <div className="absolute top-4 left-4 z-20">
            <Button asChild variant="outline" className="bg-background/50 backdrop-blur-sm">
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
            </Button>
        </div>

         <div className="absolute top-4 right-4 z-20">
             <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" className="bg-background/50 backdrop-blur-sm">
                        <BookOpen className="mr-2 h-4 w-4" /> View WOD
                    </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="font-headline text-primary text-2xl">{wod.name}</SheetTitle>
                        <SheetDescription>
                            {wod.type} - {formattedDate}
                            {wod.userDisplayName && <span className="block mt-1">Shared by {wod.userDisplayName}</span>}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="py-4 space-y-2">
                        <Button onClick={handleWodSelect} variant="ghost" className="w-full justify-start h-auto py-2 px-2 mb-2">
                            <div className="text-left">
                                <h4 className="font-headline text-lg text-foreground">Full WOD: {wod.name}</h4>
                                <p className="text-sm text-muted-foreground">{wod.type}</p>
                            </div>
                        </Button>
                        <Separator />
                        {descriptionSections.map((section, index) => (
                            <div key={index}>
                                <div className="py-4 space-y-2">
                                     <div className="flex items-center justify-between">
                                        <h4 className="font-headline text-lg text-foreground">{section.title}</h4>
                                        {section.timerType && (
                                            <Button size="sm" variant="outline" onClick={() => handleSectionSelect(section)}>
                                                <PlayCircle className="mr-2 h-4 w-4" />
                                                Start
                                            </Button>
                                        )}
                                    </div>
                                    <WodContentParser content={section.content} />
                                </div>
                                {index < descriptionSections.length - 1 && <Separator />}
                            </div>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        </div>

      <div className="relative z-10 flex flex-col items-center justify-center gap-8 w-full max-w-6xl">
        <TimerClient wod={activeWod} />
      </div>
    </div>
  ) : <TimerPageSkeleton />;
}
