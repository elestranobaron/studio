
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { UploadCloud, X, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { analyzeWod } from "@/ai/flows/analyze-wod-flow";
import type { AnalyzeWodOutput } from "@/ai/schema/wod-schema";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { WodType, type WOD } from "@/lib/types";
import { useFirebase } from "@/firebase";
import { doc, collection, query, where, getDocs, setDoc } from "firebase/firestore";
import { useUser, useAuth } from "@/firebase/provider";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { signInAnonymously } from "firebase/auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";


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

  const { toast } = useToast();
  const router = useRouter();
  const { firestore } = useFirebase();
  const auth = useAuth();
  const { user } = useUser();

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
      const result = await analyzeWod({ photoDataUri });
      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis Error:", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not analyze the WOD image. Please try again.",
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
                where("type", "==", analysisResult.type),
                where("description", "==", analysisResult.description)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const existingWod = querySnapshot.docs[0].data() as WOD;
                setDuplicateWod(existingWod);
                setIsSaving(false); // Stop saving process
                return; // Exit function
            }
        }
        
        const photoDataUri = await toBase64(file);
        const newWodRef = doc(wodsCollection);

        const wodData: WOD = {
            id: newWodRef.id,
            userId: userId,
            name: analysisResult.name,
            type: analysisResult.type,
            description: analysisResult.description,
            date: format(new Date(), "yyyy-MM-dd"),
            imageUrl: photoDataUri,
            imageHint: analysisResult.imageHint,
        };

        // Use non-blocking setDoc with error catching
        setDoc(newWodRef, wodData)
            .then(() => {
                toast({
                    title: "WOD Saved!",
                    description: "Your new WOD has been added to your dashboard.",
                });
                router.push("/dashboard");
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: newWodRef.path,
                    operation: 'create',
                    requestResourceData: wodData,
                });
                errorEmitter.emit('permission-error', permissionError);
                
                // We don't show a toast here because the error listener will throw
                // which is a better DX.
            })
            .finally(() => {
                setIsSaving(false);
                if (force) setDuplicateWod(null);
            });

    } catch (error) {
        console.error("An unexpected error occurred during the save process:", error);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: "An unexpected error occurred while saving the WOD.",
        });
        setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!analysisResult) return;
  
    if (user) {
      await performSave(user.uid);
    } else if (auth) {
      try {
        setIsSaving(true);
        const userCredential = await signInAnonymously(auth);
        if (userCredential.user) {
          await performSave(userCredential.user.uid);
        } else {
          throw new Error("Anonymous sign-in did not return a user.");
        }
      } catch (error) {
        console.error("Anonymous sign-in or save failed:", error);
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: "Could not create a temporary profile to save your WOD. Please try again.",
        });
        setIsSaving(false);
      }
    } else {
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: "Authentication service is not available.",
        });
        setIsSaving(false);
    }
  };

  const handleForceSave = async () => {
    setDuplicateWod(null); // Close dialog first
    if (user) {
        await performSave(user.uid, true);
    } else if (auth) {
        try {
            setIsSaving(true);
            const userCredential = await signInAnonymously(auth);
            if(userCredential.user) {
                await performSave(userCredential.user.uid, true);
            }
        } catch(error) {
            console.error("Anonymous sign-in or force save failed:", error);
            toast({
                variant: "destructive",
                title: "Save Failed",
                description: "Could not save the WOD. Please try again.",
            });
            setIsSaving(false);
        }
    }
  };


  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setAnalysisResult(null);
  };
  
  const isActionDisabled = isLoading || isSaving;


  return (
    <div className="w-full max-w-2xl mx-auto">
      <AlertDialog open={!!duplicateWod} onOpenChange={() => setDuplicateWod(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Duplicate WOD Detected</AlertDialogTitle>
                <AlertDialogDescription>
                    This workout looks identical to a WOD you've already saved.
                    <br/><br/>
                    <div className="p-4 border rounded-md bg-muted/50">
                        <p className="font-bold">{duplicateWod?.name}</p>
                        <p className="text-sm text-muted-foreground">{duplicateWod?.date ? `Saved on ${format(new Date(duplicateWod.date), 'PPP')}` : ''}</p>
                    </div>
                    <br/>
                    Do you still want to save this new one?
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
              {isLoading ? (
                <>
                  <LoaderCircle className="animate-spin mr-2" />
                  Analyzing...
                </>
              ) : "Analyze WOD"}
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
                    setAnalysisResult({ ...analysisResult, name: e.target.value })
                  }
                  placeholder="WOD Name"
                  disabled={isActionDisabled}
                />
                 <Select
                  value={analysisResult.type}
                  onValueChange={(value: WodType) => setAnalysisResult({...analysisResult, type: value})}
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

              <Textarea
                value={analysisResult.description}
                onChange={(e) =>
                  setAnalysisResult({
                    ...analysisResult,
                    description: e.target.value,
                  })
                }
                rows={10}
                className="whitespace-pre-wrap font-mono text-sm"
                placeholder="WOD Description"
                disabled={isActionDisabled}
              />
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
