
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirebase } from '@/firebase';
import { deleteUser } from 'firebase/auth';
import { collection, query, getDocs, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { LoaderCircle, Trash2, CreditCard, ArrowLeft, User, Scale, Ruler, Camera } from 'lucide-react';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useTranslations } from 'next-intl';
import Turnstile from '@/components/turnstile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = document.createElement("img");
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas failure"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });

export default function SettingsPage() {
  const t = useTranslations('SettingsPage');
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const { toggleSidebar } = useSidebar();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setWeight(user.weight?.toString() || '');
      setHeight(user.height?.toString() || '');
      setPhotoURL(user.photoURL || '');
    }
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await toBase64(file);
        setPhotoURL(base64);
      } catch (error) {
        console.error("Error processing image:", error);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) return;

    setIsSavingProfile(true);
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        displayName,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        photoURL,
      });
      toast({
        title: t('profile.updateSuccess'),
        description: t('profile.updateSuccessDesc'),
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: t('profile.updateError'),
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!turnstileToken) {
        toast({
            variant: "destructive",
            title: "Verification required",
            description: "Please complete the captcha."
        });
        return;
    }

    setIsPortalLoading(true);
    try {
      const functions = getFunctions();
      const createCustomerPortal = httpsCallable(functions, 'createCustomerPortal');
      const { data } = await createCustomerPortal({ turnstileToken });
      const portalUrl = (data as { url: string }).url;
      if (portalUrl) {
        window.location.href = portalUrl;
      } else {
        throw new Error("Portal URL not returned from function.");
      }
    } catch (error: any) {
      console.error("Error creating customer portal session:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || t('toasts.portalError'),
      });
      setIsPortalLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: t('toasts.deleteError'),
      });
      return;
    }

    setIsDeleting(true);

    try {
      const wodsCollectionRef = collection(firestore, 'users', user.uid, 'wods');
      const q = query(wodsCollectionRef);
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const batch = writeBatch(firestore);
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }

      toast({
        title: t('toasts.deleteSuccessTitle'),
        description: t('toasts.deleteSuccessDescription'),
      });

      router.push('/login');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      let description = t('toasts.deleteFailedDescription');
      if (error.code === 'auth/requires-recent-login') {
        description = t('toasts.deleteFailedRecentLogin');
        if (auth) await auth.signOut();
        router.push('/login');
      }
      toast({
        variant: 'destructive',
        title: t('toasts.deleteFailedTitle'),
        description: description,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const onTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const onTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const accountType = user?.isAnonymous 
    ? t('profile.typeAnonymous') 
    : (user?.premium ? t('profile.typePremium') : t('profile.typeStandard'));

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-4 border-b md:p-6">
        <div className="flex items-center gap-2 md:hidden">
             <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
             <div onClick={toggleSidebar} className="flex items-center gap-4 cursor-pointer">
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                    {t('title')}
                </h1>
            </div>
        </div>
        <div className="hidden items-center gap-4 md:flex">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
              {t('title')}
            </h1>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-8">
            
            {/* PERSONAL PROFILE CARD */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('profile.personalTitle')}</CardTitle>
                    <CardDescription>{t('profile.personalDescription')}</CardDescription>
                </CardHeader>
                <form onSubmit={handleSaveProfile}>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center sm:flex-row gap-6">
                            <div className="relative group">
                                <Avatar className="h-24 w-24 border-2 border-primary/20">
                                    <AvatarImage src={photoURL} />
                                    <AvatarFallback><User className="h-12 w-12" /></AvatarFallback>
                                </Avatar>
                                <label 
                                    htmlFor="avatar-upload" 
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                                >
                                    <Camera className="h-8 w-8 text-white" />
                                </label>
                                <input 
                                    id="avatar-upload" 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleAvatarChange}
                                />
                            </div>
                            <div className="flex-1 w-full space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="displayName">{t('profile.displayName')}</Label>
                                    <Input 
                                        id="displayName" 
                                        value={displayName} 
                                        onChange={(e) => setDisplayName(e.target.value)} 
                                        placeholder="Coach Glassman"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="height" className="flex items-center gap-2">
                                    <Ruler className="h-4 w-4" /> {t('profile.height')}
                                </Label>
                                <Input 
                                    id="height" 
                                    type="number" 
                                    value={height} 
                                    onChange={(e) => setHeight(e.target.value)} 
                                    placeholder="180"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="weight" className="flex items-center gap-2">
                                    <Scale className="h-4 w-4" /> {t('profile.weight')}
                                </Label>
                                <Input 
                                    id="weight" 
                                    type="number" 
                                    value={weight} 
                                    onChange={(e) => setWeight(e.target.value)} 
                                    placeholder="85"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSavingProfile || isUserLoading} className="w-full sm:w-auto">
                            {isSavingProfile && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            {t('profile.saveProfile')}
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            {/* ACCOUNT INFO CARD */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('profile.title')}</CardTitle>
                    <CardDescription>{t('profile.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isUserLoading ? (
                        <div className="flex items-center space-x-4">
                            <LoaderCircle className="animate-spin text-muted-foreground" />
                            <p>{t('profile.loading')}</p>
                        </div>
                    ) : user ? (
                        <div className="space-y-6">
                           <div className="space-y-1">
                                <p><strong>{t('profile.email', { email: user.email || t('profile.emailNotSpecified') })}</strong></p>
                                <p><strong>{t('profile.accountType', { type: accountType })}</strong></p>
                           </div>
                           
                           {user.premium && (
                             <div className="space-y-4 pt-4 border-t">
                               <div className="flex justify-start">
                                    <Turnstile onSuccess={onTurnstileSuccess} onExpire={onTurnstileExpire} />
                               </div>
                               <Button onClick={handleManageSubscription} disabled={isPortalLoading || !turnstileToken} className="w-full sm:w-auto">
                                 {isPortalLoading ? (
                                   <LoaderCircle className="mr-2 animate-spin" />
                                 ) : (
                                   <CreditCard className="mr-2" />
                                 )}
                                 {t('profile.manageSubscription')}
                               </Button>
                             </div>
                           )}
                        </div>
                    ) : (
                         <p>{t('profile.userNotFound')}</p>
                    )}
                </CardContent>
            </Card>

            {/* DANGER ZONE */}
            <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">{t('dangerZone.title')}</CardTitle>
              <CardDescription>
                {t('dangerZone.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting || isUserLoading || !user || user.isAnonymous}>
                     {isDeleting ? (
                        <><LoaderCircle className="animate-spin mr-2" />{t('dangerZone.deletingButton')}</>
                     ) : (
                        <><Trash2 className="mr-2" />{t('dangerZone.deleteButton')}</>
                     )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('dangerZone.dialogTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('dangerZone.dialogDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('dangerZone.dialogCancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive hover:bg-destructive/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : t('dangerZone.dialogConfirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-sm text-muted-foreground mt-4">
                {t('dangerZone.helpText')}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
