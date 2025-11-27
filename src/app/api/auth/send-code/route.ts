// src/app/api/auth/send-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo';
import { digicodeStore } from '@/lib/digicode-store';

const transactionalEmailsApi = new TransactionalEmailsApi();
transactionalEmailsApi.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const code = crypto.randomInt(100000, 999999).toString().padStart(6, '0');
    const expires = Date.now() + 10 * 60 * 1000;

    // digicodeStore.set(...) → 
    await setCode(email.toLowerCase(), code);

    const sendTransacEmail = {
      sender: { name: 'WODBurner', email: 'no-reply@wodburner.app' },
      to: [{ email }],
      templateId: 2,
      params: { DIGICODE: code },
    };

    await transactionalEmailsApi.sendTransacEmail(sendTransacEmail);
    console.log(`Code envoyé à ${email} → ${code}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Brevo error:', error.message || error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}