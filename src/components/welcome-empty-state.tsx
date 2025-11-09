
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame, Camera, Dice5, Medal } from 'lucide-react';

export function WelcomeEmptyState() {
  const router = useRouter();

  const handleGoToScan = () => {
    router.push('/scan');
  };

  return (
    <div className="text-center py-16 px-4">
      <Flame className="w-24 h-24 mx-auto text-primary/80 animate-logo-pulse" strokeWidth={1.5} />
      <h2 className="mt-6 text-3xl font-bold font-headline text-primary">
        Welcome to WODBurner!
      </h2>
      <p className="mt-2 text-lg text-muted-foreground">
        Log your first WOD in 3 seconds:
      </p>

      <div className="flex flex-col gap-4 max-w-sm mx-auto mt-8">
        <Button
          size="lg"
          className="h-14 text-base font-bold border-2 border-primary hover:bg-primary/90 transition-transform hover:-translate-y-0.5"
          onClick={handleGoToScan}
        >
          <Camera className="mr-3 h-6 w-6" />
          Scan a WOD from a photo
        </Button>

        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className='w-full'>
                        <Button
                            size="lg"
                            variant="outline"
                            className="w-full h-14 text-base font-bold border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white transition-transform hover:-translate-y-0.5"
                            disabled
                            >
                            <Dice5 className="mr-3 h-6 w-6" />
                            Generate a random WOD
                        </Button>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Coming soon!</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className='w-full'>
                        <Button
                            size="lg"
                            variant="outline"
                            className="w-full h-14 text-base font-bold border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-white transition-transform hover:-translate-y-0.5"
                            disabled
                        >
                            <Medal className="mr-3 h-6 w-6" />
                            Try a Hero WOD
                        </Button>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Coming soon!</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>

      </div>

      <p className="mt-10 text-sm text-muted-foreground/80">
        Or, explore the{' '}
        <Link href="/dashboard?tab=community" className="underline text-primary/90 hover:text-primary">
          community
        </Link>{' '}
        to see what others are burning today.
      </p>
    </div>
  );
}
