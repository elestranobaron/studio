
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
import { Clock, Calendar, Repeat, Hourglass, Timer, Share2, LoaderCircle, User } from "lucide-react";
import { format } from 'date-fns';
import { useFirebase, useUser } from "@/firebase";
import { useState } from "react";
import { doc, collection, addDoc, deleteDoc, updateDoc, writeBatch } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

function ShareButton({ wod }: { wod: WOD }) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [isSharing, setIsSharing] = useState(false);
    
    if (!user || user.isAnonymous || wod.userId !== user.uid) {
        return null;
    }

    const handleShareToggle = async (e: React.MouseEvent) => {
        e.preventDefault(); 
        e.stopPropagation();
        if (!firestore || !user) return;
        setIsSharing(true);

        const userWodRef = doc(firestore, 'users', user.uid, 'wods', wod.id);

        try {
            if (wod.communityWodId) {
                // --- Unshare ---
                const communityWodRef = doc(firestore, 'communityWods', wod.communityWodId);
                const batch = writeBatch(firestore);
                batch.delete(communityWodRef);
                batch.update(userWodRef, { communityWodId: "" });
                await batch.commit();
                
                toast({ title: "WOD Unshared", description: "Your WOD has been removed from the community." });
            } else {
                // --- Share ---
                const userDisplayName = user.email?.split('@')[0] || 'Anonymous';
                const communityWodData = { 
                    ...wod, 
                    date: new Date(wod.date).toISOString(),
                    userId: user.uid, // Keep owner ID for security rules
                    userDisplayName,
                 };
                
                const communityWodsCollection = collection(firestore, 'communityWods');
                const newCommunityDocRef = await addDoc(communityWodsCollection, communityWodData);
                
                await updateDoc(userWodRef, {
                    communityWodId: newCommunityDocRef.id
                });
                toast({ title: "WOD Shared!", description: "Your WOD is now visible to the community." });
            }
        } catch (error) {
            console.error("Error toggling share status:", error);
            toast({ variant: "destructive", title: "Action Failed", description: "Could not update the share status." });
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
                "absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-card/60 backdrop-blur-sm hover:bg-card",
                wod.communityWodId && "text-primary hover:text-primary"
            )}
            onClick={handleShareToggle}
            disabled={isSharing}
            aria-label={wod.communityWodId ? "Unshare WOD" : "Share WOD"}
        >
            {isSharing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        </Button>
    )
}

export function WodCard({ wod, source = 'personal' }: { wod: WOD, source?: 'personal' | 'community' }) {
    
    const formattedDate = wod.date ? format(new Date(wod.date), "PPP") : "No date";
    const href = source === 'community' ? `/community-timer/${wod.id}` : `/timer/${wod.id}`;
    
    const flatDescription = Array.isArray(wod.description)
      ? wod.description.map(section => section.content).join("\n")
      : wod.description;

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1 group relative">
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
           {source === 'personal' && <ShareButton wod={wod} />}
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
         <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formattedDate}</span>
            </div>
            {source === 'community' && wod.userDisplayName && (
                <div className="flex items-center gap-2">
                     <User className="h-4 w-4" />
                     <span>{wod.userDisplayName}</span>
                </div>
            )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="line-clamp-3 text-sm text-muted-foreground whitespace-pre-wrap">
          {flatDescription}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={href}>Start WOD</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
