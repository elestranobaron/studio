
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

export default function SettingsPage() {
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
        description: error.message || 'Could not open subscription management.',
      });
      setIsPortalLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          "Could not delete account. User or Firebase services are not available.",
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
      await deleteUser(user);

      toast({
        title: 'Account Deleted',
        description:
          'Your account and all your data have been successfully deleted.',
      });

      // Redirect the user after deletion
      router.push('/login');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      
      let description = "An error occurred. Please try again.";
      if (error.code === 'auth/requires-recent-login') {
        description = "This operation is sensitive and requires recent authentication. Please sign in again before retrying.";
        // Optional: sign out the user to force them to re-authenticate
        auth.signOut();
        router.push('/login');
      }
      
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: description,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 p-4 border-b md:p-6">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
          Settings
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Information about your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isUserLoading ? (
                        <div className="flex items-center space-x-4">
                            <LoaderCircle className="animate-spin text-muted-foreground" />
                            <p>Loading profile...</p>
                        </div>
                    ) : user ? (
                        <div className="space-y-4">
                           <p><strong>Email:</strong> {user.email || "Not specified"}</p>
                           <p><strong>Account Type:</strong> {user.isAnonymous ? "Anonymous (Temporary)" : (user.premium ? 'Premium' : 'Standard')}</p>
                           {user.premium && (
                             <Button onClick={handleManageSubscription} disabled={isPortalLoading}>
                               {isPortalLoading ? (
                                 <LoaderCircle className="mr-2 animate-spin" />
                               ) : (
                                 <CreditCard className="mr-2" />
                               )}
                               Manage My Subscription
                             </Button>
                           )}
                        </div>
                    ) : (
                         <p>User not found.</p>
                    )}
                </CardContent>
            </Card>

            <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                These actions are permanent and cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting || isUserLoading || !user}>
                     {isDeleting ? (
                        <LoaderCircle className="animate-spin mr-2" />
                     ) : (
                        <Trash2 className="mr-2" />
                     )}
                    Delete My Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action is irreversible. It will permanently delete your account and erase all of your data, including all your saved WODs, from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-sm text-muted-foreground mt-4">
                If you delete your account, all your data will be lost forever.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
