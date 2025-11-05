import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image 
        src="/wodburner1.jpg" 
        alt="WODBurner Logo" 
        width={32} 
        height={32} 
        className="h-8 w-8 rounded-md object-contain"
      />
      <span className="text-xl font-bold font-headline text-foreground">
        WODBurner
      </span>
    </div>
  );
}
