import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo';

// Initialisation officielle Brevo (docs 2025 : GitHub + npm exemples)
const transactionalEmailsApi = new TransactionalEmailsApi();
transactionalEmailsApi.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!);

// Stockage en mémoire (comme avant)
const codes = new Map<string, { code: string; expires: number }>();

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const code = crypto.randomInt(100000, 999999).toString().padStart(6, '0');
    const expires = Date.now() + 10 * 60 * 1000; // 10 min
    codes.set(email.toLowerCase(), { code, expires });

    // Envoi via template #2 (exemple officiel adapté)
    const sendTransacEmail = {
      sender: { name: 'WODBurner', email: 'no-reply@wodburner.app' },
      to: [{ email }],
      templateId: 2,  // Ton template #2
      params: { DIGICODE: code },
    };

    await transactionalEmailsApi.sendTransacEmail(sendTransacEmail);

    console.log(`Code envoyé à ${email} → ${code}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur Brevo:', error.message || error.body || error);
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 });
  }
}