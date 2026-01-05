
"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { UploadCloud, X, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import type { AnalyzeWodOutput } from "@/functions/src/ai/wod-schema";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { WodType, type WOD } from "@/lib/types";
import { useFirebase } from "@/firebase";
import { doc, collection, query, where, getDocs, setDoc, addDoc, updateDoc } from "firebase/firestore";
import { useUser, useAuth } from "@/firebase/provider";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { useTranslations } from "next-intl";
import { getFunctions, httpsCallable } from "firebase/functions";
import Turnstile from "./turnstile";


const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = document.createElement("img");
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return reject(new Error("Could not get canvas context"));
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL(file.type, 0.8); 
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });

export function FileUploader() {
  const t = useTranslations('FileUploader');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeWodOutput | null>(
    null
  );
  const [duplicateWod, setDuplicateWod] = useState<WOD | null>(null);
  const [shareToCommunity, setShareToCommunity] = useState(false);
  const [saveIntent, setSaveIntent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(Date.now());

  const { toast } = useToast();
  const router = useRouter();
  const { firestore } = useFirebase();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setAnalysisResult(null);
      setTurnstileToken(null);
      setTurnstileKey(Date.now());
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

  const handleAnalyze = async () => {
    if (!file) return;
    
    if (!turnstileToken) {
        toast({
            variant: "destructive",
            title: "Verification required",
            description: "Please complete the anti-robot verification.",
        });
        return;
    }

    setIsLoading(true);
    try {
      const photoDataUri = await toBase64(file);
      
      const functions = getFunctions();
      const analyzeWodFn = httpsCallable(functions, 'analyzeWod');
      const response = await analyzeWodFn({ photoDataUri, turnstileToken });
      const result = response.data as AnalyzeWodOutput;
      
      setAnalysisResult(result);
    } catch (error: any) {
      console.error("Analysis Error:", error);
      toast({
        variant: "destructive",
        title: t('analysisFailedTitle'),
        description: error.message || t('analysisFailedDescription'),
      });
    } finally {
      setIsLoading(false);
      setTurnstileKey(Date.now());
      setTurnstileToken(null);
    }
  };

  const performSave = async (userId: string, force: boolean = false) => {
    if (!analysisResult || !firestore || !file) return;

    setIsSaving(true);
    
    try {
        const wodsCollection = collection(firestore, 'users', userId, 'wods');

        // Duplicate check logic
        if (!force) {
            const q = query(
                wodsCollection,
                where("name", "==", analysisResult.name),
                where("type", "==", analysisResult.type)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const existingWod = querySnapshot.docs[0].data() as WOD;
                setDuplicateWod(existingWod);
                setIsSaving(false); 
                return; 
            }
        }
        
        const photoDataUri = await toBase64(file);
        const newWodRef = doc(wodsCollection);

        const wodData: Partial<WOD> = {
            id: newWodRef.id,
            userId: userId,
            name: analysisResult.name,
            type: analysisResult.type,
            description: analysisResult.description,
            date: new Date().toISOString(),
            imageUrl: photoDataUri,
            imageHint: analysisResult.imageHint,
            cardio: analysisResult.cardio,
            lifting: analysisResult.lifting,
            upperBody: analysisResult.upperBody,
            lowerBody: analysisResult.lowerBody
        };

        if (analysisResult.duration) {
            wodData.duration = analysisResult.duration;
        }

        await setDoc(newWodRef, wodData);

        if (shareToCommunity && user && !user.isAnonymous) {
            const userDisplayName = user.email?.split('@')[0] || 'Anonymous';
            const communityWodsCollection = collection(firestore, 'communityWods');
            const communityWodData = {
                ...wodData,
                userId: user.uid, // Keep owner ID for security rules
                userDisplayName
            };

            const newCommunityDocRef = await addDoc(communityWodsCollection, communityWodData);
            // Link the personal WOD to the community one
            await updateDoc(newWodRef, { communityWodId: newCommunityDocRef.id });
        }

        toast({
            title: t('wodSavedTitle'),
            description: t('wodSavedDescription'),
        });
        router.push("/dashboard");

    } catch (serverError) {
        let errorToEmit = serverError;
        if (serverError instanceof Error && serverError.message.includes('permission-denied')) {
             errorToEmit = new FirestorePermissionError({
                path: 'users/' + userId + '/wods',
                operation: 'create',
                requestResourceData: analysisResult,
            });
             errorEmitter.emit('permission-error', errorToEmit as FirestorePermissionError);
        }
        
        console.error("An unexpected error occurred during the save process:", errorToEmit);
        toast({
            variant: "destructive",
            title: t('saveFailedTitle'),
            description: t('saveFailedDescription'),
        });

    } finally {
        setIsSaving(false);
        if (force) setDuplicateWod(null);
    }
  };

  const handleSave = async () => {
    if (!analysisResult) return;
    if (user) {
      await performSave(user.uid);
    } else if (auth) {
      initiateAnonymousSignIn(auth);
      setSaveIntent(true);
    } else {
      toast({
        variant: "destructive",
        title: t('authErrorTitle'),
        description: t('authErrorDescription'),
      });
    }
  };

  const handleForceSave = async () => {
    if (user) {
        await performSave(user.uid, true);
    } else if (auth) {
        initiateAnonymousSignIn(auth);
        setSaveIntent(true);
    }
  };

  useEffect(() => {
    // This effect triggers the save ONLY if an intent was registered
    // and a user (anonymous or otherwise) has become available.
    if (saveIntent && user) {
      performSave(user.uid);
      setSaveIntent(false); // Reset intent after save attempt
    }
  }, [user, saveIntent, performSave]);


  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setAnalysisResult(null);
    setTurnstileToken(null);
  };
  
  const onTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const onTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const isActionDisabled = isLoading || isSaving || isUserLoading;

  const flatDescription = analysisResult?.description.map(s => s.content).join('\\n\\n') || '';

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (analysisResult) {
      const newDescription = [...analysisResult.description];
      if (newDescription.length > 0) {
        newDescription[0].title = 'Workout';
        newDescription[0].content = e.target.value;
        newDescription.splice(1);
      } else {
        newDescription.push({ title: 'Workout', content: e.target.value });
      }
      setAnalysisResult({ ...analysisResult, description: newDescription });
    }
  };


  if (isLoading) {
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
        <h2 className="text-2xl font-headline font-bold text-foreground">{t('analyzingTitle')}</h2>
        <p className="text-muted-foreground">{t('analyzingDescription')}</p>
      </div>
    );
  }


  return (
    <div className="w-full max-w-2xl mx-auto">
      <AlertDialog open={!!duplicateWod} onOpenChange={(open) => !open && setDuplicateWod(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('duplicateDialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('duplicateDialogDescription')}
                    <br/><br/>
                    <div className="p-4 border rounded-md bg-muted/50">
                        <div className="font-bold">{duplicateWod?.name}</div>
                        <div className="text-sm text-muted-foreground">{duplicateWod?.date ? t('duplicateDialogSavedOn', { date: format(new Date(duplicateWod.date), 'PPP') }) : ''}</div>
                    </div>
                    <br/>
                    {t('duplicateDialogQuestion')}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDuplicateWod(null)}>{t('duplicateDialogCancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleForceSave}>{t('duplicateDialogConfirm')}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!preview ? (
        <div className="space-y-4">
            <div
            {...getRootProps()}
            className={cn("relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer border-primary/50 bg-primary/10 transition-colors hover:bg-primary/20", {
                "cursor-not-allowed opacity-50": isActionDisabled,
            })}
            >
            <input {...getInputProps()} disabled={isActionDisabled}/>
            <div className="text-center">
                <UploadCloud className="w-16 h-16 mx-auto text-primary" />
                <p className="mt-4 text-lg font-semibold text-foreground">
                {isDragActive
                    ? t('dragActivePrompt')
                    : t('dragAndDropPrompt')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                {t('fileTypes')}
                </p>
            </div>
            </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative w-full p-4 border border-dashed rounded-lg">
            <Image
              src={preview}
              alt={t('wodPreviewAlt')}
              width={600}
              height={400}
              className="object-contain w-full h-auto max-h-96 rounded-md"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 rounded-full h-8 w-8"
              onClick={handleRemove}
              disabled={isActionDisabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!analysisResult ? (
             <div className="flex flex-col items-center gap-4">
                <Button
                onClick={handleAnalyze}
                disabled={isActionDisabled || !turnstileToken}
                className="w-full"
                >
                {t('analyzeButton')}
                </Button>
                 <Turnstile key={turnstileKey} onSuccess={onTurnstileSuccess} onExpire={onTurnstileExpire} />
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold font-headline">
                {t('analysisResultTitle')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input
                  value={analysisResult.name}
                  onChange={(e) =>
                    analysisResult && setAnalysisResult({ ...analysisResult, name: e.target.value })
                  }
                  placeholder={t('wodNamePlaceholder')}
                  disabled={isActionDisabled}
                />
                 <Select
                  value={analysisResult.type}
                  onValueChange={(value: WodType) => analysisResult && setAnalysisResult({...analysisResult, type: value})}
                  disabled={isActionDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('wodTypePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="For Time">For Time</SelectItem>
                    <SelectItem value="AMRAP">AMRAP</SelectItem>
                    <SelectItem value="EMOM">EMOM</SelectItem>
                    <SelectItem value="Tabata">Tabata</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input
                    type="number"
                    value={analysisResult.duration || ''}
                    onChange={(e) =>
                        analysisResult && setAnalysisResult({ ...analysisResult, duration: e.target.value ? parseInt(e.target.value) : undefined })
                    }
                    placeholder={t('durationPlaceholder')}
                    disabled={isActionDisabled}
                    />
               </div>

              <Textarea
                value={flatDescription}
                onChange={handleDescriptionChange}
                rows={10}
                className="whitespace-pre-wrap font-mono text-sm"
                placeholder="WOD Description"
                disabled={isActionDisabled}
              />
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="share" 
                  checked={shareToCommunity} 
                  onCheckedChange={(checked) => setShareToCommunity(checked as boolean)}
                  disabled={isActionDisabled || !!user?.isAnonymous}
                />
                <Label htmlFor="share" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {t('shareCheckbox')}
                </Label>
              </div>
               {user && user.isAnonymous && (
                 <p className="text-xs text-muted-foreground">{t('shareAnonymousHelp')}</p>
               )}

              <Button onClick={handleSave} className="w-full" disabled={isActionDisabled}>
                {isSaving ? (
                     <>
                        <LoaderCircle className="animate-spin mr-2" />
                        {t('savingButton')}
                    </>
                ): t('saveWodButton')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
