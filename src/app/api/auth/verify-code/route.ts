
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

    // Code is valid, delete it
    digicodeStore.delete(key);

    let userRecord: UserRecord;
    try {
      // First, try to get the user by email
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      // If the user is not found, create a new one
      if (error.code === 'auth/user-not-found') {
        userRecord = await adminAuth.createUser({ email });
        // Also create their profile in Firestore database
        await adminDb.collection("users").doc(userRecord.uid).set({
            email: email,
            premium: false,
            createdAt: new Date().toISOString(),
        }, { merge: true });
      } else {
        // For any other error (e.g., network issues), we stop.
        throw error;
      }
    }
    
    // Now that we have a valid user record (either found or created), generate the custom token.
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    return NextResponse.json({ token: customToken });

  } catch (err: any) {
    console.error('API Verify Code Error:', err);
    return NextResponse.json({ 
        error: `Server error during verification: ${err.message}`,
    }, { status: 500 });
  }
}
