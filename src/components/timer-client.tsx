
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { playStartSound, playFinishSound, playCountdownTick, playCountdownEnd, playTenSecondWarning, playThreeSecondWarning } from "@/lib/sounds";
import { WodContentParser } from "./wod-content-parser";
import { ScrollArea } from "./ui/scroll-area";

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

        const metconKeywords = ["METCON", "CONDITIONING", wod.type.toUpperCase()];
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
                <div className="p-6 flex flex-col gap-4 text-center h-[90vh] max-h-[800px]">
                    <div className="flex-shrink-0">
                        <p className="text-muted-foreground text-sm font-semibold tracking-widest">FINAL TIME</p>
                        <p className="text-8xl font-bold font-mono text-primary -my-2">{finalTime}</p>
                    </div>
                    
                    <div className="space-y-1 flex-shrink-0">
                        <h3 className="font-headline text-foreground text-3xl">{wod.name}</h3>
                        <p className="text-sm text-muted-foreground">{wod.type}</p>
                    </div>
                     
                    <Separator className="my-2 bg-border/50 flex-shrink-0" />

                    <ScrollArea className="flex-grow text-left w-full">
                        <div className="pr-4">
                           <WodContentParser content={mainWorkoutContent} />
                        </div>
                    </ScrollArea>

                    <div className="pt-4 mt-auto flex-shrink-0">
                        <p className="text-xs text-muted-foreground/50 flex items-center justify-center gap-2 mb-2">
                            <Camera className="h-3 w-3"/> Ready for screenshot!
                        </p>
                        <span className="text-xl font-bold font-headline text-primary tracking-wider opacity-60">
                            WODBurner
                        </span>
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

  // EMOM/Tabata specific state
  const [currentRound, setCurrentRound] = useState(1);
  const [workoutState, setWorkoutState] = useState<'work' | 'rest' | 'active'>('active');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalDuration = wod.duration ? wod.duration * 60 : 0;
  const isCountDownTimer = wod.type === "AMRAP";

  const getInitialTime = useCallback(() => {
    if (wod.type === 'EMOM' && wod.emomInterval) return wod.emomInterval;
    if (wod.type === 'AMRAP' && wod.duration) return wod.duration * 60;
    if (wod.type === 'Tabata') return 20; // Tabata starts with 20s of work
    return 0;
  }, [wod.type, wod.duration, wod.emomInterval]);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setIsFinished(false);
    setFinalTime(0);
    setTime(getInitialTime());
    setCountdown(3);
    setIsCountingDown(false);
    setCurrentRound(1);
    setWorkoutState(wod.type === 'Tabata' ? 'work' : 'active');
    if (timerRef.current) clearInterval(timerRef.current);
  }, [getInitialTime, wod.type]);

  // Set initial time on component mount
  useEffect(() => {
    resetTimer();
  }, [resetTimer]);


  // Effect for the main timer logic (countdown and active timer)
  useEffect(() => {
    if (isCountingDown) {
        // Initial tick for "3"
        playCountdownTick();
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                const nextCountdown = prev - 1;
                
                if (nextCountdown === 2) playCountdownTick();
                if (nextCountdown === 1) playCountdownTick();
                if (nextCountdown <= 0) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setIsCountingDown(false);
                    setIsActive(true);
                    playCountdownEnd();
                    return 0;
                }
                return nextCountdown;
            });
        }, 1000);
    } 
    else if (isActive && !isFinished) {
      timerRef.current = setInterval(() => {
        setTime(prevTime => {
            let newTime = prevTime;

            const needsAlerts = wod.type === 'EMOM' || wod.type === 'Tabata' || wod.type === 'AMRAP';
            if (needsAlerts) {
                if (newTime === 11) playTenSecondWarning();
                if (newTime === 4 || newTime === 3 || newTime === 2) {
                     playThreeSecondWarning();
                }
            }
            
            if (wod.type === 'EMOM') {
                newTime -= 1;
                if (newTime <= 0) {
                    const nextRound = currentRound + 1;
                    if (nextRound > (wod.rounds || 0)) {
                        handleFinish(totalDuration);
                        return 0;
                    }
                    setCurrentRound(nextRound);
                    playStartSound();
                    return (wod.emomInterval || 60);
                }
            } else if (wod.type === 'Tabata') {
                newTime -= 1;
                if (newTime <= 0) {
                    if (workoutState === 'work') {
                        setWorkoutState('rest');
                        playFinishSound(); // Or a specific "rest" sound
                        return 10;
                    } else { // workoutState === 'rest'
                        const nextRound = currentRound + 1;
                        if (nextRound > (wod.rounds || 8)) {
                            handleFinish(totalDuration);
                            return 0;
                        }
                        setCurrentRound(nextRound);
                        setWorkoutState('work');
                        playStartSound();
                        return 20;
                    }
                }
            } else if (isCountDownTimer) { // AMRAP
                newTime -= 1;
                if (newTime <= 0) {
                    handleFinish(totalDuration);
                    return 0;
                }
            } else { // For Time
                newTime += 1;
            }
            return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isFinished, isCountingDown, wod, currentRound, workoutState]);


  const handleStartPause = () => {
    if (isFinished) return;
    
    if (isActive) {
        setIsActive(false);
    } else {
        if (time === getInitialTime() && !isCountingDown) {
            setIsCountingDown(true);
        } else {
            playStartSound();
            setIsActive(true);
        }
    }
  };

  const handleFinish = (finalTimeValue: number) => {
    playFinishSound();
    setIsActive(false);
    setIsFinished(true);
    setFinalTime(finalTimeValue > 0 ? finalTimeValue : time);
  };
  
  const getProgress = () => {
    switch(wod.type) {
        case 'AMRAP':
            if (totalDuration === 0) return 0;
            return (time / totalDuration) * 100;
        case 'EMOM':
            if (!wod.emomInterval) return 0;
            return (time / wod.emomInterval) * 100;
        case 'Tabata':
            const period = workoutState === 'work' ? 20 : 10;
            return (time / period) * 100;
        default:
            return 100;
    }
  }

  const progress = getProgress();
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

    const mainTimeDisplay = formatTime(time);
    
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
                    "stroke-primary transition-all duration-1000",
                     isCountDownTimer || wod.type === 'EMOM' || wod.type === 'Tabata' ? 'ease-linear' : '',
                    {"animate-pulse": isActive && (isCountDownTimer || wod.type === 'EMOM' || wod.type === 'Tabata')}
                )}
                fill="transparent"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <p className="font-mono text-7xl md:text-8xl font-bold tracking-tighter text-foreground">
                    {mainTimeDisplay}
                </p>
                 {(wod.type === 'EMOM' || wod.type === 'Tabata') && (
                    <div className="text-center -mt-2">
                         {wod.type === 'Tabata' && (
                             <p className={cn("text-2xl font-bold", workoutState === 'work' ? 'text-green-500' : 'text-blue-500')}>
                                {workoutState.toUpperCase()}
                             </p>
                         )}
                        <p className="text-xl font-semibold text-muted-foreground">
                            Round {currentRound} / {wod.rounds || 8}
                        </p>
                         {wod.type === 'EMOM' && totalDuration > 0 && wod.emomInterval && (
                            <p className="text-sm text-muted-foreground/80">
                                Total: {formatTime((currentRound - 1) * wod.emomInterval + (wod.emomInterval - time))}
                            </p>
                        )}
                    </div>
                 )}
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
                <p className="text-6xl font-bold font-mono">{formatTime(finalTime)}</p>
                <p className="text-muted-foreground">{wod.type === "For Time" ? "Total Time" : "Time Completed"}</p>
            </CardContent>
        </Card>
        <div className="flex gap-4">
            <Button onClick={resetTimer} size="lg"><RotateCcw className="mr-2 h-4 w-4" /> Go Again</Button>
            <ShareModal wod={wod} finalTime={formatTime(finalTime)} />
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
      <Button onClick={() => handleFinish(time)} variant="destructive" size="lg" disabled={(!isActive && time === 0) || isCountingDown}>
        <Flag className="mr-2 h-5 w-5" /> Finish
      </Button>
    </div>
  );
}
