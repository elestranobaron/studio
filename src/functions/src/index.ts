
"use strict";

import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { setGlobalOptions } from "firebase-functions/v2";
import { logger } from "firebase-functions";

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Global options for all functions
setGlobalOptions({ 
  region: "us-central1",
  memory: "512MiB", 
  timeoutSeconds: 120
});

/**
 * Validates Cloudflare Turnstile token
 */
async function validateTurnstile(token: string, ip: string | undefined): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    
    // Safety check for test environments
    if (!token || token.includes('DUMMY') || token === 'XXXX.DUMMY.TOKEN.XXXX') {
        logger.warn('[validateTurnstile] Test token detected. Bypassing.');
        return true;
    }

    if (!secret || secret.startsWith('your_') || secret.includes('DUMMY')) {
        logger.warn('[validateTurnstile] TURNSTILE_SECRET_KEY not configured. Bypassing.');
        return true; 
    }

    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);
    
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });
        const outcome = await response.json() as any;
        return !!outcome.success;
    } catch (e) {
        logger.error('[validateTurnstile] Connection error:', e);
        return false;
    }
}

// Configuration object for functions (CORS handled automatically by onCall)
const callOptions = { 
    maxInstances: 10
};

// --- CLOUD FUNCTIONS ---

export const sendDigicode = onCall(callOptions, async (request) => {
  const { email, turnstileToken } = request.data;
  if (!email) throw new HttpsError("invalid-argument", "Email required");
  
  const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
  if (!isValid) throw new HttpsError("permission-denied", "Robot validation failed");

  const brevoKey = process.env.BREVO_API_KEY;
  if (!brevoKey || brevoKey.startsWith('your_')) {
      throw new HttpsError("failed-precondition", "Email service not configured");
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await db.collection("digicodes").doc(email.toLowerCase()).set({
    code,
    expires: admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
  });

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": brevoKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "WODBurner", email: "noreply@wodburner.app" },
      to: [{ email }],
      templateId: 2,
      params: { DIGICODE: code },
    }),
  });
  
  if (!res.ok) throw new HttpsError("internal", "Email delivery failed");
  return { success: true };
});

export const generateWod = onCall(callOptions, async (request) => {
    logger.info("[generateWod] Execution started");
    try {
        const { turnstileToken } = request.data;
        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid) {
            logger.error("[generateWod] Turnstile validation failed");
            throw new HttpsError("permission-denied", "Turnstile failed");
        }

        // Lazy load the flow to prevent top-level initialization crashes
        logger.info("[generateWod] Importing AI flow...");
        const flowModule = await import("./ai/generate-wod-flow");
        
        logger.info("[generateWod] Running AI flow...");
        const result = await flowModule.generateWod({});
        
        logger.info("[generateWod] Success");
        return result;
    } catch (e: any) {
        logger.error("[generateWod] CRITICAL ERROR:", e);
        // Ensure we throw a serializable error
        throw new HttpsError("internal", e.message || "Internal AI Error", {
            stack: e.stack,
            details: e.details || null
        });
    }
});

export const analyzeWod = onCall(callOptions, async (request) => {
    logger.info("[analyzeWod] Execution started");
    try {
        const { photoDataUri, turnstileToken } = request.data;
        if (!photoDataUri) throw new HttpsError("invalid-argument", "Image required");

        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid) throw new HttpsError("permission-denied", "Turnstile failed");

        // Lazy load the flow
        logger.info("[analyzeWod] Importing AI flow...");
        const flowModule = await import("./ai/analyze-wod-flow");
        
        logger.info("[analyzeWod] Running AI flow...");
        const result = await flowModule.analyzeWod({ photoDataUri });
        
        logger.info("[analyzeWod] Success");
        return result;
    } catch (e: any) {
        logger.error("[analyzeWod] CRITICAL ERROR:", e);
        throw new HttpsError("internal", e.message || "Internal AI Error");
    }
});

export const verifyDigicode = onCall(callOptions, async (request) => {
    const { email, code } = request.data;
    if (!email || !code) throw new HttpsError("invalid-argument", "Missing data");

    const digiDoc = await db.collection("digicodes").doc(email.toLowerCase()).get();
    if (!digiDoc.exists) throw new HttpsError("not-found", "Invalid code");

    const data = digiDoc.data()!;
    if (data.code !== code || data.expires.toMillis() < Date.now()) {
      throw new HttpsError("unauthenticated", "Code expired");
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

    const token = await admin.auth().createCustomToken(uid);
    return { token, isNewUser };
});

export const createCheckout = onCall(callOptions, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
    
    const { yearly, turnstileToken } = request.data;
    const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
    if (!isValid) throw new HttpsError("permission-denied", "Turnstile failed");

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey.includes('your_')) {
        throw new HttpsError("failed-precondition", "Stripe key missing");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
    const priceId = yearly ? process.env.STRIPE_YEARLY_PRICE_ID : process.env.STRIPE_MONTHLY_PRICE_ID;

    if (!priceId) throw new HttpsError("internal", "Stripe Price ID missing");

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/premium?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/premium?cancel=true`,
        metadata: { uid: request.auth.uid },
    });
    return { url: session.url };
});

export const createCustomerPortal = onCall(callOptions, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
    
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const customerId = userDoc.data()?.stripeCustomerId;
    
    if (!customerId) throw new HttpsError("not-found", "Stripe customer not found");

    const stripe = new Stripe(stripeKey!, { apiVersion: "2024-12-18.acacia" });
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    });
    return { url: portalSession.url };
});

export const stripeWebhook = onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const stripeKey = process.env.STRIPE_SECRET_KEY || "";
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
    
    try {
        const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
        if (event.type === "checkout.session.completed") {
            const obj = event.data.object as any;
            const uid = obj.metadata?.uid;
            if (uid) {
                await db.collection("users").doc(uid).set({ premium: true, stripeCustomerId: obj.customer }, { merge: true });
            }
        }
        res.status(200).send({ received: true });
    } catch (err: any) {
        logger.error("Webhook Error:", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

export const resetDailyLimits = onSchedule('0 0 * * *', async () => {
    const users = await db.collection('users').get();
    const batch = db.batch();
    users.forEach(d => batch.update(d.ref, { dailyReactions: 0, wodGenerationCount: 0 }));
    await batch.commit();
});

export const resetMonthlyLimits = onSchedule('0 0 1 * *', async () => {
    const users = await db.collection('users').get();
    const batch = db.batch();
    users.forEach(d => batch.update(d.ref, { ocrCount: 0 }));
    await batch.commit();
});
