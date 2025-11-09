
import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Image
        src="/wodburner1.jpg"
        alt="WODBurner Logo"
        fill
        className="object-contain"
        unoptimized // Use this to prevent Next.js from optimizing an image that is already optimized or when experiencing issues.
      />
    </div>
  );
}
