
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Flag,
  Share2,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import type { WOD } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";
import { playStartSound, playFinishSound, playCountdownTick, playCountdownEnd } from "@/lib/sounds";
import { WodContentParser } from "./wod-content-parser";

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

function ShareModal({ wod, finalTime }: { wod: WOD; finalTime: string }) {
    
    const getMainWorkoutContent = () => {
        if (!wod.description) return "";

        // Handle both string and array descriptions
        if (!Array.isArray(wod.description)) {
            return wod.description;
        }

        const metconKeywords = ["METCON", "CONDITIONING"];
        const metconSection = wod.description.find(section => 
            metconKeywords.some(keyword => section.title.toUpperCase().includes(keyword))
        );
        
        // If a metcon section is found, return its content.
        if (metconSection) {
            return metconSection.content;
        }

        // FALLBACK: If no specific metcon section, return the last section's content.
        if (wod.description.length > 0) {
            return wod.description[wod.description.length - 1].content;
        }

        // If all else fails, return an empty string.
        return "";
    };

    const mainWorkoutContent = getMainWorkoutContent();

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline"><Share2 className="mr-2 h-4 w-4"/>Share Result</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md p-0 bg-background border-2 border-primary/50 shadow-2xl shadow-primary/20">
                <DialogHeader className="sr-only">
                    <DialogTitle>WOD Result: {wod.name}</DialogTitle>
                    <DialogDescription>Your final time was {finalTime}. This card is ready for sharing.</DialogDescription>
                </DialogHeader>
                <div className="p-6 flex flex-col gap-4 text-center">
                    <div>
                        <p className="text-muted-foreground text-sm font-semibold tracking-widest">FINAL TIME</p>
                        <p className="text-8xl font-bold font-mono text-primary -my-2">{finalTime}</p>
                    </div>
                    
                    <div className="space-y-1">
                        <h3 className="font-headline text-foreground text-3xl">{wod.name}</h3>
                        <p className="text-sm text-muted-foreground">{wod.type}</p>
                    </div>
                     
                     <Separator className="my-2 bg-border/50" />

                     <div className="text-left w-full">
                        <WodContentParser content={mainWorkoutContent} />
                    </div>

                    <div className="pt-4 mt-auto text-center">
                        <span className="text-xl font-bold font-headline text-primary tracking-wider opacity-60">
                            WODBurner
                        </span>
                    </div>

                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full text-center">
                         <p className="text-xs text-muted-foreground/50 flex items-center justify-center gap-2">
                            <Camera className="h-3 w-3"/> Ready for screenshot!
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function TimerClient({ wod }: { wod: WOD }) {
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finalTime, setFinalTime] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(false);

  const totalDuration = wod.duration ? wod.duration * 60 : 0;
  const isCountDownTimer = wod.type === "AMRAP" || wod.type === "EMOM";
  
  const resetTimer = useCallback(() => {
    setIsActive(false);
    setIsFinished(false);
    setFinalTime(0);
    setTime(isCountDownTimer ? totalDuration : 0);
    setCountdown(3);
    setIsCountingDown(false);
  }, [isCountDownTimer, totalDuration]);

  // Set initial time on component mount
  useEffect(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isCountingDown) {
        if (countdown > 0) {
            playCountdownTick();
        } else {
            playCountdownEnd();
        }
        interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    setIsCountingDown(false);
                    setIsActive(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    } else if (isActive && !isFinished) {
      interval = setInterval(() => {
        setTime((prevTime) => {
          if (isCountDownTimer) {
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
  }, [isActive, isFinished, isCountDownTimer, isCountingDown, countdown]);


  const handleStartPause = () => {
    if (isFinished) return;
    
    if (isActive) {
        setIsActive(false);
    } else {
        if ((isCountDownTimer || wod.type === 'Tabata') && time === (isCountDownTimer ? totalDuration : 0)) {
            setIsCountingDown(true);
        } else {
            playStartSound();
            setIsActive(true);
        }
    }
  };

  const handleFinish = () => {
    playFinishSound();
    setIsActive(false);
    setIsFinished(true);
    setFinalTime(isCountDownTimer ? totalDuration : time);
  };
  
  const progress = isCountDownTimer
    ? (time / totalDuration) * 100
    : 100;
  const strokeDasharray = 2 * Math.PI * 140; // Circumference of the circle
  const strokeDashoffset = strokeDasharray * (1 - progress / 100);

  const renderTimerCircle = () => {
    if (isCountingDown) {
        return (
            <div className="relative h-80 w-80 md:h-96 md:w-96 flex items-center justify-center">
                 <p className="font-mono text-9xl font-bold tracking-tighter text-primary animate-ping">
                    {countdown}
                </p>
            </div>
        )
    }
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
                    {"animate-pulse": isActive && isCountDownTimer}
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
                <p className="text-6xl font-bold font-mono">{formatTime(isCountDownTimer ? totalDuration : finalTime)}</p>
                <p className="text-muted-foreground">{wod.type === "For Time" ? "Total Time" : "Time Completed"}</p>
            </CardContent>
        </Card>
        <div className="flex gap-4">
            <Button onClick={resetTimer} size="lg"><RotateCcw className="mr-2 h-4 w-4" /> Go Again</Button>
            <ShareModal wod={wod} finalTime={formatTime(isCountDownTimer ? totalDuration : finalTime)} />
        </div>
         <div className="pt-8 opacity-50">
            <span className="text-xl font-bold font-headline text-primary tracking-wider">
               WODBurner
            </span>
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
          disabled={isCountingDown}
        >
          {isActive ? (
            <><Pause className="mr-2 h-5 w-5" /> Pause</>
          ) : (
            <><Play className="mr-2 h-5 w-5" /> Start</>
          )}
        </Button>
        <Button onClick={resetTimer} variant="outline" size="lg" className="w-36" disabled={isCountingDown}>
          <RotateCcw className="mr-2 h-5 w-5" /> Reset
        </Button>
      </div>
      <Button onClick={handleFinish} variant="destructive" size="lg" disabled={(!isActive && time === 0) || isCountingDown}>
        <Flag className="mr-2 h-5 w-5" /> Finish
      </Button>
    </div>
  );
}
