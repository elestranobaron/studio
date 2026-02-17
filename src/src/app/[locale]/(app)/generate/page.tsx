
'use client';

import { useState, useCallback } from "react";
import { useUser, useFirebase } from "@/firebase";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useToast } from "@/components/ui/use-toast";
import { WodCard } from "@/components/wod-card";
import { type WOD } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gem, Zap, Info, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import Turnstile from "@/components/turnstile";
import { getFunctions, httpsCallable } from "firebase/functions";
import React from "react";
import { doc, collection } from "firebase/firestore";
import { FirebaseError } from "firebase/app";


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
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileKey, setTurnstileKey] = useState(Date.now());


    const { user, isUserLoading } = useUser();
    const { firestore, firebaseApp } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const { toggleSidebar } = useSidebar();


    const handleGenerate = async () => {
        setIsLoading(true);
        setGeneratedWod(null);
        
        console.log("[GenerateWodPage] 1 - handleGenerate started");

        if (!firebaseApp) {
            console.error("[GenerateWodPage] Firebase app not initialized");
            toast({ variant: 'destructive', title: "Firebase Error", description: "Firebase is not ready." });
            setIsLoading(false);
            return;
        }

        if (!turnstileToken) {
            console.warn("[GenerateWodPage] Turnstile token missing");
            toast({
                variant: "destructive",
                title: "Verification required",
                description: "Please complete the Turnstile verification."
            });
            setIsLoading(false);
            return;
        }

        try {
            console.log("[GenerateWodPage] 2 - Getting functions instance (us-central1)");
            const functions = getFunctions(firebaseApp, 'us-central1');
            
            console.log("[GenerateWodPage] 3 - Creating callable for 'generateWod'");
            const generateWodFn = httpsCallable(functions, 'generateWod');
            
            console.log("[GenerateWodPage] 4 - Calling function with token:", turnstileToken.substring(0, 10) + "...");
            const response = await generateWodFn({ turnstileToken });
            
            console.log("[GenerateWodPage] 5 - Response received:", response);
            const wodData = response.data as any;
            
            if (!wodData || !wodData.name) {
                console.error("[GenerateWodPage] Invalid WOD data structure:", wodData);
                throw new Error("Invalid data format received from server.");
            }

            if (!firestore) {
                throw new Error("Firestore instance missing for ID generation.");
            }

            const tempId = doc(collection(firestore, 'temp')).id;
            const placeholderImageUrl = `https://picsum.photos/seed/${tempId}/600/400`;

            const newWod: WOD = {
                id: wodData.id || tempId,
                userId: user?.uid || 'anonymous',
                name: wodData.name,
                type: wodData.type,
                description: wodData.description,
                date: new Date().toISOString(),
                imageUrl: placeholderImageUrl,
                imageHint: wodData.imageHint,
                duration: wodData.duration,
                cardio: wodData.cardio,
                lifting: wodData.lifting,
                upperBody: wodData.upperBody,
                lowerBody: wodData.lowerBody,
            };
            
            setGeneratedWod(newWod);
            console.log("[GenerateWodPage] 6 - WOD set successfully");

        } catch (e: any) {
            console.error("[GenerateWodPage] 7 - CATCH BLOCK REACHED");
            console.error("[GenerateWodPage] Error details:", e);
            
            let errMsg = "An unexpected error occurred.";
            let errCode = "unknown";

            if (e instanceof FirebaseError) {
                errCode = e.code;
                errMsg = e.message;
                console.error(`[GenerateWodPage] Firebase Error Code: ${e.code}`);
            } else if (e.code) {
                errCode = e.code;
                errMsg = e.message || errMsg;
            }

             toast({
                variant: "destructive",
                title: t('errorAlert.title'),
                description: `Error ${errCode}: ${errMsg}`,
            });
        } finally {
            setIsLoading(false);
            setTurnstileToken(null);
            setTurnstileKey(Date.now());
            console.log("[GenerateWodPage] 8 - Process finished");
        }
    };
    
    const onTurnstileSuccess = useCallback((token: string) => {
        console.log("[GenerateWodPage] Turnstile verified");
        setTurnstileToken(token);
    }, []);

    const onTurnstileExpire = useCallback(() => {
        console.log("[GenerateWodPage] Turnstile expired");
        setTurnstileToken(null);
    }, []);

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b md:p-6">
                <div className="flex items-center gap-2 md:hidden">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div onClick={toggleSidebar} className="flex items-center gap-4 cursor-pointer">
                        <h1 className="text-2xl font-bold tracking-tight font-headline">
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
                                disabled={isLoading || isUserLoading || !turnstileToken}
                                size="lg"
                                className="w-full"
                            >
                                {isLoading ? t('generatingButton') : t('generateButton')}
                            </Button>
                            <Turnstile key={turnstileKey} onSuccess={onTurnstileSuccess} onExpire={onTurnstileExpire} />
                            
                            {isUserLoading && <Skeleton className="h-6 w-48" />}
                            
                             {!isUserLoading && (!user || user.isAnonymous) && (
                                <Alert variant="default" className="border-blue-500/50 text-blue-500">
                                     <Info className="h-4 w-4 !text-blue-500" />
                                    <AlertTitle>{t('freePlanAlert.title')}</AlertTitle>
                                    <AlertDescription>
                                        Please sign in to go Premium and unlock unlimited generations.
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
