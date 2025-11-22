'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirebase } from "@/firebase";
import { doc, collection, setDoc, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { LoaderCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WodType, type WOD } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";

export default function NewWodPage() {
    const t = useTranslations('NewWodPage');
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState<WodType>('For Time');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState<number | undefined>();
    const [imageHint, setImageHint] = useState('');
    const [duplicateWod, setDuplicateWod] = useState<WOD | null>(null);

    // Redirect anonymous users
    if (!isUserLoading && (!user || user.isAnonymous)) {
        router.replace('/login');
        return null;
    }
    
    const performSave = async (force: boolean = false) => {
        if (!user || !firestore) return;
    
        setIsSaving(true);
        
        try {
            const wodsCollection = collection(firestore, 'users', user.uid, 'wods');
            
            // For a manually created WOD, the description is a single block.
            // We need to match the new structured format.
            const structuredDescription = [{ title: "Workout", content: description }];

            if (!force) {
                const q = query(
                    wodsCollection,
                    where("name", "==", name),
                    where("type", "==", type)
                    // We can't efficiently query the description, but this is a good heuristic.
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const existingWod = querySnapshot.docs[0].data() as WOD;
                    setDuplicateWod(existingWod);
                    setIsSaving(false); 
                    return; 
                }
            }
            
            const newWodRef = doc(wodsCollection);
            const placeholderImageUrl = `https://picsum.photos/seed/${newWodRef.id}/600/400`;
    
            const wodData: Partial<WOD> = {
                id: newWodRef.id,
                userId: user.uid,
                name,
                type,
                description: structuredDescription,
                date: new Date().toISOString(),
                imageUrl: placeholderImageUrl,
                imageHint: imageHint,
            };

            if (duration) {
                wodData.duration = duration;
            }
    
            await setDoc(newWodRef, wodData);
            toast({
                title: t('toasts.saveSuccessTitle'),
                description: t('toasts.saveSuccessDescription'),
            });
            router.push("/dashboard");
    
        } catch (error) {
            console.error("Error saving WOD:", error);
            toast({
                variant: "destructive",
                title: t('toasts.saveFailedTitle'),
                description: t('toasts.saveFailedDescription'),
            });
        } finally {
            setIsSaving(false);
            if (force) setDuplicateWod(null);
        }
      };
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        await performSave();
    };

    const handleForceSave = async () => {
        await performSave(true);
    };

    return (
        <div className="flex flex-col h-full">
            <AlertDialog open={!!duplicateWod} onOpenChange={(open) => !open && setDuplicateWod(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('duplicateDialog.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('duplicateDialog.description')}
                            <br/><br/>
                            <div className="p-4 border rounded-md bg-muted/50">
                                <div className="font-bold">{duplicateWod?.name}</div>
                                <div className="text-sm text-muted-foreground">{duplicateWod?.date ? t('duplicateDialog.savedOn', { date: format(new Date(duplicateWod.date), 'PPP') }) : ''}</div>
                            </div>
                            <br/>
                            {t('duplicateDialog.question')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDuplicateWod(null)}>{t('duplicateDialog.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleForceSave}>{t('duplicateDialog.confirm')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <header className="flex items-center justify-between p-4 border-b md:p-6">
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" size="icon" className="md:hidden">
                        <Link href="/scan"><ArrowLeft/></Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
                        {t('title')}
                    </h1>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleSave}>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('cardTitle')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t('namePlaceholder')}
                                            disabled={isSaving}
                                            required
                                        />
                                        <Select
                                            value={type}
                                            onValueChange={(value: WodType) => setType(value)}
                                            disabled={isSaving}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('typePlaceholder')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="For Time">For Time</SelectItem>
                                                <SelectItem value="AMRAP">AMRAP</SelectItem>
                                                <SelectItem value="EMOM">EMOM</SelectItem>
                                                <SelectItem value="Tabata">Tabata</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            type="number"
                                            value={duration || ''}
                                            onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value) : undefined)}
                                            placeholder={t('durationPlaceholder')}
                                            disabled={isSaving}
                                        />
                                        <Input
                                            value={imageHint}
                                            onChange={(e) => setImageHint(e.target.value)}
                                            placeholder={t('imageHintPlaceholder')}
                                            disabled={isSaving}
                                        />
                                    </div>

                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={10}
                                        className="whitespace-pre-wrap font-mono text-sm"
                                        placeholder={t('descriptionPlaceholder')}
                                        disabled={isSaving}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isSaving || !name || !description}>
                                    {isSaving ? (
                                        <>
                                            <LoaderCircle className="animate-spin mr-2" />
                                            {t('savingButton')}
                                        </>
                                    ) : t('saveButton')}
                                </Button>
                            </CardContent>
                        </Card>
                    </form>
                     <Button asChild variant="link" className="mt-4">
                        <Link href="/scan">
                            <ArrowLeft className="mr-2 h-4 w-4" /> {t('backLink')}
                        </Link>
                    </Button>
                </div>
            </main>
        </div>
    );
}
