
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { WOD } from "@/lib/types";
import { cn } from "@/lib/utils";

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

function ShareModal({ wod, finalTime }: { wod: WOD; finalTime: string }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline"><Share2 className="mr-2 h-4 w-4"/>Share Result</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-headline">Share your achievement!</DialogTitle>
                </DialogHeader>
                <div className="p-4 bg-background rounded-lg border my-4">
                    <h3 className="font-headline text-primary text-2xl">{wod.name}</h3>
                    <p className="text-sm text-muted-foreground">{wod.type}</p>
                    <div className="my-4 text-center">
                        <p className="text-5xl font-bold font-mono text-foreground">{finalTime}</p>
                        <p className="text-lg text-muted-foreground">Final Time</p>
                    </div>
                    <p className="text-center text-sm text-muted-foreground">🔥 WODBurner</p>
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

  const totalDuration = wod.duration ? wod.duration * 60 : 0;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && !isFinished) {
      interval = setInterval(() => {
        setTime((prevTime) => {
          if (wod.type === "AMRAP" || wod.type === "EMOM") {
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
  }, [isActive, isFinished, wod.type]);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setIsFinished(false);
    if (wod.type === "AMRAP" || wod.type === "EMOM") {
      setTime(totalDuration);
    } else {
      setTime(0);
    }
  }, [wod.type, totalDuration]);

  // Set initial time on component mount
  useEffect(() => {
    resetTimer();
  }, [resetTimer]);


  const handleStartPause = () => {
    if (isFinished) return;
    setIsActive(!isActive);
  };

  const handleFinish = () => {
    setIsActive(false);
    setIsFinished(true);
  };

  const renderTime = () => {
    const displayTime = wod.type === "AMRAP" || wod.type === "EMOM" ? time : time;
    const formattedTime = formatTime(displayTime);
    const timeParts = formattedTime.split("");

    return (
      <div className="font-mono text-7xl md:text-9xl font-bold tracking-tighter text-foreground flex">
        {timeParts.map((char, index) => (
          <span
            key={index}
            className={cn("transition-transform duration-200", {
              "animate-pulse": isActive,
            })}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {char}
          </span>
        ))}
      </div>
    );
  };

  if (isFinished) {
    return (
      <div className="text-center space-y-6 flex flex-col items-center">
        <h2 className="text-4xl font-headline">Workout Complete!</h2>
        <Card className="max-w-sm w-full">
            <CardHeader>
                <CardTitle className="font-headline text-primary">{wod.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-6xl font-bold font-mono">{formatTime(time)}</p>
                <p className="text-muted-foreground">{wod.type === "For Time" ? "Total Time" : "Time Completed"}</p>
            </CardContent>
        </Card>
        <div className="flex gap-4">
            <Button onClick={resetTimer} size="lg"><RotateCcw className="mr-2 h-4 w-4" /> Go Again</Button>
            <ShareModal wod={wod} finalTime={formatTime(time)} />
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-8">
      {renderTime()}
      <div className="flex justify-center gap-4">
        <Button
          onClick={handleStartPause}
          size="lg"
          className="w-32"
          variant={isActive ? "secondary" : "default"}
        >
          {isActive ? (
            <><Pause className="mr-2 h-5 w-5" /> Pause</>
          ) : (
            <><Play className="mr-2 h-5 w-5" /> Start</>
          )}
        </Button>
        <Button onClick={resetTimer} variant="outline" size="lg">
          <RotateCcw className="mr-2 h-5 w-5" /> Reset
        </Button>
      </div>
      <Button onClick={handleFinish} variant="destructive" size="lg" disabled={!isActive && time === 0}>
        <Flag className="mr-2 h-5 w-5" /> Finish
      </Button>
    </div>
  );
}
