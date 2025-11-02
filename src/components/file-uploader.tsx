"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const mockAnalysisResult = `FRAN

21-15-9 Reps For Time:
- Thrusters (95/65 lb)
- Pull-ups`;

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

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

  const handleAnalyze = () => {
    setIsLoading(true);
    setTimeout(() => {
      setAnalysisResult(mockAnalysisResult);
      setIsLoading(false);
    }, 1500);
  };

  const handleSave = () => {
    toast({
      title: "WOD Saved!",
      description: "Your new WOD has been added to your dashboard.",
    });
    router.push("/dashboard");
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setAnalysisResult(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {!preview ? (
        <div
          {...getRootProps()}
          className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer border-primary/50 bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          <input {...getInputProps()} />
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
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!analysisResult ? (
            <Button onClick={handleAnalyze} disabled={isLoading} className="w-full">
              {isLoading ? "Analyzing..." : "Analyze WOD"}
            </Button>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold font-headline">Analysis Result</h3>
              <Textarea
                value={analysisResult}
                onChange={(e) => setAnalysisResult(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <Button onClick={handleSave} className="w-full">
                Save WOD
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
