
import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image 
        src="/wodburner1.jpg" 
        alt="WODBurner Logo" 
        width={32} 
        height={32} 
        className="h-full w-full object-contain"
      />
      {showText && (
        <span className="text-xl font-bold font-headline text-foreground group-data-[collapsible=icon]:hidden">
          WODBurner
        </span>
      )}
    </div>
  );
}
