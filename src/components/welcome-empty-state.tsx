
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame, Camera, Dice5, Medal } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function WelcomeEmptyState() {
  const t = useTranslations('WelcomeEmptyState');
  const router = useRouter();

  const handleGoToScan = () => {
    router.push('/scan');
  };

  return (
    <div className="text-center py-16 px-4">
      <Flame className="w-24 h-24 mx-auto text-primary/80 animate-logo-pulse" strokeWidth={1.5} />
      <h2 className="mt-6 text-3xl font-bold font-headline text-primary">
        {t('title')}
      </h2>
      <p className="mt-2 text-lg text-muted-foreground">
        {t('subtitle')}
      </p>

      <div className="flex flex-col gap-4 max-w-sm mx-auto mt-8">
        <Button
          size="lg"
          className="h-14 text-base font-bold border-2 border-primary hover:bg-primary/90 transition-transform hover:-translate-y-0.5"
          onClick={handleGoToScan}
        >
          <Camera className="mr-3 h-6 w-6" />
          {t('scanButton')}
        </Button>

        <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full h-14 text-base font-bold border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white transition-transform hover:-translate-y-0.5"
            >
            <Link href="/generate">
                <Dice5 className="mr-3 h-6 w-6" />
                {t('generateButton')}
            </Link>
        </Button>

        <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full h-14 text-base font-bold border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-white transition-transform hover:-translate-y-0.5"
        >
            <Link href="/hero-wods">
                <Medal className="mr-3 h-6 w-6" />
                {t('heroButton')}
            </Link>
        </Button>

      </div>

      <p className="mt-10 text-sm text-muted-foreground/80">
        {t.rich('communityLink', {
          community: (chunks) => <Link href="/dashboard?tab=community" className="underline text-primary/90 hover:text-primary">{chunks}</Link>
        })}
      </p>
    </div>
  );
}
