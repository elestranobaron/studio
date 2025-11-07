
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
import { LoaderCircle, Trash2 } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user || !auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          "Impossible de supprimer le compte. L'utilisateur ou les services Firebase ne sont pas disponibles.",
      });
      return;
    }

    setIsDeleting(true);

    try {
      // 1. Supprimer toutes les données utilisateur de Firestore
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

      // 2. Supprimer l'utilisateur de Firebase Authentication
      await deleteUser(user);

      toast({
        title: 'Compte supprimé',
        description:
          'Votre compte et toutes vos données ont été supprimés avec succès.',
      });

      // Rediriger l'utilisateur après la suppression
      router.push('/login');
    } catch (error: any) {
      console.error('Erreur lors de la suppression du compte:', error);
      
      let description = "Une erreur est survenue. Veuillez réessayer.";
      if (error.code === 'auth/requires-recent-login') {
        description = "Cette opération est sensible et nécessite une connexion récente. Veuillez vous reconnecter avant de réessayer.";
        // Optionnel : déconnecter l'utilisateur pour le forcer à se reconnecter
        auth.signOut();
      }
      
      toast({
        variant: 'destructive',
        title: 'Échec de la suppression',
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
          Paramètres
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Profil</CardTitle>
                    <CardDescription>Informations sur votre compte.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isUserLoading ? (
                        <div className="flex items-center space-x-4">
                            <LoaderCircle className="animate-spin text-muted-foreground" />
                            <p>Chargement du profil...</p>
                        </div>
                    ) : user ? (
                        <div className="space-y-2">
                           <p><strong>Email:</strong> {user.email || "Non spécifié"}</p>
                           <p><strong>Type de compte:</strong> {user.isAnonymous ? "Anonyme (temporaire)" : "Permanent"}</p>
                        </div>
                    ) : (
                         <p>Utilisateur non trouvé.</p>
                    )}
                </CardContent>
            </Card>

            <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Zone de Danger</CardTitle>
              <CardDescription>
                Ces actions sont permanentes et ne peuvent pas être annulées.
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
                    Supprimer mon compte
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Elle supprimera
                      définitivement votre compte et effacera toutes vos données,
                      y compris tous vos WODs enregistrés, de nos serveurs.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Oui, supprimer mon compte
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-sm text-muted-foreground mt-4">
                Si vous supprimez votre compte, toutes vos données seront perdues à jamais.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
