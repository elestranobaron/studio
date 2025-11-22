
'use client';

import { useState } from "react";
import { useUser, useFirebase } from "@/firebase";
import { useRouter } from 'next/navigation';
import { doc, collection, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { generateWod } from "@/ai/flows/generate-wod-flow";
import { WodCard } from "@/components/wod-card";
import { type WOD } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gem, Zap, AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from "next-intl";


function GeneratingState() {
    const t = useTranslations('GenerateWodPage.generatingState');
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center gap-4 text-center">
      <video
        src="/loading-animation.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="w-48 h-48 rounded-lg"
      />
      <h2 className="text-2xl font-headline font-bold text-foreground animate-pulse">
        {t('title')}
      </h2>
      <p className="text-muted-foreground">
        {t('description')}
      </p>
    </div>
  );
}

export default function GenerateWodPage() {
    const t = useTranslations('GenerateWodPage');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedWod, setGeneratedWod] = useState<WOD | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    const handleGenerate = async () => {
        setIsLoading(true);
        setGeneratedWod(null);
        setError(null);
        
        // This check is simplified. A real app would need a more robust check,
        // especially for anonymous users, but for now, we let it proceed.
        if (!firestore) {
            toast({ variant: 'destructive', title: "Service not available" });
            setIsLoading(false);
            return;
        }

        try {
            const result = await generateWod({});
            const tempId = doc(collection(firestore, 'temp')).id; // Just for a unique ID on the client
            const placeholderImageUrl = `https://picsum.photos/seed/${tempId}/600/400`;

            const newWod: WOD = {
                id: tempId, // This is a temporary ID for the client
                userId: user?.uid || 'anonymous',
                name: result.name,
                type: result.type,
                description: result.description,
                date: new Date().toISOString(),
                imageUrl: placeholderImageUrl,
                imageHint: result.imageHint,
                duration: result.duration,
            };

            // Before saving to state, we need to save this to Firestore to get a real ID
            // This is a temporary solution for demonstration purposes.
            // A better flow would be to save it when the user decides to start the timer.
            const userWodCollection = collection(firestore, `users/${user?.uid || 'anonymous'}/wods`);
            const newWodRef = doc(userWodCollection);
            
            const finalWod = { ...newWod, id: newWodRef.id };
            await setDoc(newWodRef, finalWod);
            
            setGeneratedWod(finalWod);

        } catch (e: any) {
            console.error("WOD Generation Error:", e);
            setError(t('errorAlert.description'));
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b md:p-6">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
                        {t('title')}
                    </h1>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                 <div className="max-w-xl mx-auto space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="text-primary" />
                                {t('cardTitle')}
                            </CardTitle>
                             <CardDescription>
                                {t('cardDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4">
                            <Button 
                                onClick={handleGenerate} 
                                disabled={isLoading || isUserLoading}
                                size="lg"
                                className="w-full"
                            >
                                {isLoading ? t('generatingButton') : t('generateButton')}
                            </Button>
                            {isUserLoading && <Skeleton className="h-6 w-48" />}
                             {!isUserLoading && (!user || user.isAnonymous) && (
                                <Alert variant="default" className="border-blue-500/50 text-blue-500">
                                     <Info className="h-4 w-4 !text-blue-500" />
                                    <AlertTitle>{t('freePlanAlert.title')}</AlertTitle>
                                    <AlertDescription>
                                        {t.rich('freePlanAlert.description', {
                                            link: (chunks) => <Link href="/premium" className="font-bold underline ml-1">{chunks}</Link>
                                        })}
                                    </AlertDescription>
                                </Alert>
                            )}
                             {!isUserLoading && user?.premium && (
                                <p className="text-sm text-green-500 flex items-center gap-2">
                                    <Gem className="h-4 w-4" /> {t('premiumPlanMessage')}
                                </p>
                            )}
                        </CardContent>
                     </Card>

                    {isLoading && <GeneratingState />}

                    {error && (
                         <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>{t('errorAlert.title')}</AlertTitle>
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {generatedWod && (
                         <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-center">{t('result.title')}</h2>
                            <WodCard wod={generatedWod} source="personal" />
                            <p className="text-xs text-muted-foreground text-center">{t('result.savedMessage')}</p>
                         </div>
                    )}
                 </div>
            </main>
        </div>
    );
}
