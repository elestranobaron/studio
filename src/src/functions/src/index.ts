
"use strict";

import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { setGlobalOptions } from "firebase-functions/v2";
import { logger } from "firebase-functions";

// Initialisation de Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Configuration GLOBALE des fonctions
setGlobalOptions({ 
  region: "us-central1",
  memory: "512MiB", 
  timeoutSeconds: 120
});

/**
 * Valide le captcha Turnstile de Cloudflare
 */
async function validateTurnstile(token: string, ip: string | undefined): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    
    if (!token || token.includes('DUMMY')) {
        logger.warn('TURNSTILE validation ignorée (token de test détecté).');
        return true; 
    }

    if (!secret || secret.includes('your_')) {
        logger.warn('TURNSTILE_SECRET_KEY non configurée.');
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
        logger.error('Turnstile connection error:', e);
        return false;
    }
}

const callOptions = {
    cors: true,
    maxInstances: 10
};

// --- FONCTIONS CLOUD ---

export const sendDigicode = onCall(callOptions, async (request) => {
  const { email, turnstileToken } = request.data;
  if (!email) throw new HttpsError("invalid-argument", "E-mail requis");
  
  const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
  if (!isValid) throw new HttpsError("permission-denied", "Validation anti-robot échouée");

  const brevoKey = process.env.BREVO_API_KEY;
  if (!brevoKey || brevoKey.includes('your_')) {
      throw new HttpsError("failed-precondition", "Service e-mail non configuré");
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
  
  if (!res.ok) throw new HttpsError("internal", "Échec de l'envoi de l'e-mail");
  return { success: true };
});

export const generateWod = onCall(callOptions, async (request) => {
    try {
        const { turnstileToken } = request.data;
        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid) throw new HttpsError("permission-denied", "Validation Turnstile échouée");

        const { generateWod: runFlow } = await import("./ai/generate-wod-flow");
        return await runFlow({});
    } catch (e: any) {
        logger.error("generateWod error:", e);
        throw new HttpsError("internal", e.message || "Erreur IA");
    }
});

export const analyzeWod = onCall(callOptions, async (request) => {
    try {
        const { photoDataUri, turnstileToken } = request.data;
        if (!photoDataUri) throw new HttpsError("invalid-argument", "Image requise");

        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid) throw new HttpsError("permission-denied", "Validation Turnstile échouée");

        const { analyzeWod: runFlow } = await import("./ai/analyze-wod-flow");
        return await runFlow({ photoDataUri });
    } catch (e: any) {
        logger.error("analyzeWod error:", e);
        throw new HttpsError("internal", e.message || "Erreur IA");
    }
});

export const verifyDigicode = onCall(callOptions, async (request) => {
    const { email, code } = request.data;
    if (!email || !code) throw new HttpsError("invalid-argument", "Données manquantes");

    const digiDoc = await db.collection("digicodes").doc(email.toLowerCase()).get();
    if (!digiDoc.exists) throw new HttpsError("not-found", "Code invalide");

    const data = digiDoc.data()!;
    if (data.code !== code || data.expires.toMillis() < Date.now()) {
      throw new HttpsError("unauthenticated", "Code expiré");
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
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth requise");
    
    const { yearly, turnstileToken } = request.data;
    const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
    if (!isValid) throw new HttpsError("permission-denied", "Validation Turnstile échouée");

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey.includes('your_')) {
        throw new HttpsError("failed-precondition", "Stripe non configuré");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-01-28.clover" });
    const priceId = yearly ? process.env.STRIPE_YEARLY_PRICE_ID : process.env.STRIPE_MONTHLY_PRICE_ID;

    if (!priceId) throw new HttpsError("internal", "Price ID Stripe manquant");

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
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth requise");
    
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const customerId = userDoc.data()?.stripeCustomerId;
    
    if (!customerId) throw new HttpsError("not-found", "Client Stripe introuvable");

    const stripe = new Stripe(stripeKey!, { apiVersion: "2026-01-28.clover" });
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
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-01-28.clover" });
    
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
