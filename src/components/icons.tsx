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
      <path d="M12.74,2.27a.75.75,0,0,0-1.48,0A6,6,0,0,0,8,7.63c0,2.19,1.13,3.33,2,3.88a.75.75,0,0,0,1,0c.91-.55,2-1.69,2-3.88A6,6,0,0,0,12.74,2.27Z" />
      <path d="M11.25,9.55c-.29-.14-.54-.3-.77-.49a.75.75,0,0,0-1.23.82,6.17,6.17,0,0,0,2.1,3.48.75.75,0,0,0,1.09-.23l.1-.18a3.49,3.49,0,0,1-1.29-3.4Z" />
      <path d="M13.75,9.55c.29-.14.54-.3.77-.49a.75.75,0,0,1,1.23.82,6.17,6.17,0,0,1-2.1,3.48.75.75,0,0,1-1.09-.23l-.1-.18a3.49,3.49,0,0,0,1.29-3.4Z" />
      <path d="M21.5,10.75H20.27a3,3,0,0,0-2.31-2.92,4.48,4.48,0,0,0-3.46,0,3,3,0,0,0-2.31,2.92H3.5a1.25,1.25,0,0,0,0,2.5h8.69a3,3,0,0,0,2.31,2.92,4.48,4.48,0,0,0,3.46,0,3,3,0,0,0,2.31-2.92H21.5a1.25,1.25,0,0,0,0-2.5Zm-4.75,4a1.25,1.25,0,1,1,1.25-1.25A1.25,1.25,0,0,1,16.75,14.75Zm-9-5.5a1.25,1.25,0,1,1-1.25,1.25A1.25,1.25,0,0,1,7.75,9.25Z" />
      <path d="M2,12A2.5,2.5,0,1,0,4.5,9.5,2.5,2.5,0,0,0,2,12Zm2.5-1.25a.75.75,0,0,1,0,1.5.5.5,0,0,1,0-1.5Z" />
      <path d="M19.5,9.5A2.5,2.5,0,1,0,22,12,2.5,2.5,0,0,0,19.5,9.5Zm0,3.25a.75.75,0,0,1,0-1.5.5.5,0,0,1,0,1.5Z" />
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