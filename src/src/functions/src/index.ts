
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
 * Configuration GLOBALE des fonctions
 * cors: true est CRITIQUE ici pour accepter les requêtes provenant des Cloud Workstations
 */
setGlobalOptions({ 
  region: "us-central1",
  memory: "512MiB", 
  timeoutSeconds: 120,
  cors: true 
});

// Récupération sécurisée des secrets
const getSecret = (key: string) => process.env[key] || '';

async function validateTurnstile(token: string, ip: string | undefined): Promise<boolean> {
    const secret = getSecret('TURNSTILE_SECRET_KEY');
    if (!secret || secret.includes('your_')) {
        logger.warn('TURNSTILE_SECRET_KEY non configurée. Validation ignorée en dev.');
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
          logger.error('Turnstile FAILED:', outcome['error-codes']);
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
  if (!email) throw new HttpsError("invalid-argument", "Email manquant.");
  
  const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
  if (!isValid) throw new HttpsError("permission-denied", "Captcha invalide.");

  const brevoKey = getSecret('BREVO_API_KEY');
  if (!brevoKey) throw new HttpsError("internal", "BREVO_API_KEY non configurée sur le serveur.");

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
  
  if (!res.ok) throw new Error(`Brevo error: ${await res.text()}`);
  return { success: true };
});

exports.generateWod = onCall(async (request) => {
    try {
        const { turnstileToken } = request.data;
        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid) throw new HttpsError("permission-denied", "Captcha invalide.");

        const geminiKey = getSecret('GEMINI_API_KEY');
        if (!geminiKey) throw new HttpsError("failed-precondition", "GEMINI_API_KEY manquante.");
        
        // On injecte la clé dans l'environnement avant l'import Genkit
        process.env.GOOGLE_GENAI_API_KEY = geminiKey;

        // Importation dynamique pour éviter les crashs au boot
        const { generateWod } = await import('./ai/generate-wod-flow');
        const result = await generateWod({});
        return { data: result };
    } catch (e: any) {
        logger.error("generateWod execution error:", e);
        return { 
            error: e.message || "Erreur inconnue", 
            details: e.stack || "Pas de stack trace" 
        };
    }
});

exports.analyzeWod = onCall(async (request) => {
    try {
        const { photoDataUri, turnstileToken } = request.data;
        if (!photoDataUri) throw new HttpsError("invalid-argument", "Données photo manquantes.");

        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid) throw new HttpsError("permission-denied", "Captcha invalide.");

        const geminiKey = getSecret('GEMINI_API_KEY');
        if (!geminiKey) throw new HttpsError("failed-precondition", "GEMINI_API_KEY manquante.");
        
        process.env.GOOGLE_GENAI_API_KEY = geminiKey;

        const { analyzeWod } = await import("./ai/analyze-wod-flow");
        const result = await analyzeWod({ photoDataUri });
        return { data: result };
    } catch (e: any) {
        logger.error("analyzeWod execution error:", e);
        return { 
            error: e.message || "Erreur inconnue", 
            details: e.stack || "Pas de stack trace" 
        };
    }
});

exports.verifyDigicode = onCall(async (request) => {
    const { email, code } = request.data;
    if (!email || !code) throw new HttpsError("invalid-argument", "Email ou code manquant.");

    const digiDoc = await db.collection("digicodes").doc(email.toLowerCase()).get();
    if (!digiDoc.exists) throw new HttpsError("not-found", "Code invalide ou expiré.");

    const data = digiDoc.data()!;
    if (data.code !== code || data.expires.toMillis() < Date.now()) {
      throw new HttpsError("unauthenticated", "Code expiré ou incorrect.");
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
});

exports.createCheckout = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth requise.");
    const { yearly, turnstileToken } = request.data;
    
    const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
    if (!isValid) throw new HttpsError("permission-denied", "Captcha échoué.");

    const stripeKey = getSecret('STRIPE_SECRET_KEY');
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" });
    
    const priceId = yearly ? getSecret('STRIPE_YEARLY_PRICE_ID') : getSecret('STRIPE_MONTHLY_PRICE_ID');

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${getSecret('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'}/premium?success=true`,
        cancel_url: `${getSecret('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'}/premium?cancel=true`,
        metadata: { uid: request.auth.uid },
    });
    return { url: session.url };
});

exports.stripeWebhook = onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const stripeKey = getSecret('STRIPE_SECRET_KEY');
    const webhookSecret = getSecret('STRIPE_WEBHOOK_SECRET');
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" });
    
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
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
