import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Utilisation de votre fichier logo .jpg depuis le dossier /public */}
      <Image 
        src="/logo.jpg" 
        alt="WODBurner Logo" 
        width={32} 
        height={32} 
        className="h-8 w-8"
      />
      <span className="text-xl font-bold font-headline text-foreground">
        WODBurner
      </span>
    </div>
  );
}
