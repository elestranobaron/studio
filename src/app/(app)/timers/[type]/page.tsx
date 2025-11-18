
'use client';

import { useParams, notFound } from 'next/navigation';
import { useState } from 'react';
import { TimerClient } from '@/components/timer-client';
import { type WOD, type WodType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SidebarTrigger } from '@/components/ui/sidebar';

const timerConfigs: Record<string, { name: WodType, title: string, description: string }> = {
    'for-time': { name: 'For Time', title: 'For Time', description: 'A simple stopwatch to time your workout.' },
    'amrap': { name: 'AMRAP', title: 'AMRAP Timer', description: 'Set a duration and see how many rounds or reps you can complete.' },
    'emom': { name: 'EMOM', title: 'EMOM Timer', description: 'Every Minute On the Minute. Set the interval and number of rounds.' },
    'tabata': { name: 'Tabata', title: 'Tabata Timer', description: '8 rounds of 20s work, 10s rest. The timer is pre-configured.' },
};

export default function GenericTimerPage() {
    const params = useParams();
    const type = Array.isArray(params.type) ? params.type[0] : params.type;
    const config = timerConfigs[type];

    // State for AMRAP
    const [amrapDuration, setAmrapDuration] = useState<number>(20);

    // State for EMOM
    const [emomRounds, setEmomRounds] = useState<number>(10);
    const [emomIntervalMinutes, setEmomIntervalMinutes] = useState<number>(1);
    const [emomIntervalSeconds, setEmomIntervalSeconds] = useState<number>(0);

    const [isStarted, setIsStarted] = useState(false);
    const [wod, setWod] = useState<WOD | null>(null);

    if (!config) {
        return notFound();
    }
    
    const createWodAndStart = (e?: React.FormEvent) => {
        e?.preventDefault();

        let generatedWod: WOD = {
            id: `generic-${type}`,
            name: config.title,
            type: config.name,
            date: new Date().toISOString(),
            description: [{ title: 'Generic Timer', content: config.description }],
            imageUrl: `https://picsum.photos/seed/timer-${type}/800/600`,
            imageHint: 'gym timer',
            userId: 'generic',
        };

        switch (type) {
            case 'amrap':
                generatedWod.duration = amrapDuration;
                break;
            case 'emom':
                const intervalInSeconds = (emomIntervalMinutes * 60) + emomIntervalSeconds;
                generatedWod.duration = emomRounds * intervalInSeconds / 60; // Total duration in minutes
                generatedWod.rounds = emomRounds;
                generatedWod.emomInterval = intervalInSeconds; // Custom property for interval length in seconds
                break;
            case 'tabata':
                 generatedWod.duration = 8 * 30 / 60; // 8 rounds of 30s (20+10) = 4 minutes
                 generatedWod.rounds = 8;
                break;
        }

        setWod(generatedWod);
        setIsStarted(true);
    };

    const renderConfigForm = () => {
        switch (type) {
            case 'amrap':
                return (
                    <form onSubmit={createWodAndStart} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="duration">Duration (minutes)</Label>
                            <Input
                                id="duration"
                                type="number"
                                value={amrapDuration}
                                onChange={(e) => setAmrapDuration(Math.max(1, parseInt(e.target.value) || 1))}
                                min="1"
                                required
                                className="text-center text-lg"
                            />
                        </div>
                        <Button type="submit" className="w-full" size="lg">
                            <Play className="mr-2 h-5 w-5" /> Start Timer
                        </Button>
                    </form>
                );
            case 'emom':
                 return (
                    <form onSubmit={createWodAndStart} className="space-y-6">
                        <div className="space-y-2">
                             <Label htmlFor="rounds">Number of Rounds</Label>
                             <Input
                                id="rounds"
                                type="number"
                                value={emomRounds}
                                onChange={(e) => setEmomRounds(Math.max(1, parseInt(e.target.value) || 1))}
                                min="1"
                                required
                                className="text-center text-lg"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Interval Length</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    value={emomIntervalMinutes}
                                    onChange={(e) => setEmomIntervalMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                                    min="0"
                                    aria-label="Interval minutes"
                                    className="text-center"
                                />
                                <span className="text-muted-foreground">min</span>
                                <Input
                                    type="number"
                                    value={emomIntervalSeconds}
                                    onChange={(e) => setEmomIntervalSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                    min="0"
                                    max="59"
                                    aria-label="Interval seconds"
                                    className="text-center"
                                />
                                <span className="text-muted-foreground">sec</span>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" size="lg">
                            <Play className="mr-2 h-5 w-5" /> Start Timer
                        </Button>
                    </form>
                 );
            case 'for-time':
            case 'tabata':
            default:
                return (
                    <Button onClick={() => createWodAndStart()} className="w-full" size="lg">
                        <Play className="mr-2 h-5 w-5" /> Start Timer
                    </Button>
                );
        }
    };


    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b md:p-6">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
                        {config.title}
                    </h1>
                </div>
                 <Button asChild variant="outline">
                    <Link href="/timers">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Timers
                    </Link>
                </Button>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center p-4">
                {isStarted && wod ? (
                     <div className="relative z-10 flex flex-col items-center justify-center gap-8 w-full max-w-6xl">
                        <TimerClient wod={wod} />
                    </div>
                ) : (
                    <Card className="w-full max-w-md">
                        <CardHeader className="text-center">
                            <Dumbbell className="mx-auto h-12 w-12 text-primary" />
                            <CardTitle className="font-headline mt-4">{config.title}</CardTitle>
                            <CardDescription>{config.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderConfigForm()}
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
