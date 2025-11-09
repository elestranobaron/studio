
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Flag,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import type { WOD } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Logo }from "./icons";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

function ShareModal({ wod, finalTime }: { wod: WOD; finalTime: string }) {
    const descriptionId = `share-description-${wod.id}`;
    
    // Find the 'Metcon' section, or fall back to the first section if not found.
    const metconSection = Array.isArray(wod.description)
        ? wod.description.find(s => s.title.toLowerCase() === 'metcon') || wod.description[0]
        : { title: 'Workout', content: wod.description };
    
    // Handle cases where description might be a string (legacy) or not exist
    const descriptionContent = metconSection ? metconSection.content : 'No description available.';

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline"><Share2 className="mr-2 h-4 w-4"/>Share Result</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" aria-describedby={descriptionId}>
                <DialogHeader>
                    <DialogTitle className="font-headline">Share your achievement!</DialogTitle>
                    <DialogDescription id={descriptionId}>
                        Take a screenshot of your result to share it on social media.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-4 bg-background rounded-lg border my-4">
                    <h3 className="font-headline text-primary text-2xl">{wod.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{wod.type}</p>
                     <Separator />
                    <div className="my-4 text-center">
                        <p className="text-5xl font-bold font-mono text-foreground">{finalTime}</p>
                        <p className="text-lg text-muted-foreground">Final Time</p>
                    </div>
                     <Separator />
                     <ScrollArea className="h-24 my-4">
                        <p className="text-sm whitespace-pre-wrap font-mono text-muted-foreground p-2">
                           {descriptionContent}
                        </p>
                    </ScrollArea>
                    <div className="flex justify-center opacity-70">
                      <Logo className="w-auto h-24" showText={false} />
                    </div>
                </div>
                 <p className="text-center text-sm text-muted-foreground">
                    Take a screenshot to share on Instagram!
                </p>
            </DialogContent>
        </Dialog>
    )
}

export function TimerClient({ wod }: { wod: WOD }) {
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finalTime, setFinalTime] = useState(0);

  const totalDuration = wod.duration ? wod.duration * 60 : 0;
  const isCountDown = wod.type === "AMRAP" || wod.type === "EMOM";
  
  const resetTimer = useCallback(() => {
    setIsActive(false);
    setIsFinished(false);
    setFinalTime(0);
    setTime(isCountDown ? totalDuration : 0);
  }, [isCountDown, totalDuration]);

  // Set initial time on component mount
  useEffect(() => {
    resetTimer();
  }, [resetTimer]);


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && !isFinished) {
      interval = setInterval(() => {
        setTime((prevTime) => {
          if (isCountDown) {
            if (prevTime <= 1) {
              handleFinish();
              return 0;
            }
            return prevTime - 1;
          }
          return prevTime + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isFinished, isCountDown]);


  const handleStartPause = () => {
    if (isFinished) return;
    setIsActive(!isActive);
  };

  const handleFinish = () => {
    setIsActive(false);
    setIsFinished(true);
    setFinalTime(isCountDown ? totalDuration : time);
  };
  
  const progress = isCountDown
    ? (time / totalDuration) * 100
    : 100;
  const strokeDasharray = 2 * Math.PI * 140; // Circumference of the circle
  const strokeDashoffset = strokeDasharray * (1 - progress / 100);

  const renderTimerCircle = () => {
    return (
        <div className="relative h-80 w-80 md:h-96 md:w-96">
            <svg className="absolute inset-0" viewBox="0 0 300 300">
                <circle
                cx="150"
                cy="150"
                r="140"
                strokeWidth="12"
                className="stroke-muted/20"
                fill="transparent"
                />
                <circle
                cx="150"
                cy="150"
                r="140"
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 150 150)"
                className={cn(
                    "stroke-primary transition-all duration-1000 ease-linear",
                    {"animate-pulse": isActive && isCountDown}
                )}
                fill="transparent"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                 <p className="font-mono text-7xl md:text-8xl font-bold tracking-tighter text-foreground">
                    {formatTime(time)}
                </p>
            </div>
      </div>
    );
  };


  if (isFinished) {
    return (
      <div className="text-center space-y-6 flex flex-col items-center">
        <h2 className="text-4xl font-headline text-foreground">Workout Complete!</h2>
        <Card className="max-w-sm w-full bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="font-headline text-primary">{wod.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-6xl font-bold font-mono">{formatTime(isCountDown ? totalDuration : finalTime)}</p>
                <p className="text-muted-foreground">{wod.type === "For Time" ? "Total Time" : "Time Completed"}</p>
            </CardContent>
        </Card>
        <div className="flex gap-4">
            <Button onClick={resetTimer} size="lg"><RotateCcw className="mr-2 h-4 w-4" /> Go Again</Button>
            <ShareModal wod={wod} finalTime={formatTime(isCountDown ? totalDuration : finalTime)} />
        </div>
         <div className="pt-8 opacity-50">
            <Logo className="w-auto h-24" showText={false}/>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      {renderTimerCircle()}
      <div className="flex justify-center gap-4">
        <Button
          onClick={handleStartPause}
          size="lg"
          className="w-36"
          variant={isActive ? "secondary" : "default"}
        >
          {isActive ? (
            <><Pause className="mr-2 h-5 w-5" /> Pause</>
          ) : (
            <><Play className="mr-2 h-5 w-5" /> Start</>
          )}
        </Button>
        <Button onClick={resetTimer} variant="outline" size="lg" className="w-36">
          <RotateCcw className="mr-2 h-5 w-5" /> Reset
        </Button>
      </div>
      <Button onClick={handleFinish} variant="destructive" size="lg" disabled={!isActive && time === 0}>
        <Flag className="mr-2 h-5 w-5" /> Finish
      </Button>
    </div>
  );
}
