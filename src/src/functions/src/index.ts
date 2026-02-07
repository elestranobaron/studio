
"use strict";

import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { setGlobalOptions } from "firebase-functions/v2";
import { logger } from "firebase-functions";

// Initialisation Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Config globale : onCall gère le CORS par défaut, on n'ajoute pas cors: true
setGlobalOptions({ 
  region: "us-central1",
  memory: "512MiB",
  timeoutSeconds: 120
});

// Variables d'environnement
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID || '';
const STRIPE_YEARLY_PRICE_ID = process.env.STRIPE_YEARLY_PRICE_ID || '';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function validateTurnstile(token: string, ip: string | undefined): Promise<boolean> {
    if (!TURNSTILE_SECRET_KEY || TURNSTILE_SECRET_KEY.includes('your_')) {
        logger.warn('TURNSTILE_SECRET_KEY is not set correctly. Bypassing validation.');
        return true; 
    }

    const formData = new URLSearchParams();
    formData.append('secret', TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);
    
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });
        
        const outcome = await response.json() as any;
        if (!outcome.success) {
          logger.error('Turnstile validation failed:', outcome['error-codes']);
        }
        return outcome.success;
    } catch (e) {
        logger.error('Error contacting Turnstile:', e);
        return false;
    }
}

// --- CLOUD FUNCTIONS ---

exports.sendDigicode = onCall(async (request) => {
  try {
    const { email, turnstileToken } = request.data;
    if (!email) throw new HttpsError("invalid-argument", "Email is required.");
    
    const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
    if (!isValid) throw new HttpsError("permission-denied", "Captcha invalid.");

    if (!process.env.BREVO_API_KEY) throw new HttpsError("internal", "BREVO_API_KEY missing.");

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await db.collection("digicodes").doc(email.toLowerCase()).set({
      code,
      expires: admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
    });

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "WODBurner", email: "noreply@wodburner.app" },
        to: [{ email }],
        templateId: 2,
        params: { DIGICODE: code },
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return { success: true };
  } catch (error: any) {
    logger.error("sendDigicode error", error);
    throw new HttpsError("internal", error.message);
  }
});

exports.generateWod = onCall(async (request) => {
    try {
        const { turnstileToken } = request.data;
        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid) throw new HttpsError("permission-denied", "Captcha invalid.");

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            throw new HttpsError("failed-precondition", "GEMINI_API_KEY is missing.");
        }
        
        process.env.GOOGLE_GENAI_API_KEY = geminiKey;

        const { generateWod } = await import('./ai/generate-wod-flow');
        const result = await generateWod({});
        return result;
    } catch (e: any) {
        logger.error("generateWod crash", e);
        throw new HttpsError("internal", e.message, e.stack);
    }
});

exports.analyzeWod = onCall(async (request) => {
    try {
        const { photoDataUri, turnstileToken } = request.data;
        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid) throw new HttpsError("permission-denied", "Captcha invalid.");

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            throw new HttpsError("failed-precondition", "GEMINI_API_KEY is missing.");
        }
        process.env.GOOGLE_GENAI_API_KEY = geminiKey;

        const { analyzeWod } = await import("./ai/analyze-wod-flow");
        const result = await analyzeWod({ photoDataUri });
        return result;
    } catch (e: any) {
        logger.error("analyzeWod crash", e);
        throw new HttpsError("internal", e.message, e.stack);
    }
});

exports.verifyDigicode = onCall(async (request) => {
  try {
    const { email, code } = request.data;
    const digiDoc = await db.collection("digicodes").doc(email.toLowerCase()).get();
    if (!digiDoc.exists) throw new HttpsError("not-found", "Invalid code.");

    const data = digiDoc.data()!;
    if (data.code !== code || data.expires.toMillis() < Date.now()) {
      throw new HttpsError("unauthenticated", "Expired or invalid code.");
    }

    await digiDoc.ref.delete();
    let uid: string;
    let isNewUser = false;
    try {
      const user = await admin.auth().getUserByEmail(email.toLowerCase());
      uid = user.uid;
    } catch {
      const user = await admin.auth().createUser({ email: email.toLowerCase() });
      uid = user.uid;
      isNewUser = true;
    }

    return { token: await admin.auth().createCustomToken(uid), isNewUser };
  } catch (error: any) {
    logger.error("verifyDigicode error", error);
    throw new HttpsError("internal", error.message);
  }
});

exports.createCheckout = onCall(async (request) => {
    try {
        if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
        const { yearly, turnstileToken } = request.data;
        
        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid) throw new HttpsError("permission-denied", "Captcha failed.");

        const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" });
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{ price: yearly ? STRIPE_YEARLY_PRICE_ID : STRIPE_MONTHLY_PRICE_ID, quantity: 1 }],
            mode: "subscription",
            success_url: `${NEXT_PUBLIC_APP_URL}/premium?success=true`,
            cancel_url: `${NEXT_PUBLIC_APP_URL}/premium?cancel=true`,
            metadata: { uid: request.auth.uid },
        });
        return { url: session.url };
    } catch (error: any) {
        logger.error("createCheckout error", error);
        throw new HttpsError("internal", error.message);
    }
});

exports.stripeWebhook = onRequest({ cors: true }, async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" });
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    if (event.type === "checkout.session.completed") {
        const obj = event.data.object as any;
        const uid = obj.metadata?.uid;
        if (uid) {
            await db.collection("users").doc(uid).set({ premium: true, stripeCustomerId: obj.customer }, { merge: true });
        }
    }
    res.status(200).send({ received: true });
});

exports.resetDailyLimits = onSchedule('0 0 * * *', async () => {
    const users = await db.collection('users').get();
    const batch = db.batch();
    users.forEach(d => batch.update(d.ref, { dailyReactions: 0, wodGenerationCount: 0, dailyReset: admin.firestore.Timestamp.now() }));
    await batch.commit();
});

exports.resetMonthlyLimits = onSchedule('0 0 1 * *', async () => {
    const users = await db.collection('users').get();
    const batch = db.batch();
    users.forEach(d => batch.update(d.ref, { ocrCount: 0, ocrReset: admin.firestore.Timestamp.now() }));
    await batch.commit();
});
