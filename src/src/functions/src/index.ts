
"use strict";

import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import type { QuerySnapshot, DocumentSnapshot } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";

admin.initializeApp();
const db = admin.firestore();

// Global config for all functions
setGlobalOptions({ 
  region: "us-central1"
});

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID || '';
const STRIPE_YEARLY_PRICE_ID = process.env.STRIPE_YEARLY_PRICE_ID || '';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function validateTurnstile(token: string, ip: string | undefined): Promise<boolean> {
    if (!TURNSTILE_SECRET_KEY) {
        console.warn('TURNSTILE_SECRET_KEY is not set. Captcha bypass in development.');
        return true; 
    }

    const formData = new FormData();
    formData.append('secret', TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    if (ip) {
        formData.append('remoteip', ip);
    }
    
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });
        
        const outcome = await response.json() as { success: boolean; 'error-codes'?: string[] };
        if (!outcome.success) {
          console.error('Turnstile validation failed. Codes:', outcome['error-codes']);
        }
        return outcome.success;
    } catch (e) {
        console.error('Error contacting Turnstile:', e);
        return false;
    }
}

function generateDigicode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.sendDigicode = onCall({ cors: true }, async (request) => {
  const { email, turnstileToken } = request.data;
  if (!email || typeof email !== "string") {
    throw new HttpsError("invalid-argument", "A valid email address is required.");
  }
  
  if (!turnstileToken) {
    throw new HttpsError("invalid-argument", "Captcha token is missing.");
  }
  
  const isTurnstileValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
  if (!isTurnstileValid) {
      throw new HttpsError("permission-denied", "Captcha validation failed.");
  }

  if (!process.env.BREVO_API_KEY) {
    throw new HttpsError("internal", "Mail service BREVO_API_KEY is missing.");
  }

  const code = generateDigicode();
  const expires = admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);

  await db.collection("digicodes").doc(email).set({
    code,
    expires,
  });

  try {
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "WODBurner Team", email: "noreply@wodburner.app" },
        to: [{ email }],
        templateId: 2,
        params: { DIGICODE: code },
      }),
    });

    if (!brevoRes.ok) {
      throw new Error(`Brevo error: ${await brevoRes.text()}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("sendDigicode error:", error);
    throw new HttpsError("internal", error.message || "An unexpected error occurred.");
  }
});

exports.generateWod = onCall({ cors: true, timeoutSeconds: 60 }, async (request) => {
    try {
        const { turnstileToken } = request.data;
        if (!turnstileToken) throw new HttpsError("invalid-argument", "Captcha token is missing.");
        
        const isTurnstileValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isTurnstileValid) throw new HttpsError("permission-denied", "Captcha validation failed.");

        if (!process.env.GEMINI_API_KEY) throw new HttpsError("failed-precondition", "GEMINI_API_KEY is missing on server.");

        // On s'assure que Genkit trouve la clé là où il l'attend
        process.env.GOOGLE_GENAI_API_KEY = process.env.GEMINI_API_KEY;

        const { generateWod } = await import('./ai/generate-wod-flow');
        const result = await generateWod({});
        return { data: result, error: null };
    } catch (e: any) {
        console.error("[generateWod] Error:", e);
        return { 
            data: null, 
            error: e.message || "Unknown error",
            stack: e.stack || ""
        };
    }
});

exports.analyzeWod = onCall({ cors: true, timeoutSeconds: 60 }, async (request) => {
    try {
        const { photoDataUri, turnstileToken } = request.data;
        if (!photoDataUri) throw new HttpsError("invalid-argument", "photoDataUri is required.");
        if (!turnstileToken) throw new HttpsError("invalid-argument", "Captcha token is missing.");
        
        const isTurnstileValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isTurnstileValid) throw new HttpsError("permission-denied", "Captcha validation failed.");

        if (!process.env.GEMINI_API_KEY) throw new HttpsError("failed-precondition", "GEMINI_API_KEY is missing on server.");
        
        process.env.GOOGLE_GENAI_API_KEY = process.env.GEMINI_API_KEY;

        const { analyzeWod } = await import("./ai/analyze-wod-flow");
        const result = await analyzeWod({ photoDataUri });
        return { data: result, error: null };
    } catch (e: any) {
        console.error("[analyzeWod] Error:", e);
        return { 
            data: null, 
            error: e.message || "Unknown error",
            stack: e.stack || ""
        };
    }
});

exports.verifyDigicode = onCall({ cors: true }, async (request) => {
  try {
    const { email, code } = request.data;
    if (!email || !code) throw new HttpsError("invalid-argument", "Email and code are required.");

    const codeRef = db.collection("digicodes").doc(email.toLowerCase());
    const codeDoc = await codeRef.get();

    if (!codeDoc.exists) throw new HttpsError("not-found", "Invalid code.");

    const { code: storedCode, expires } = codeDoc.data()!;
    if (expires.toMillis() < Date.now()) {
      await codeRef.delete();
      throw new HttpsError("deadline-exceeded", "Code expired.");
    }

    if (storedCode !== code) throw new HttpsError("unauthenticated", "Invalid code.");

    await codeRef.delete();

    let uid: string;
    let isNewUser = false;
    try {
      const user = await admin.auth().getUserByEmail(email.toLowerCase());
      uid = user.uid;
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        const newUser = await admin.auth().createUser({ email: email.toLowerCase() });
        uid = newUser.uid;
        isNewUser = true;
      } else {
        throw err;
      }
    }

    const customToken = await admin.auth().createCustomToken(uid);
    return { token: customToken, isNewUser };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Sign-in error");
  }
});

exports.createCheckout = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required.");

    const { yearly, turnstileToken } = request.data;
    if (!turnstileToken) throw new HttpsError("invalid-argument", "Captcha missing.");
    
    const isTurnstileValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
    if (!isTurnstileValid) throw new HttpsError("permission-denied", "Captcha failed.");

    if (!process.env.STRIPE_SECRET_KEY) throw new HttpsError("internal", 'Stripe key missing.');
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" });
    const uid = request.auth.uid;
    
    const priceId = yearly === true ? STRIPE_YEARLY_PRICE_ID : STRIPE_MONTHLY_PRICE_ID;
    if (!priceId) throw new HttpsError("internal", "Stripe Price ID missing.");

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        allow_promotion_codes: true,
        success_url: `${NEXT_PUBLIC_APP_URL}/premium?success=true`,
        cancel_url: `${NEXT_PUBLIC_APP_URL}/premium?cancel=true`,
        customer_email: request.auth.token.email || undefined,
        metadata: { uid },
        subscription_data: { metadata: { uid } },
    });

    return { url: session.url };
});

exports.stripeWebhook = onRequest({ cors: true }, async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    if (!process.env.STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      res.status(500).send("Config error");
      return;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (["checkout.session.completed", "customer.subscription.created", "invoice.paid"].includes(event.type)) {
      const obj = event.data.object as any;
      let uid = obj.metadata?.uid;
      let email = (obj.customer_details?.email || obj.customer_email || "").toLowerCase().trim();
      let customerId = obj.customer;

      if (uid) {
          const userRef = db.collection("users").doc(uid);
          try {
               await db.runTransaction(async (transaction) => {
                  const updateData: any = {
                      premium: true,
                      stripeCustomerId: customerId,
                  };
                  transaction.set(userRef, updateData, { merge: true });

                  const yearlyPriceId = STRIPE_YEARLY_PRICE_ID;
                  const lineItems = obj.line_items || obj.items;
                  const isYearly = lineItems?.data?.[0]?.price?.id === yearlyPriceId || obj.plan?.id === yearlyPriceId;
                  
                  if (isYearly) {
                      const hallOfFameRef = db.collection("hallOfFame");
                      const ogDocRef = hallOfFameRef.doc(uid);
                      const ogDoc = await transaction.get(ogDocRef);
                      if (!ogDoc.exists) {
                          const count = (await hallOfFameRef.get()).size;
                          if (count < 300) {
                              transaction.set(ogDocRef, {
                                  uid,
                                  displayName: email.split('@')[0] || 'Member',
                                  rank: count + 1,
                                  joinedAt: admin.firestore.FieldValue.serverTimestamp()
                              });
                          }
                      }
                  }
              });
          } catch(error) {
              console.error(`Transaction failed for ${uid}:`, error);
          }
      }
    }
    res.status(200).send({ received: true });
});

exports.resetDailyLimits = onSchedule('0 0 * * *', async () => {
    const usersSnapshot = await db.collection('users').get();
    const batch = db.batch();
    usersSnapshot.forEach(doc => {
        batch.update(doc.ref, { dailyReactions: 0, wodGenerationCount: 0, dailyReset: admin.firestore.Timestamp.now() });
    });
    await batch.commit();
});

exports.resetMonthlyLimits = onSchedule('0 0 1 * *', async () => {
    const usersSnapshot = await db.collection('users').get();
    const batch = db.batch();
    usersSnapshot.forEach(doc => {
        batch.update(doc.ref, { ocrCount: 0, ocrReset: admin.firestore.Timestamp.now() });
    });
    await batch.commit();
});
