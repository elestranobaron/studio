import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <WodBurnerLogo className="h-8 w-8 text-primary" />
      <span className="text-xl font-bold font-headline text-foreground">
        WODBurner
      </span>
    </div>
  );
}

export function WodBurnerLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
        <path d="M23.59 15.34c-1.29-1.29-2.22-1.5-2.6-1.5h-2.23c-.34 0-.67.07-.98.2a4.48 4.48 0 0 1-3.3-3.23 4.5 4.5 0 0 0-8.94 0 4.48 4.48 0 0 1-3.3 3.23c-.31-.13-.64-.2-.98-.2H.99c-.38 0-1.31.21-2.6 1.5a1.25 1.25 0 0 0 1.77 1.77c.7-.7 1.1-1.11 1.82-1.11h2.23a3.24 3.24 0 0 0 3.24 3.24 3.24 3.24 0 0 0 3.24-3.24 3.24 3.24 0 0 0 3.24 3.24 3.24 3.24 0 0 0 3.24-3.24h2.23c.72 0 1.12.41 1.82 1.11a1.25 1.25 0 0 0 1.77-1.77ZM7.24 15.95a1.76 1.76 0 1 1 1.76-1.76 1.76 1.76 0 0 1-1.76 1.76Zm9.52 0a1.76 1.76 0 1 1 1.76-1.76 1.76 1.76 0 0 1-1.76 1.76Z"/>
        <path d="M12.74,2.27a.75.75,0,0,0-1.48,0A6,6,0,0,0,8,7.63c0,2.19,1.13,3.33,2,3.88a.75.75,0,0,0,1,0c.91-.55,2-1.69,2-3.88A6,6,0,0,0,12.74,2.27Z" />
    </svg>
  );
}

export function OldLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7 text-primary"
      >
        <path d="M10.5 5.5a4.5 4.5 0 0 1 8 0" />
        <path d="M6 12c0-1.5 2-3 4.5-3s4.5 1.5 4.5 3" />
        <path d="M4 17c0-2 3-4 7-4s7 2 7 4" />
        <path d="M12 18c-4.5 0-8-1.5-8-3" />
        <path d="M21 15c0 2-2.5 4-7.5 4-3.6 0-6-1-7.5-2.5" />
      </svg>
      <span className="text-xl font-bold font-headline text-foreground">
        WODBurner
      </span>
    </div>
  );
}
