
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
import {
  Clock,
  Calendar,
  Repeat,
  Hourglass,
  Timer,
  Share2,
  LoaderCircle,
  User,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  Pencil,
  Expand,
  HeartPulse,
  Weight,
  Armchair,
  Bike,
} from "lucide-react";
import { format, isValid } from "date-fns";
import { useFirebase, useUser } from "@/firebase";
import { useState } from "react";
import {
  doc,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  increment
} from "firebase/firestore";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./ui/dialog";
import { WodContentParser } from "./wod-content-parser";
import { Separator } from "./ui/separator";
import { HeroLetter } from "./hero-letter";
import { useTranslations } from "next-intl";
import { Progress } from "./ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { CommunityChat, ReactionGrid } from "./community-chat";

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
  const t = useTranslations("WodCard");
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isSharing, setIsSharing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!user || user.isAnonymous || wod.userId !== user.uid) {
    return null;
  }

  const handleShareToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!firestore || !user) return;
    setIsSharing(true);

    const userWodRef = doc(firestore, "users", user.uid, "wods", wod.id);

    try {
      if (wod.communityWodId) {
        const communityWodRef = doc(firestore, "communityWods", wod.communityWodId);
        const batch = writeBatch(firestore);
        batch.delete(communityWodRef);
        batch.update(userWodRef, { communityWodId: "" });
        await batch.commit();
        toast({ title: t("unsharedToastTitle"), description: t("unsharedToastDescription") });
      } else {
        const userDisplayName = user.email?.split('@')[0] || "Anonymous";
        const communityWodData = {
          ...wod,
          date: new Date(wod.date).toISOString(),
          userId: user.uid,
          userDisplayName,
          reactions: { fire: 0, poop: 0, laugh: 0, cry: 0, vomit: 0 },
          commentCount: 0,
        };

        const communityWodsCollection = collection(firestore, "communityWods");
        const newCommunityDocRef = await addDoc(communityWodsCollection, communityWodData);
        // Link the personal WOD to the community one
        await updateDoc(userWodRef, { communityWodId: newCommunityDocRef.id });
        toast({ title: t("sharedToastTitle"), description: t("sharedToastDescription") });
      }
      setIsDropdownOpen(false);
    } catch (error) {
      console.error("Error toggling share status:", error);
      toast({
        variant: "destructive",
        title: t("shareErrorToastTitle"),
        description: t("shareErrorToastDescription"),
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || !user) return;
    setIsDeleting(true);
    const userWodRef = doc(firestore, "users", user.uid, "wods", wod.id);
    const batch = writeBatch(firestore);

    try {
      batch.delete(userWodRef);
      if (wod.communityWodId) {
        const communityWodRef = doc(firestore, "communityWods", wod.communityWodId);
        batch.delete(communityWodRef);
      }
      await batch.commit();
      toast({ title: t("deleteToastTitle"), description: t("deleteToastDescription") });
    } catch (error) {
      console.error("Error deleting WOD:", error);
      toast({
        variant: "destructive",
        title: t("deleteErrorToastTitle"),
        description: t("deleteErrorToastDescription"),
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleEdit = () => {
    router.push(`/wod/${wod.id}/edit`);
  };

  return (
    <>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
                {t.rich("deleteDialogDescription", {
                    isShared: wod.communityWodId ? "true" : "other"
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteDialogCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : t("deleteDialogConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-card/60 backdrop-blur-sm hover:bg-card"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{t("optionsAlt")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={handleEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            <span>{t("edit")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleShareToggle(e as unknown as React.MouseEvent);
            }}
            disabled={isSharing}
            className={cn(wod.communityWodId && "text-primary")}
          >
            {isSharing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
            <span>{wod.communityWodId ? t("unshare") : t("share")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onSelect={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            <span>{t("delete")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function WodCard({ wod, source = "personal" }: { wod: WOD; source?: "personal" | "community" }) {
  const t = useTranslations("WodCard");
  const { user } = useUser();
  const date = wod.date ? new Date(wod.date) : new Date();
  const formattedDate = isValid(date) ? format(date, "PPP") : wod.date;
  const href = source === "community" ? `/community-timer/${wod.id}` : `/timer/${wod.id}`;
  const [chatOpen, setChatOpen] = useState(false);

  const descriptionSections = Array.isArray(wod.description)
    ? wod.description
    : [{ title: "Workout", content: wod.description || "" }];

  const isHeroWod = wod.userId === "system";
  const hasProfile = wod.cardio !== undefined && wod.lifting !== undefined && wod.upperBody !== undefined && wod.lowerBody !== undefined;


  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out group relative hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1">
      {isHeroWod ? (
        <HeroLetter letter={wod.name.charAt(0)} className="h-48 w-full" />
      ) : (
        <Dialog>
          <DialogTrigger asChild>
             <div className="relative h-48 w-full overflow-hidden">
                <div className="absolute inset-0 group/image cursor-pointer">
                    <Image
                        src={wod.imageUrl}
                        alt={wod.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover/image:scale-105"
                        data-ai-hint={wod.imageHint}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="p-2 rounded-full bg-black/50 text-white">
                        <Expand className="h-6 w-6" />
                        </div>
                    </div>
                </div>
                {source === "personal" && <PersonalWodActions wod={wod} />}
             </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl p-0">
            <DialogHeader className="sr-only">
                <DialogTitle>{t('viewImageAlt', { wodName: wod.name })}</DialogTitle>
                <DialogDescription>Full view of the WOD image.</DialogDescription>
            </DialogHeader>
            <div className="relative w-full aspect-[3/2]">
              <Image
                src={wod.imageUrl!}
                alt={t('viewImageAlt', {wodName: wod.name})}
                fill
                className="object-contain w-full h-auto rounded-t-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
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
          {source === "community" && wod.userDisplayName && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{wod.userDisplayName}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-grow py-2">
        <Dialog>
            <DialogTrigger asChild>
                <p className="line-clamp-3 text-sm text-muted-foreground whitespace-pre-wrap transition-colors cursor-pointer hover:text-foreground">
                {descriptionSections.map((s) => s.content).join("\n")}
                </p>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-headline text-primary text-2xl">{wod.name}</DialogTitle>
                    <DialogDescription>
                        {t("viewWodDescription", { type: wod.type, date: formattedDate })}
                        {wod.userDisplayName && (
                        <span className="block mt-1">
                            {t("viewWodSharedBy", { displayName: wod.userDisplayName })}
                        </span>
                        )}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto pr-4">
                {descriptionSections.map((section, index) => (
                    <div key={index}>
                    <h4 className="font-headline text-lg text-foreground mb-2">{section.title}</h4>
                    <WodContentParser content={section.content} />
                    {index < descriptionSections.length - 1 && <Separator className="mt-6" />}
                    </div>
                ))}
                </div>
            </DialogContent>
        </Dialog>
        {hasProfile && <WodProfile wod={wod} />}
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-2 pt-2">
        {source === "community" && (
            <Dialog open={chatOpen} onOpenChange={setChatOpen}>
                <div className="flex items-center justify-between gap-2">
                    <ReactionGrid initialWod={wod} />
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                            <MessageCircle className="mr-2 h-4 w-4" />
                            {wod.commentCount || 0}
                        </Button>
                    </DialogTrigger>
                </div>
                <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{wod.name}</DialogTitle>
                        <DialogDescription>Community Chat</DialogDescription>
                    </DialogHeader>
                    <CommunityChat wodId={wod.id} />
                </DialogContent>
            </Dialog>
        )}
        <Button asChild className="w-full">
          <Link href={href}>{t("startWod")}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function WodProfile({ wod }: { wod: WOD }) {
  const t = useTranslations("WodCard.profile");
  const cardio = wod.cardio ?? 50; // Default to 50 if undefined
  const upperBody = wod.upperBody ?? 50;

  return (
    <div className="space-y-3 pt-2">
      {/* Cardio vs Lifting */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <HeartPulse className="h-3.5 w-3.5 text-red-400"/>
            <span>{t('cardio')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>{t('lifting')}</span>
            <Weight className="h-3.5 w-3.5 text-sky-400"/>
          </div>
        </div>
        <div className="flex items-center gap-1 w-full">
            <Progress value={cardio} className="h-2 [&>div]:bg-red-400" />
            <Progress value={100-cardio} className="h-2 [&>div]:bg-sky-400" />
        </div>
      </div>

      {/* Upper vs Lower */}
       <div className="space-y-1">
        <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Armchair className="h-3.5 w-3.5 text-amber-400"/>
            <span>{t('upper')}</span>
          </div>
          <div className="flex items-center gap-1.5">
             <span>{t('lower')}</span>
            <Bike className="h-3.5 w-3.5 text-fuchsia-400"/>
          </div>
        </div>
         <div className="flex items-center gap-1 w-full">
            <Progress value={upperBody} className="h-2 [&>div]:bg-amber-400" />
            <Progress value={100-upperBody} className="h-2 [&>div]:bg-fuchsia-400" />
        </div>
      </div>
    </div>
  );
}

