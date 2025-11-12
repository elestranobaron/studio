'use client';
import { cn } from '@/lib/utils';

interface HeroLetterProps {
  letter: string;
  className?: string;
}

export function HeroLetter({ letter, className }: HeroLetterProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-xl overflow-hidden",
        "bg-gradient-to-br from-zinc-900 via-black to-zinc-800",
        "border-2 border-red-900/50",
        "animate-pulse-slow",
        className
      )}
    >
      {/* Texture for the box can be added here if desired */}
       <div className="absolute inset-0 opacity-30">
         <div className="absolute inset-0 bg-[url('/texture-box.jpg')] bg-cover opacity-20" />
      </div>

      {/* Main letter */}
      <span className="relative font-black tracking-tighter text-red-600 drop-shadow-2xl text-9xl">
        {letter}
      </span>

      {/* Dumbbell Icon */}
      <div className="absolute -bottom-2 -right-2 w-10 h-10">
        <svg viewBox="0 0 100 100" className="drop-shadow-lg">
          <path
            d="M20 40 H30 V60 H20 Z M70 40 H80 V60 H70 Z M35 45 H65 V55 H35 Z"
            fill="#dc2626"
            stroke="#991b1b"
            strokeWidth="8"
          />
        </svg>
      </div>

      {/* Fire/sweat effect */}
       <div className="absolute inset-0 opacity-20">
         <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-b from-orange-600 to-transparent" />
         <div className="absolute bottom-0 right-0 w-8 h-8 bg-white/10 rounded-full blur-xl" />
      </div>
    </div>
  );
}
