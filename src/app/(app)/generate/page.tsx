
'use client';

import { useState } from "react";
import { useUser, useFirebase } from "@/firebase";
import { useRouter } from 'next/navigation';
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
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


function GeneratingState() {
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
        Generating your WOD...
      </h2>
      <p className="text-muted-foreground">
        The AI Coach is warming up. This might take a moment.
      </p>
    </div>
  );
}

export default function GenerateWodPage() {
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
        
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: "Authentication error" });
            setIsLoading(false);
            return;
        }

        try {
            // Here you would check for user's quota.
            // For now, we will simulate it.
            // In a real app, this logic would be more robust.
            // await checkAndDecrementQuota();

            const result = await generateWod({});
            const newWodId = doc(collection(firestore, 'temp')).id; // Just for a unique ID
            const placeholderImageUrl = `https://picsum.photos/seed/${newWodId}/600/400`;

            const newWod: WOD = {
                id: newWodId,
                userId: user.uid,
                name: result.name,
                type: result.type,
                description: result.description,
                date: new Date().toISOString(),
                imageUrl: placeholderImageUrl,
                imageHint: result.imageHint,
                duration: result.duration,
            };
            setGeneratedWod(newWod);
        } catch (e: any) {
            console.error("WOD Generation Error:", e);
            setError("The AI coach is resting. Please try again in a moment.");
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
                        AI WOD Generator
                    </h1>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                 <div className="max-w-xl mx-auto space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="text-primary" />
                                WODBot 3000
                            </CardTitle>
                             <CardDescription>
                                Feeling uninspired? Let our AI Coach generate a unique and challenging workout for you.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4">
                            <Button 
                                onClick={handleGenerate} 
                                disabled={isLoading || isUserLoading}
                                size="lg"
                                className="w-full"
                            >
                                {isLoading ? "Generating..." : "Generate a New WOD"}
                            </Button>
                            {isUserLoading && <Skeleton className="h-6 w-48" />}
                             {!isUserLoading && user && !user.premium && (
                                <Alert variant="default" className="border-blue-500/50 text-blue-500">
                                     <Info className="h-4 w-4 !text-blue-500" />
                                    <AlertTitle>Free Plan</AlertTitle>
                                    <AlertDescription>
                                        You have a limited number of daily generations. 
                                        <Link href="/premium" className="font-bold underline ml-1">Go Premium</Link> for unlimited access.
                                    </AlertDescription>
                                </Alert>
                            )}
                             {!isUserLoading && user?.premium && (
                                <p className="text-sm text-green-500 flex items-center gap-2">
                                    <Gem className="h-4 w-4" /> Unlimited generations enabled.
                                </p>
                            )}
                        </CardContent>
                     </Card>

                    {isLoading && <GeneratingState />}

                    {error && (
                         <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Generation Failed</AlertTitle>
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {generatedWod && (
                         <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-center">Your Generated WOD</h2>
                            <WodCard wod={generatedWod} source="personal" />
                            <p className="text-xs text-muted-foreground text-center">Note: This is a temporary preview. Go to the timer to automatically save it to your dashboard.</p>
                         </div>
                    )}
                 </div>
            </main>
        </div>
    );
}
