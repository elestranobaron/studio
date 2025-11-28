
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

    // Code is valid, delete it from our temporary store
    digicodeStore.delete(key);

    let userRecord;
    try {
      // 1. Try to get the user from Firebase AUTHENTICATION
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      // 2. If the user is NOT in Firebase Authentication, create them.
      if (error.code === 'auth/user-not-found') {
        userRecord = await adminAuth.createUser({
          email: email,
          // You can set a display name or other properties here if needed
          // displayName: email.split('@')[0], 
        });
        
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
    
    if (!userRecord) {
        throw new Error('Failed to get or create user record.');
    }

    // 3. Now that we have a valid user record (either found or created), generate the custom token.
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    return NextResponse.json({ token: customToken });

  } catch (err: any) {
    console.error('API Verify Code Error:', err);
    // Provide a clear error message to the client
    return NextResponse.json({ 
        error: `Server error during verification: ${err.message}`,
        details: err.code || 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}
