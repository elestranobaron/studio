
'use client';

import { useParams, useRouter, notFound } from 'next/navigation';
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

const timerConfigs: Record<string, { name: WodType, requiresDuration: boolean, defaultDuration?: number, title: string, description: string }> = {
    'for-time': { name: 'For Time', requiresDuration: false, title: 'For Time', description: 'A simple stopwatch to time your workout.' },
    'amrap': { name: 'AMRAP', requiresDuration: true, defaultDuration: 20, title: 'AMRAP Timer', description: 'Set a duration and see how many rounds or reps you can complete.' },
    'emom': { name: 'EMOM', requiresDuration: true, defaultDuration: 10, title: 'EMOM Timer', description: 'Set a total duration for your Every Minute On the Minute workout.' },
    'tabata': { name: 'Tabata', requiresDuration: false, title: 'Tabata Timer', description: '20 seconds of work, 10 seconds of rest. The timer is pre-configured.' },
};

export default function GenericTimerPage() {
    const params = useParams();
    const router = useRouter();
    const type = Array.isArray(params.type) ? params.type[0] : params.type;

    const config = timerConfigs[type];

    const [duration, setDuration] = useState<number>(config?.defaultDuration || 10);
    const [isStarted, setIsStarted] = useState(false);

    if (!config) {
        return notFound();
    }

    const wod: WOD = {
        id: `generic-${type}`,
        name: config.title,
        type: config.name,
        date: new Date().toISOString(),
        description: [{ title: 'Generic Timer', content: config.description }],
        imageUrl: `https://picsum.photos/seed/timer-${type}/800/600`,
        imageHint: 'gym timer',
        userId: 'generic',
        duration: config.name === 'Tabata' ? 4 : duration, // Tabata is 8 rounds * 30s = 4 mins, approx.
    };

    const handleStart = (e: React.FormEvent) => {
        e.preventDefault();
        setIsStarted(true);
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
                {isStarted ? (
                     <div className="relative z-10 flex flex-col items-center justify-center gap-8 w-full max-w-6xl">
                        <div className="text-center">
                            <h1 className="text-4xl md:text-6xl font-extrabold font-headline text-foreground">
                                {wod.name}
                            </h1>
                            <p className="text-xl text-muted-foreground mt-2">{wod.type}</p>
                        </div>
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
                            {config.requiresDuration ? (
                                <form onSubmit={handleStart} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Duration (minutes)</Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            value={duration}
                                            onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                                            min="1"
                                            required
                                            className="text-center text-lg"
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" size="lg">
                                        <Play className="mr-2 h-5 w-5" /> Start Timer
                                    </Button>
                                </form>
                            ) : (
                                <Button onClick={() => setIsStarted(true)} className="w-full" size="lg">
                                     <Play className="mr-2 h-5 w-5" /> Start Timer
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
