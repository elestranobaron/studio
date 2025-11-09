
import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-full w-full">
        <Image 
          src="/wodburner1.jpg" 
          alt="WODBurner Logo" 
          fill
          className="object-contain"
        />
      </div>
      {showText && (
        <span className="text-xl font-bold font-headline text-foreground group-data-[collapsible=icon]:hidden">
          WODBurner
        </span>
      )}
    </div>
  );
}
