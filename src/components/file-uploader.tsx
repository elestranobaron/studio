
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
import { doc, collection } from "firebase/firestore";
import { useUser, useAuth } from "@/firebase/provider";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { signInAnonymously } from "firebase/auth";

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
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

  const performSave = (userId: string) => {
    if (!analysisResult || !firestore) return;

    setIsSaving(true);
    try {
        const wodsCollection = collection(firestore, 'users', userId, 'wods');
        const newWodRef = doc(wodsCollection);
        const randomImageId = Math.floor(Math.random() * 1000);

        const wodData: WOD = {
            id: newWodRef.id,
            name: analysisResult.name,
            type: analysisResult.type,
            description: analysisResult.description,
            date: format(new Date(), "yyyy-MM-dd"),
            userId: userId,
            imageUrl: `https://picsum.photos/seed/${randomImageId}/600/400`,
            imageHint: analysisResult.imageHint,
        };

        setDocumentNonBlocking(newWodRef, wodData, { merge: false });

        toast({
            title: "WOD Saved!",
            description: "Your new WOD has been added to your dashboard.",
        });

        router.push("/dashboard");

    } catch (error) {
        console.error("Failed to save WOD:", error);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: "An unexpected error occurred while saving the WOD.",
        });
    } finally {
        setIsSaving(false);
    }
  }

  const handleSave = async () => {
    if (!analysisResult) return;

    if (user) {
        performSave(user.uid);
    } else if (auth) {
        setIsSaving(true); // Show loading state on the save button
        try {
            const userCredential = await signInAnonymously(auth);
            if (userCredential.user) {
                performSave(userCredential.user.uid);
            } else {
                 throw new Error("Anonymous sign-in did not return a user.");
            }
        } catch(error) {
            console.error("Anonymous sign-in failed:", error);
            toast({
                variant: "destructive",
                title: "Authentication Failed",
                description: "Could not create a temporary profile to save your WOD. Please try again.",
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
