
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
      // Attempt to get the user by email
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      // If and only if the user is not found, create them
      if (error.code === 'auth/user-not-found') {
        console.log(`User not found for ${email}. Creating new user.`);
        userRecord = await adminAuth.createUser({ email });
        // Also create their profile in Firestore
        await adminDb.collection("users").doc(userRecord.uid).set({
            email: userRecord.email,
            premium: false,
            createdAt: new Date().toISOString(),
        }, { merge: true });
      } else {
        // For any other error (e.g., network issues), re-throw it
        throw error;
      }
    }

    // By this point, userRecord is guaranteed to be a valid UserRecord
    const customToken = await adminAuth.createCustomToken(userRecord.uid);
    return NextResponse.json({ token: customToken });

  } catch (err: any) {
    console.error('API Verify Code Error:', err);
    // Return a more detailed error to the client for debugging
    const errorMessage = err.message || 'Failed to verify code';
    const errorCode = err.code || 'auth/internal-error';
    return NextResponse.json({ error: `Server error during verification: ${errorMessage}`, code: errorCode }, { status: 500 });
  }
}
