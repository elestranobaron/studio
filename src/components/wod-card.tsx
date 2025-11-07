import Link from "next/link";
import Image from "next/image";
import type { WOD } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Repeat, Hourglass, Timer } from "lucide-react";
import { format } from 'date-fns';

function WodIcon({ type }: { type: WOD["type"] }) {
  switch (type) {
    case "For Time":
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case "AMRAP":
      return <Repeat className="h-4 w-4 text-muted-foreground" />;
    case "EMOM":
      return <Hourglass className="h-4 w-4 text-muted-foreground" />;
    case "Tabata":
      return <Timer className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
}

export function WodCard({ wod }: { wod: WOD }) {
    
    const formattedDate = wod.date ? format(new Date(wod.date), "PPP") : "No date";

    // Create a flat string from the description, supporting both old and new formats.
    const flatDescription = Array.isArray(wod.description)
      ? wod.description.map(section => section.content).join("\n")
      : wod.description;

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1">
      {wod.imageUrl && (
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={wod.imageUrl}
            alt={wod.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={wod.imageHint}
          />
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>
      )}
      <CardHeader className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-headline text-2xl">{wod.name}</CardTitle>
          <Badge variant="secondary" className="whitespace-nowrap shrink-0">
            <WodIcon type={wod.type} />
            <span className="ml-2">{wod.type}</span>
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2 pt-1 text-sm">
          <Calendar className="h-4 w-4" />
          <span>{formattedDate}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="line-clamp-3 text-sm text-muted-foreground whitespace-pre-wrap">
          {flatDescription}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/timer/${wod.id}`}>Start WOD</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
