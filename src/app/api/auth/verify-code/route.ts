
// src/app/api/auth/verify-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { digicodeStore } from '@/lib/digicode-store';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

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

    // Code is valid, delete it
    digicodeStore.delete(key);

    // Get or create the user record.
    const userRecord = await adminAuth.getUserByEmail(email).catch(async (error) => {
        if (error.code === 'auth/user-not-found') {
          const newUserRecord = await adminAuth.createUser({ email: email });
          // Create user profile in Firestore at the same time
          await adminDb.collection("users").doc(newUserRecord.uid).set({
              email: email,
              premium: false,
              createdAt: new Date().toISOString(),
          }, { merge: true });
          return newUserRecord;
        }
        // For other errors, re-throw
        throw error;
    });

    if (!userRecord) {
        throw new Error('Failed to get or create user record.');
    }

    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    return NextResponse.json({ token: customToken });

  } catch (err: any) {
    console.error('API Verify Code Error:', err);
    // Return a more detailed error message to the client for debugging
    const errorMessage = err.message || 'Failed to verify code';
    const serverResponse = err.errorInfo ? JSON.stringify(err.errorInfo) : 'No server response available';
    return NextResponse.json({ 
        error: `${errorMessage}; Raw server response: "${serverResponse}"`,
    }, { status: 500 });
  }
}
