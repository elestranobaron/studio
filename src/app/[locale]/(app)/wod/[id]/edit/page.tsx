
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { useUser, useFirebase, useDoc } from '@/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { LoaderCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WodType, type WOD } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';

function EditWodPageSkeleton() {
    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b md:p-6">
                <Skeleton className="h-9 w-48" />
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle><Skeleton className="h-7 w-40" /></CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                                <Skeleton className="h-32 w-full" />
                            </div>
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}


export default function EditWodPage() {
    const t = useTranslations('EditWodPage');
    const router = useRouter();
    const params = useParams();
    const { id: wodId } = params;
    
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const wodRef = useMemo(() => {
        if (!user || !firestore || typeof wodId !== 'string') return null;
        return doc(firestore, 'users', user.uid, 'wods', wodId);
    }, [firestore, user, wodId]);

    const { data: wod, isLoading: isWodLoading, error } = useDoc<WOD>(wodRef);

    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState<WodType>('For Time');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState<number | undefined>();
    const [imageHint, setImageHint] = useState('');

    useEffect(() => {
        if (wod) {
            setName(wod.name);
            setType(wod.type);
            const flatDescription = Array.isArray(wod.description)
                ? wod.description.map(s => s.content).join('\n\n')
                : wod.description;
            setDescription(flatDescription);
            setDuration(wod.duration);
            setImageHint(wod.imageHint || '');
        }
    }, [wod]);

    if (isUserLoading || isWodLoading) {
        return <EditWodPageSkeleton />;
    }

    if (!user || user.isAnonymous) {
        router.replace('/login');
        return <EditWodPageSkeleton />;
    }
    
    // If there was an error fetching or the WOD doesn't exist after loading
    if ((!wod && !isWodLoading) || error) {
        return notFound();
    }
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore || !wod) return;

        setIsSaving(true);
        
        // We structure the potentially flat description back into the array format
        const structuredDescription = [{ title: "Workout", content: description }];

        try {
            const batch = writeBatch(firestore);
            
            const userWodRef = doc(firestore, 'users', user.uid, 'wods', wod.id);
            const wodData: Partial<WOD> = {
                name,
                type,
                description: structuredDescription,
                duration,
                imageHint,
            };
            batch.update(userWodRef, wodData);

            // If the WOD is shared, update the community version too
            if (wod.communityWodId) {
                const communityWodRef = doc(firestore, 'communityWods', wod.communityWodId);
                batch.update(communityWodRef, wodData);
            }

            await batch.commit();

            toast({
                title: t('toasts.updateSuccessTitle'),
                description: t('toasts.updateSuccessDescription'),
            });
            router.push("/dashboard");

        } catch (error) {
            console.error("Error updating WOD:", error);
            toast({
                variant: "destructive",
                title: t('toasts.updateFailedTitle'),
                description: t('toasts.updateFailedDescription'),
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b md:p-6">
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" size="icon" className="md:hidden">
                        <Link href="/dashboard"><ArrowLeft/></Link>
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
                        <Link href="/dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" /> {t('backLink')}
                        </Link>
                    </Button>
                </div>
            </main>
        </div>
    );
}
