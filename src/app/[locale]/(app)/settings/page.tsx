
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirebase } from '@/firebase';
import { deleteUser } from 'firebase/auth';
import { collection, query, getDocs, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Trash2, CreditCard } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useTranslations } from 'next-intl';

export default function SettingsPage() {
  const t = useTranslations('SettingsPage');
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    try {
      const functions = getFunctions();
      const createCustomerPortal = httpsCallable(functions, 'createCustomerPortal');
      const { data } = await createCustomerPortal();
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
      // 1. Delete all user data from Firestore
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

      // 2. Delete the user from Firebase Authentication
      // This requires recent login, which is a security feature.
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      } else {
        throw new Error("No authenticated user found to delete.");
      }


      toast({
        title: t('toasts.deleteSuccessTitle'),
        description: t('toasts.deleteSuccessDescription'),
      });

      // Redirect the user after deletion
      router.push('/login');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      
      let description = t('toasts.deleteFailedDescription');
      if (error.code === 'auth/requires-recent-login') {
        description = t('toasts.deleteFailedRecentLogin');
        // Optional: sign out the user to force them to re-authenticate
        if (auth) {
            await auth.signOut();
        }
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

  const accountType = user?.isAnonymous 
    ? t('profile.typeAnonymous') 
    : (user?.premium ? t('profile.typePremium') : t('profile.typeStandard'));

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 p-4 border-b md:p-6">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
          {t('title')}
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-8">
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
                        <div className="space-y-4">
                           <p><strong>{t('profile.email', { email: user.email || t('profile.emailNotSpecified') })}</strong></p>
                           <p><strong>{t('profile.accountType', { type: accountType })}</strong></p>
                           {user.premium && (
                             <Button onClick={handleManageSubscription} disabled={isPortalLoading}>
                               {isPortalLoading ? (
                                 <LoaderCircle className="mr-2 animate-spin" />
                               ) : (
                                 <CreditCard className="mr-2" />
                               )}
                               {t('profile.manageSubscription')}
                             </Button>
                           )}
                        </div>
                    ) : (
                         <p>{t('profile.userNotFound')}</p>
                    )}
                </CardContent>
            </Card>

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
                    >
                      {t('dangerZone.dialogConfirm')}
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
