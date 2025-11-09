
"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { UploadCloud, X, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { AnalyzeWodOutput } from "@/ai/schema/wod-schema";
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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeWodOutput | null>(
    null
  );
  const [duplicateWod, setDuplicateWod] = useState<WOD | null>(null);
  const [shareToCommunity, setShareToCommunity] = useState(false);

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
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

  const handleAnalyze = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const photoDataUri = await toBase64(file);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoDataUri }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `Request failed with status ${response.status}`);
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis Error:", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "The WOD image could not be analyzed. Please try again.",
      });
    } finally {
      setIsLoading(false);
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
        };

        if (analysisResult.duration) {
            wodData.duration = analysisResult.duration;
        }

        await setDoc(newWodRef, wodData);

        if (shareToCommunity && user) {
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
            title: "WOD Saved!",
            description: "Your new WOD has been added to your dashboard.",
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
            title: "Save Failed",
            description: "An error occurred while saving the WOD.",
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
      // After anonymous sign-in, the user object will update.
      // We set a state that will be caught by the useEffect to trigger the save.
      setIsSaving(true);
    } else {
      toast({
        variant: "destructive",
        title: "Could not save",
        description: "Authentication services are not available.",
      });
    }
  };

  const handleForceSave = async () => {
    if (user) {
        await performSave(user.uid, true);
    } else if (auth) {
        initiateAnonymousSignIn(auth);
        setIsSaving(true); 
    }
  };

  useEffect(() => {
    // This effect now correctly handles saving AFTER an anonymous user has been created.
    // The `isSaving` flag acts as an "intent to save".
    if (isSaving && user) {
      performSave(user.uid);
      // Reset the intent after the save is attempted.
      setIsSaving(false); 
    }
  }, [user, isSaving]);


  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setAnalysisResult(null);
  };
  
  const isActionDisabled = isLoading || isSaving || isUserLoading;

  const flatDescription = analysisResult?.description.map(s => s.content).join('\n\n') || '';

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
        <h2 className="text-2xl font-headline font-bold text-foreground">Analyzing WOD...</h2>
        <p className="text-muted-foreground">The AI is warming up. This might take a moment.</p>
      </div>
    );
  }


  return (
    <div className="w-full max-w-2xl mx-auto">
      <AlertDialog open={!!duplicateWod} onOpenChange={(open) => !open && setDuplicateWod(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Duplicate WOD Detected</AlertDialogTitle>
                <AlertDialogDescription>
                    This workout seems identical to a WOD you've already saved.
                    <br/><br/>
                    <div className="p-4 border rounded-md bg-muted/50">
                        <div className="font-bold">{duplicateWod?.name}</div>
                        <div className="text-sm text-muted-foreground">{duplicateWod?.date ? `Saved on ${format(new Date(duplicateWod.date), 'PPP')}` : ''}</div>
                    </div>
                    <br/>
                    Do you want to save this new one anyway?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDuplicateWod(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleForceSave}>Save Anyway</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!preview ? (
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
                ? "Drop the image here..."
                : "Drag & drop your WOD image, or click to select"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
            PNG, JPG, or GIF (max 5MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative w-full p-4 border border-dashed rounded-lg">
            <Image
              src={preview}
              alt="WOD preview"
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
            <Button
              onClick={handleAnalyze}
              disabled={isActionDisabled}
              className="w-full"
            >
              Analyze WOD
            </Button>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold font-headline">
                Analysis Result
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input
                  value={analysisResult.name}
                  onChange={(e) =>
                    analysisResult && setAnalysisResult({ ...analysisResult, name: e.target.value })
                  }
                  placeholder="WOD Name"
                  disabled={isActionDisabled}
                />
                 <Select
                  value={analysisResult.type}
                  onValueChange={(value: WodType) => analysisResult && setAnalysisResult({...analysisResult, type: value})}
                  disabled={isActionDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="WOD Type" />
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
                    placeholder="Duration (minutes)"
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
                  disabled={isActionDisabled || (user && user.isAnonymous)}
                />
                <Label htmlFor="share" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Share with the Community
                </Label>
              </div>
               {user && user.isAnonymous && (
                 <p className="text-xs text-muted-foreground">Sign up for an account to share your WODs with the community.</p>
               )}

              <Button onClick={handleSave} className="w-full" disabled={isActionDisabled}>
                {isSaving ? (
                     <>
                        <LoaderCircle className="animate-spin mr-2" />
                        Saving...
                    </>
                ): "Save WOD"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
