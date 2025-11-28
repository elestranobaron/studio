
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
    const stored = digicodeStore.get(key);

    if (!stored || Date.now() > stored.expires || stored.code !== code) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    digicodeStore.delete(key);

    let userRecord: UserRecord;
    try {
      // Try to get the user first.
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      // If the user is not found, create them.
      if (error.code === 'auth/user-not-found') {
        userRecord = await adminAuth.createUser({ email });
      } else {
        // For any other errors, re-throw to be caught by the outer try...catch.
        throw error;
      }
    }

    // Ensure user profile exists in Firestore.
    const userDocRef = adminDb.collection("users").doc(userRecord.uid);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
        await userDocRef.set({
            email: userRecord.email,
            premium: false,
            createdAt: new Date().toISOString(),
        }, { merge: true });
    }

    // Now userRecord is guaranteed to be valid, so we can create the token.
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    return NextResponse.json({ token: customToken });

  } catch (err: any) {
    console.error('API Verify Code Error:', err);
    // Construct a more informative error message.
    const errorMessage = err.message || 'Failed to verify code';
    const errorCode = err.code || 'internal-error';
    return NextResponse.json({ error: errorMessage, code: errorCode }, { status: 500 });
  }
}
