
"use strict";

import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { setGlobalOptions } from "firebase-functions/v2";
import { logger } from "firebase-functions";

// Initialisation unique de Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Configuration GLOBALE des fonctions.
 * Note: onCall gère le CORS par défaut. Retrait de cors: true pour éviter les conflits.
 */
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
    
    // Bypass en mode test ou si non configuré
    if (!secret || secret.startsWith('your_') || secret === '1x0000000000000000000000000000000AA') {
        logger.warn('TURNSTILE_SECRET_KEY non configurée. Validation ignorée.');
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
        if (!outcome.success) {
          logger.error('Turnstile validation failed:', outcome['error-codes']);
        }
        return outcome.success;
    } catch (e) {
        logger.error('Turnstile connection error:', e);
        return false;
    }
}

// --- FONCTIONS CLOUD ---

exports.sendDigicode = onCall(async (request) => {
  const { email, turnstileToken } = request.data;
  if (!email) throw new HttpsError("invalid-argument", "L'adresse e-mail est requise.");
  
  const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
  if (!isValid) throw new HttpsError("permission-denied", "La validation anti-robot a échoué.");

  const brevoKey = process.env.BREVO_API_KEY;
  if (!brevoKey) throw new HttpsError("failed-precondition", "Service e-mail non configuré.");

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
  
  if (!res.ok) throw new HttpsError("internal", "Échec de l'envoi de l'e-mail.");
  return { success: true };
});

exports.generateWod = onCall(async (request) => {
    logger.info("DEBUG - generateWod called");
    try {
        const { turnstileToken } = request.data;
        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid) throw new HttpsError("permission-denied", "Captcha invalide.");

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) throw new HttpsError("failed-precondition", "Clé API Gemini manquante.");
        
        process.env.GOOGLE_GENAI_API_KEY = geminiKey;

        // Importation dynamique à l'intérieur pour isoler les crashs
        const { generateWod } = await import('./ai/generate-wod-flow');
        const result = await generateWod({});
        return { data: result };
    } catch (e: any) {
        logger.error("generateWod error:", e);
        throw new HttpsError("internal", e.message || "Erreur interne", { stack: e.stack });
    }
});

exports.analyzeWod = onCall(async (request) => {
    logger.info("DEBUG - analyzeWod called");
    try {
        const { photoDataUri, turnstileToken } = request.data;
        if (!photoDataUri) throw new HttpsError("invalid-argument", "Image manquante.");

        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid) throw new HttpsError("permission-denied", "Captcha invalide.");

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) throw new HttpsError("failed-precondition", "Clé API Gemini manquante.");
        
        process.env.GOOGLE_GENAI_API_KEY = geminiKey;

        const { analyzeWod } = await import("./ai/analyze-wod-flow");
        const result = await analyzeWod({ photoDataUri });
        return { data: result };
    } catch (e: any) {
        logger.error("analyzeWod error:", e);
        throw new HttpsError("internal", e.message || "Erreur interne", { stack: e.stack });
    }
});

exports.verifyDigicode = onCall(async (request) => {
    const { email, code } = request.data;
    if (!email || !code) throw new HttpsError("invalid-argument", "Données manquantes.");

    const digiDoc = await db.collection("digicodes").doc(email.toLowerCase()).get();
    if (!digiDoc.exists) throw new HttpsError("not-found", "Code invalide.");

    const data = digiDoc.data()!;
    if (data.code !== code || data.expires.toMillis() < Date.now()) {
      throw new HttpsError("unauthenticated", "Code expiré.");
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

exports.createCheckout = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Connexion requise.");
    const { yearly, turnstileToken } = request.data;
    
    const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
    if (!isValid) throw new HttpsError("permission-denied", "Captcha invalide.");

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new HttpsError("failed-precondition", "Stripe non configuré.");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" });
    const priceId = yearly ? process.env.STRIPE_YEARLY_PRICE_ID : process.env.STRIPE_MONTHLY_PRICE_ID;

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

exports.createCustomerPortal = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Connexion requise.");
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new HttpsError("failed-precondition", "Stripe non configuré.");
    
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const customerId = userDoc.data()?.stripeCustomerId;
    if (!customerId) throw new HttpsError("not-found", "ID client Stripe manquant.");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" });
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    });
    return { url: portalSession.url };
});

exports.stripeWebhook = onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const stripeKey = process.env.STRIPE_SECRET_KEY || "";
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" });
    
    try {
        const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
        if (event.type === "checkout.session.completed") {
            const obj = event.data.object as any;
            const uid = obj.metadata?.uid;
            if (uid) {
                await db.collection("users").doc(uid).set({ 
                    premium: true, 
                    stripeCustomerId: obj.customer 
                }, { merge: true });
            }
        }
        res.status(200).send({ received: true });
    } catch (err: any) {
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

exports.resetDailyLimits = onSchedule('0 0 * * *', async () => {
    const users = await db.collection('users').get();
    const batch = db.batch();
    users.forEach(d => batch.update(d.ref, { 
        dailyReactions: 0, 
        wodGenerationCount: 0, 
        dailyReset: admin.firestore.Timestamp.now() 
    }));
    await batch.commit();
});

exports.resetMonthlyLimits = onSchedule('0 0 1 * *', async () => {
    const users = await db.collection('users').get();
    const batch = db.batch();
    users.forEach(d => batch.update(d.ref, { 
        ocrCount: 0, 
        ocrReset: admin.firestore.Timestamp.now() 
    }));
    await batch.commit();
});
