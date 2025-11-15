
'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { TimerClient } from '@/components/timer-client';
import { ArrowLeft, BookOpen, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { WOD, WodDescriptionSection } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase/provider';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { WodContentParser } from '@/components/wod-content-parser';

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

export default function TimerPage() {
  const params = useParams();
  const { id } = params;
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const [activeWod, setActiveWod] = useState<WOD | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const wodRef = useMemo(() => {
    if (!firestore || !user || typeof id !== 'string') return null;
    return doc(firestore, 'users', user.uid, 'wods', id);
  }, [firestore, user, id]);

  const { data: wod, isLoading } = useDoc<WOD>(wodRef, {
      onLoad: (data) => {
          if (data && !activeWod) {
            // Find a 'metcon' section to set as default timer, otherwise use the full WOD
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

  if (isLoading || isUserLoading || !wod) {
    return <TimerPageSkeleton />;
  }

  if (!wod && !isLoading) {
    notFound();
  }

  const descriptionSections = Array.isArray(wod.description)
    ? wod.description
    : [{ title: "Workout", content: wod.description || "", timerType: wod.type, timerDuration: wod.duration }];

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
                            {wod.type} - {wod.date}
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
