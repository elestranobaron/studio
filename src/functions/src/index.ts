
"use strict";

import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { setGlobalOptions } from "firebase-functions/v2";
import { logger } from "firebase-functions";

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

setGlobalOptions({ 
  region: "us-central1",
  memory: "1GiB", 
  timeoutSeconds: 120
});

async function validateTurnstile(token: string, ip: string | undefined): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!token || token.includes('DUMMY')) return true;
    if (!secret || secret.startsWith('your_')) return true; 

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
        logger.error('Turnstile error:', e);
        return false;
    }
}

export const generateWod = onCall({ cors: true }, async (request) => {
    try {
        const { turnstileToken } = request.data;
        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid) throw new HttpsError("permission-denied", "Captcha failed");

        const flowModule = await import("./ai/generate-wod-flow");
        const result = await flowModule.generateWod({});
        return result;
    } catch (e: any) {
        logger.error("[generateWod] Error:", e);
        throw new HttpsError("internal", e.message || "AI Error");
    }
});

export const analyzeWod = onCall({ cors: true }, async (request) => {
    try {
        const { photoDataUri, turnstileToken } = request.data;
        if (!photoDataUri) throw new HttpsError("invalid-argument", "Image required");

        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid) throw new HttpsError("permission-denied", "Captcha failed");

        const flowModule = await import("./ai/analyze-wod-flow");
        const result = await flowModule.analyzeWod({ photoDataUri });
        return result;
    } catch (e: any) {
        logger.error("[analyzeWod] Error:", e);
        throw new HttpsError("internal", e.message || "AI Error");
    }
});

export const generateMealPlan = onCall({ cors: true }, async (request) => {
    try {
        const { turnstileToken, ...input } = request.data;
        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid) throw new HttpsError("permission-denied", "Captcha failed");

        const flowModule = await import("./ai/meal-plan-flow");
        const result = await flowModule.generateMealPlan(input);
        return result;
    } catch (e: any) {
        logger.error("[generateMealPlan] Error:", e);
        throw new HttpsError("internal", e.message || "AI Error");
    }
});

export const sendDigicode = onCall({ cors: true }, async (request) => {
  const { email, turnstileToken } = request.data;
  if (!email) throw new HttpsError("invalid-argument", "Email required");
  
  const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
  if (!isValid) throw new HttpsError("permission-denied", "Captcha failed");

  const brevoKey = process.env.BREVO_API_KEY;
  if (!brevoKey || brevoKey.startsWith('your_')) throw new HttpsError("failed-precondition", "Email config missing");

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
  
  if (!res.ok) throw new HttpsError("internal", "Email failed");
  return { success: true };
});

export const verifyDigicode = onCall({ cors: true }, async (request) => {
    const { email, code } = request.data;
    const digiDoc = await db.collection("digicodes").doc(email.toLowerCase()).get();
    if (!digiDoc.exists) throw new HttpsError("not-found", "Invalid code");

    const data = digiDoc.data()!;
    if (data.code !== code || data.expires.toMillis() < Date.now()) throw new HttpsError("unauthenticated", "Expired");

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

export const createCheckout = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
    const { yearly, turnstileToken } = request.data;
    
    const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
    if (!isValid) throw new HttpsError("permission-denied", "Captcha failed");

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new HttpsError("failed-precondition", "Stripe key missing");

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
    const priceId = yearly ? process.env.STRIPE_YEARLY_PRICE_ID : process.env.STRIPE_MONTHLY_PRICE_ID;
    if (!priceId) throw new HttpsError("failed-precondition", "Price ID missing");

    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    // SÉCURITÉ : Empêcher un abonné actif de souscrire à nouveau
    if (userData?.premium) {
        throw new HttpsError("failed-precondition", "You are already a premium subscriber.");
    }

    const customerId = userData?.stripeCustomerId;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://wodburner.app'}/premium?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://wodburner.app'}/premium?cancel=true`,
        metadata: { uid: request.auth.uid },
        subscription_data: {
            metadata: { uid: request.auth.uid }
        },
        allow_promotion_codes: true,
        payment_method_options: {
            card: {
                request_three_d_secure: "any",
            },
        },
    };

    if (customerId) {
        sessionParams.customer = customerId;
    } else if (request.auth.token.email) {
        sessionParams.customer_email = request.auth.token.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return { url: session.url };
});

export const createCustomerPortal = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
    const { turnstileToken } = request.data;
    
    const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
    if (!isValid) throw new HttpsError("permission-denied", "Captcha failed");

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new HttpsError("failed-precondition", "Stripe key missing");

    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const customerId = userDoc.data()?.stripeCustomerId;
    if (!customerId) throw new HttpsError("not-found", "Stripe customer not found");

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://wodburner.app'}/settings`,
    });
    return { url: portalSession.url };
});

export const stripeWebhook = onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const stripeKey = process.env.STRIPE_SECRET_KEY || "";
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
    
    if (!webhookSecret) {
        logger.error("Webhook Error: STRIPE_WEBHOOK_SECRET is not defined in environment variables.");
        res.status(500).send("Webhook secret missing");
        return;
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err: any) {
        logger.error(`Webhook Signature Verification Failed: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    const subscription = event.data.object as any;
    const uid = subscription.metadata?.uid;

    logger.info(`Processing Stripe event: ${event.type}`, { uid });

    switch (event.type) {
        case "checkout.session.completed":
            if (uid) {
                await db.collection("users").doc(uid).set({ 
                    premium: true, 
                    stripeCustomerId: subscription.customer 
                }, { merge: true });
                logger.info(`User ${uid} upgraded to Premium.`);
            }
            break;

        case "customer.subscription.deleted":
            if (uid) {
                await db.collection("users").doc(uid).update({ premium: false });
                logger.info(`User ${uid} Premium subscription deleted.`);
            }
            break;

        case "invoice.payment_failed":
            if (uid) {
                await db.collection("users").doc(uid).update({ premium: false });
                logger.warn(`User ${uid} Premium revoked due to payment failure.`);
            }
            break;
    }

    res.status(200).send({ received: true });
});

export const resetDailyLimits = onSchedule('0 0 * * *', async () => {
    const users = await db.collection('users').get();
    const batch = db.batch();
    users.forEach(d => batch.update(d.ref, { dailyReactions: 0, wodGenerationCount: 0, mealGenerationCount: 0 }));
    await batch.commit();
});

export const resetMonthlyLimits = onSchedule('0 0 1 * *', async () => {
    const users = await db.collection('users').get();
    const batch = db.batch();
    users.forEach(d => batch.update(d.ref, { ocrCount: 0 }));
    await batch.commit();
});
