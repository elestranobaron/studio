
// src/app/api/auth/verify-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { digicodeStore } from '@/lib/digicode-store';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import type { UserRecord } from 'firebase-admin/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 });
    }

    const key = email.toLowerCase();
    const stored = await digicodeStore.get(key);

    if (!stored || Date.now() > stored.expires || stored.code !== code) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    await digicodeStore.delete(key);

    let userRecord: UserRecord;
    try {
      // Étape 1 : Essayer de récupérer l'utilisateur depuis Firebase Authentication
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      // Étape 2 : Si l'utilisateur n'existe pas, le créer
      if (error.code === 'auth/user-not-found') {
        console.log(`User not found for ${email}. Creating new user.`);
        userRecord = await adminAuth.createUser({ email });
        // Créer son profil dans Firestore en même temps
        await adminDb.collection("users").doc(userRecord.uid).set({
            email: userRecord.email,
            premium: false,
            createdAt: new Date().toISOString(),
        }, { merge: true });
      } else {
        // Pour toute autre erreur, la renvoyer
        throw error;
      }
    }

    // Étape 3 : Générer le jeton personnalisé. `userRecord` est maintenant garanti d'exister.
    const customToken = await adminAuth.createCustomToken(userRecord.uid);
    return NextResponse.json({ token: customToken });

  } catch (err: any) {
    console.error('API Verify Code Error:', err);
    // Retourner un message d'erreur clair au client
    const errorMessage = err.message || 'Failed to verify code';
    const errorCode = err.code || 'auth/internal-error';
    return NextResponse.json({ error: `Server error during verification: ${errorMessage}`, code: errorCode }, { status: 500 });
  }
}
