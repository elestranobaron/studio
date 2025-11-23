'use client';

import { useParams, notFound } from 'next/navigation';
import { useState } from 'react';
import { TimerClient } from '@/components/timer-client';
import { type WOD, type WodType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useTranslations } from 'next-intl';

// 1. Déclaration des types valides (les slugs dans l’URL)
const VALID_TIMER_TYPES = ['for-time', 'amrap', 'emom', 'tabata'] as const;
type TimerType = typeof VALID_TIMER_TYPES[number];

// 2. Type pour la config
type TimerConfig = {
  name: WodType;
  title: string;
  description: string;
};

export default function GenericTimerPage() {
  const t = useTranslations('GenericTimerPage');
  const params = useParams();

  // params.type peut être string | string[] → on normalise
  const rawType = Array.isArray(params.type) ? params.type[0] : params.type;

  // 3. Validation + 404 si le type n’existe pas
  if (!VALID_TIMER_TYPES.includes(rawType as TimerType)) {
    notFound();
  }

  // Ici TypeScript sait que rawType est bien un TimerType → plus d’erreur d’index
  const type = rawType as TimerType;

  // 4. Config avec traduction
  const timerConfigs: Record<TimerType, TimerConfig> = {
    'for-time': {
      name: 'For Time',
      title: t('forTime.title'),
      description: t('forTime.description'),
    },
    amrap: {
      name: 'AMRAP',
      title: t('amrap.title'),
      description: t('amrap.description'),
    },
    emom: {
      name: 'EMOM',
      title: t('emom.title'),
      description: t('emom.description'),
    },
    tabata: {
      name: 'Tabata',
      title: t('tabata.title'),
      description: t('tabata.description'),
    },
  };

  const config = timerConfigs[type];

  // États
  const [forTimeCap, setForTimeCap] = useState<number | undefined>();
  const [amrapDuration, setAmrapDuration] = useState<number>(20);
  const [emomRounds, setEmomRounds] = useState<number>(10);
  const [emomIntervalMinutes, setEmomIntervalMinutes] = useState<number>(1);
  const [emomIntervalSeconds, setEmomIntervalSeconds] = useState<number>(0);
  const [tabataRounds, setTabataRounds] = useState<number>(8);

  const [isStarted, setIsStarted] = useState(false);
  const [wod, setWod] = useState<WOD | null>(null);

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
      case 'for-time':
        if (forTimeCap && forTimeCap > 0) {
          generatedWod.duration = forTimeCap;
        }
        break;
      case 'amrap':
        generatedWod.duration = amrapDuration;
        break;
      case 'emom':
        const intervalInSeconds = emomIntervalMinutes * 60 + emomIntervalSeconds;
        generatedWod.duration = (emomRounds * intervalInSeconds) / 60;
        generatedWod.rounds = emomRounds;
        generatedWod.emomInterval = intervalInSeconds;
        break;
      case 'tabata':
        generatedWod.duration = (tabataRounds * 30) / 60;
        generatedWod.rounds = tabataRounds;
        break;
    }

    setWod(generatedWod);
    setIsStarted(true);
  };

  const renderConfigForm = () => {
    switch (type) {
      case 'for-time':
        return (
          <form onSubmit={createWodAndStart} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="timeCap">{t('forTime.timeCapLabel')}</Label>
              <Input
                id="timeCap"
                type="number"
                placeholder={t('forTime.timeCapPlaceholder')}
                value={forTimeCap || ''}
                onChange={(e) =>
                  setForTimeCap(e.target.value ? parseInt(e.target.value) : undefined)
                }
                min="1"
                className="text-center text-lg"
              />
            </div>
            <Button type="submit" className="w-full" size="lg">
              <Play className="mr-2 h-5 w-5" /> {t('startButton')}
            </Button>
          </form>
        );

      case 'amrap':
        return (
          <form onSubmit={createWodAndStart} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="duration">{t('amrap.durationLabel')}</Label>
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
              <Play className="mr-2 h-5 w-5" /> {t('startButton')}
            </Button>
          </form>
        );

      case 'emom':
        return (
          <form onSubmit={createWodAndStart} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="rounds">{t('emom.roundsLabel')}</Label>
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
              <Label>{t('emom.intervalLabel')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={emomIntervalMinutes}
                  onChange={(e) => setEmomIntervalMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  className="text-center"
                />
                <span className="text-muted-foreground">{t('emom.intervalMinutes')}</span>
                <Input
                  type="number"
                  value={emomIntervalSeconds}
                  onChange={(e) =>
                    setEmomIntervalSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))
                  }
                  min="0"
                  max="59"
                  className="text-center"
                />
                <span className="text-muted-foreground">{t('emom.intervalSeconds')}</span>
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg">
              <Play className="mr-2 h-5 w-5" /> {t('startButton')}
            </Button>
          </form>
        );

      case 'tabata':
        return (
          <form onSubmit={createWodAndStart} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tabataRounds">{t('tabata.roundsLabel')}</Label>
              <Input
                id="tabataRounds"
                type="number"
                value={tabataRounds}
                onChange={(e) => setTabataRounds(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                required
                className="text-center text-lg"
              />
            </div>
            <Button type="submit" className="w-full" size="lg">
              <Play className="mr-2 h-5 w-5" /> {t('startButton')}
            </Button>
          </form>
        );

      default:
        return null; // ne sera jamais atteint grâce au notFound() plus haut
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
            <ArrowLeft className="mr-2 h-4 =&4 w-4" /> {t('backLink')}
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
            <CardContent>{renderConfigForm()}</CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}