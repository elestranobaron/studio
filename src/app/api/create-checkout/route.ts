
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, App } from 'firebase-admin/app';

// Ensure Firebase Admin is initialized
function initializeFirebaseAdmin(): App {
  if (getApps().length) {
    return getApps()[0]!;
  }
  return initializeApp();
}

const app = initializeFirebaseAdmin();
const auth = getAuth(app);


export async function POST(req: NextRequest) {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID || 'price_1PxxUyRp45w1j9vNB3Qo7kAD';
    const STRIPE_YEARLY_PRICE_ID = process.env.STRIPE_YEARLY_PRICE_ID || 'price_1PxxUyRp45w1j9vN297X6t5I';

    if (!STRIPE_SECRET_KEY) {
        console.error('API Route Error: STRIPE_SECRET_KEY is not set in environment variables.');
        return NextResponse.json({ error: 'Server configuration error: Stripe secret key is missing.' }, { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: "2024-06-20",
    });
  
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    if (!idToken) {
        return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    let decodedToken;
    try {
        decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
        console.error("Error verifying Firebase ID token:", error);
        return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    
    const uid = decodedToken.uid;
    const userEmail = decodedToken.email;

    const { yearly } = await req.json();

    const priceId = yearly ? STRIPE_YEARLY_PRICE_ID : STRIPE_MONTHLY_PRICE_ID;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${req.nextUrl.origin}/premium?success=true`,
      cancel_url: `${req.nextUrl.origin}/premium?cancel=true`,
      customer_email: userEmail || undefined,
      metadata: { uid: uid },
    });

    return NextResponse.json({ id: session.id });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: 'Failed to create checkout session', details: error.message }, { status: 500 });
  }
}
