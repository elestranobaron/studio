
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
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        userRecord = await adminAuth.createUser({ email });
        await adminDb.collection("users").doc(userRecord.uid).set({
            email: userRecord.email,
            premium: false,
            createdAt: new Date().toISOString(),
        }, { merge: true });
      } else {
        throw error;
      }
    }

    const customToken = await adminAuth.createCustomToken(userRecord.uid);
    return NextResponse.json({ token: customToken });

  } catch (err: any) {
    console.error('API Verify Code Error:', err);
    return NextResponse.json({ error: 'Server error during verification: ' + err.message }, { status: 500 });
  }
}
