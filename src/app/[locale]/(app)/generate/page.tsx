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
    const { firestore } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const { toggleSidebar } = useSidebar();


    const handleGenerate = async () => {
        setIsLoading(true);
        setGeneratedWod(null);
        
        if (!firestore) {
            toast({ variant: 'destructive', title: "Service not available" });
            setIsLoading(false);
            return;
        }

        if (!turnstileToken) {
            toast({
                variant: "destructive",
                title: "Verification required",
                description: "Please complete the anti-robot verification."
            });
            setIsLoading(false);
            return;
        }

        try {
            const functions = getFunctions();
            const generateWodFn = httpsCallable(functions, 'generateWod');
            const response = await generateWodFn({ turnstileToken });
            const data = response.data as any;
            
            const tempId = doc(collection(firestore, 'temp')).id;
            const placeholderImageUrl = `https://picsum.photos/seed/${tempId}/600/400`;

            const newWod: WOD = {
                id: data.id || tempId,
                userId: user?.uid || 'anonymous',
                name: data.name,
                type: data.type,
                description: data.description,
                date: new Date().toISOString(),
                imageUrl: placeholderImageUrl,
                imageHint: data.imageHint,
                duration: data.duration,
                cardio: data.cardio,
                lifting: data.lifting,
                upperBody: data.upperBody,
                lowerBody: data.lowerBody,
            };
            
            setGeneratedWod(newWod);

        } catch (e: any) {
            console.error("DEBUG - Full Firebase Error Object:", e);
            console.error("DEBUG - Error Details:", e.details);
            
            const detailedError = e.details 
                ? (typeof e.details === 'object' ? JSON.stringify(e.details, null, 2) : e.details)
                : `${e.code || 'unknown_code'}: ${e.message || 'No message'}`;

             toast({
                variant: "destructive",
                title: t('errorAlert.title'),
                description: (
                    <div className="mt-2 w-full max-h-60 overflow-auto rounded-md bg-slate-950 p-4 text-[10px]">
                        <code className="text-white whitespace-pre-wrap">{detailedError}</code>
                    </div>
                ),
                duration: 30000,
            });
        } finally {
            setIsLoading(false);
            setTurnstileToken(null);
            setTurnstileKey(Date.now());
        }
    };
    
    const onTurnstileSuccess = useCallback((token: string) => {
        setTurnstileToken(token);
    }, []);

    const onTurnstileExpire = useCallback(() => {
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