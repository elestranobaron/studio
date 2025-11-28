
// src/app/api/auth/verify-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { digicodeStore } from '@/lib/digicode-store';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import type { UserRecord } from 'firebase-admin/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Verify the digicode
    const stored = await digicodeStore.get(normalizedEmail);
    if (!stored || stored.code !== code || stored.expires < Date.now()) {
      await digicodeStore.delete(normalizedEmail);
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Code is valid, delete it now.
    await digicodeStore.delete(normalizedEmail);

    // 2. Get or create the user in Firebase Auth (bulletproof method)
    let userRecord: UserRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(normalizedEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`User not found for ${normalizedEmail}. Creating...`);
        userRecord = await adminAuth.createUser({
          email: normalizedEmail,
          emailVerified: true, // Auto-verify email as they proved ownership via code
        });
        
        // CRITICAL: Create the user profile in Firestore.
        console.log('Creating user profile in Firestore for UID:', userRecord.uid);
        await adminDb.collection("users").doc(userRecord.uid).set({
            email: userRecord.email,
            premium: false,
            createdAt: new Date().toISOString(),
        }, { merge: true });

        console.log('New user created successfully in Auth and Firestore:', userRecord.uid);
      } else {
        // For any other Firebase error, rethrow it.
        console.error('Firebase Admin Error (getUserByEmail):', error);
        throw error;
      }
    }

    // 3. Generate the custom token (userRecord is now guaranteed to exist)
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    return NextResponse.json({ token: customToken });

  } catch (err: any) {
    console.error('verify-code fatal error:', err);
    // Return a structured error to the client
    const errorMessage = err.message || 'Server error during verification.';
    return NextResponse.json(
      { error: errorMessage, details: err.toString() },
      { status: 500 }
    );
  }
}
