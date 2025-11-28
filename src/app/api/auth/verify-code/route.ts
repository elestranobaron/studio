// src/app/api/auth/verify-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { digicodeStore } from '@/lib/digicode-store';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import type { UserRecord } from 'firebase-admin/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code || code.length !== 6) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Vérification de TON digicode
    const stored = await digicodeStore.get(normalizedEmail);
    if (!stored || stored.code !== code || stored.expires < Date.now()) {
      await digicodeStore.delete(normalizedEmail);
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 });
    }

    await digicodeStore.delete(normalizedEmail);

    // 2. ON FORCE LA CRÉATION OU RÉCUPÉRATION DE L'UTILISATEUR (blindé)
    let userRecord: UserRecord;

    try {
      userRecord = await adminAuth.getUserByEmail(normalizedEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`Utilisateur non trouvé pour ${normalizedEmail}. Création...`);
        userRecord = await adminAuth.createUser({
          email: normalizedEmail,
          emailVerified: true,
        });
        
        // CRITICAL: Create the user profile in Firestore.
        await adminDb.collection("users").doc(userRecord.uid).set({
            email: userRecord.email,
            premium: false,
            createdAt: new Date().toISOString(),
        }, { merge: true });

        console.log('Nouvel utilisateur créé dans Auth et Firestore:', userRecord.uid);
      } else {
        // For any other Firebase error, we rethrow it.
        console.error('Erreur Firebase (getUserByEmail):', error);
        throw error;
      }
    }

    // 3. Génération du custom token (maintenant userRecord.uid est GARANTI)
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    return NextResponse.json({ token: customToken });

  } catch (err: any) {
    console.error('verify-code fatal error:', err);
    // Return a structured error to the client
    return NextResponse.json(
      { error: 'Server error during verification: ' + err.message },
      { status: 500 }
    );
  }
}
