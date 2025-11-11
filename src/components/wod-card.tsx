
'use client';

import Link from "next/link";
import Image from "next/image";
import type { Reaction, WOD } from "@/lib/types";
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
import { Clock, Calendar, Repeat, Hourglass, Timer, Share2, LoaderCircle, User, MessageCircle, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { format } from 'date-fns';
import { useFirebase, useUser } from "@/firebase";
import { useState } from "react";
import { doc, collection, addDoc, deleteDoc, updateDoc, writeBatch, runTransaction } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { useRouter } from "next/navigation";

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

function PersonalWodActions({ wod }: { wod: WOD }) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const [isSharing, setIsSharing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
                    userId: user.uid,
                    userDisplayName,
                    reactions: { fire: 0, poop: 0 },
                    commentCount: 0
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
    
    const handleDelete = async () => {
        if (!firestore || !user) return;
        setIsDeleting(true);

        const userWodRef = doc(firestore, 'users', user.uid, 'wods', wod.id);
        const batch = writeBatch(firestore);

        try {
            // Delete personal WOD
            batch.delete(userWodRef);

            // If shared, delete community WOD too
            if (wod.communityWodId) {
                const communityWodRef = doc(firestore, 'communityWods', wod.communityWodId);
                batch.delete(communityWodRef);
            }

            await batch.commit();
            toast({ title: "WOD Deleted", description: "Your WOD has been successfully removed." });
        } catch (error) {
            console.error("Error deleting WOD:", error);
            toast({ variant: "destructive", title: "Deletion Failed", description: "Could not delete the WOD." });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };
    
    const handleEdit = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/wod/${wod.id}/edit`);
    };

    return (
        <>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your WOD
                            {wod.communityWodId && " and remove it from the community"}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                             {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-card/60 backdrop-blur-sm hover:bg-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">WOD options</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                     <DropdownMenuItem onClick={handleEdit}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                    </DropdownMenuItem>
                     <DropdownMenuItem
                        onClick={handleShareToggle}
                        disabled={isSharing}
                        className={cn(wod.communityWodId && "text-primary")}
                     >
                        {isSharing ? (
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Share2 className="mr-2 h-4 w-4" />
                        )}
                        <span>{wod.communityWodId ? "Unshare" : "Share"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                        className="text-destructive"
                        onSelect={() => setIsDeleteDialogOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}

function ReactionButton({ wod }: { wod: WOD }) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    if (!firestore || !user || user.isAnonymous) {
        return null;
    }

    const handleReaction = async (e: React.MouseEvent, reactionType: Reaction) => {
        e.preventDefault();
        e.stopPropagation();
        setIsLoading(true);

        const communityWodRef = doc(firestore, "communityWods", wod.id);
        const reactionDocRef = doc(firestore, `communityWods/${wod.id}/reactors/${user.uid}`);

        try {
            await runTransaction(firestore, async (transaction) => {
                const reactionDoc = await transaction.get(reactionDocRef);
                const wodDoc = await transaction.get(communityWodRef);

                if (!wodDoc.exists()) {
                    throw "WOD does not exist!";
                }

                const currentReactions = wodDoc.data().reactions || { fire: 0, poop: 0 };
                const newReactions = { ...currentReactions };

                if (reactionDoc.exists()) {
                    const previousReaction = reactionDoc.data().type as Reaction;
                    if (previousReaction === reactionType) {
                        // User is undoing their reaction
                        newReactions[reactionType]--;
                        transaction.delete(reactionDocRef);
                    } else {
                        // User is changing their reaction
                        newReactions[previousReaction]--;
                        newReactions[reactionType]++;
                        transaction.set(reactionDocRef, { type: reactionType });
                    }
                } else {
                    // New reaction
                    newReactions[reactionType]++;
                    transaction.set(reactionDocRef, { type: reactionType });
                }

                transaction.update(communityWodRef, { reactions: newReactions });
            });
        } catch (error) {
            console.error("Transaction failed: ", error);
            toast({ variant: "destructive", title: "Oops!", description: "Could not save your reaction." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-1">
            <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1.5 text-muted-foreground px-2"
                onClick={(e) => handleReaction(e, 'fire')}
                disabled={isLoading}
            >
                <span className="text-base">🔥</span>
                <span className="text-sm font-medium tabular-nums">{wod.reactions?.fire ?? 0}</span>
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1.5 text-muted-foreground px-2"
                onClick={(e) => handleReaction(e, 'poop')}
                disabled={isLoading}
            >
                <span className="text-base">💩</span>
                <span className="text-sm font-medium tabular-nums">{wod.reactions?.poop ?? 0}</span>
            </Button>
            <div className="flex items-center gap-1.5 text-muted-foreground pl-2">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm font-medium tabular-nums">{wod.commentCount ?? 0}</span>
            </div>
        </div>
    );
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
           {source === 'personal' && <PersonalWodActions wod={wod} />}
        </div>
      )}
      <CardHeader className="pt-4 pb-2">
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
      <CardContent className="flex-grow py-2">
        <p className="line-clamp-3 text-sm text-muted-foreground whitespace-pre-wrap">
          {flatDescription}
        </p>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2 pt-2">
         {source === 'community' && <ReactionButton wod={wod} />}
        <Button asChild className="w-full">
          <Link href={href}>Start WOD</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
