import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
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
