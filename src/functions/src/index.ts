"use strict";

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID;
const STRIPE_YEARLY_PRICE_ID = process.env.STRIPE_YEARLY_PRICE_ID;
const BREVO_API_KEY = process.env.BREVO_API_KEY || "dummy-for-deploy";

exports.sendMagicLink = onRequest({ cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const email = req.body.data.email;
    if (!email || typeof email !== "string") {
        res.status(400).json({ error: { status: 'INVALID_ARGUMENT', message: 'email required' } });
        return;
    }

    const headers = req.headers || {};
    const ip = headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown";
    const userAgent = headers["user-agent"] || "unknown";

    try {
               // === ACTIONCODESETTINGS MAGIQUE POUR PWA (bye bye page Firebase de merde) ===
               const actionCodeSettings = {
                url: "https://wodburner.app/verify",
                handleCodeInApp: true,
                // Dynamic Link obligatoire pour que Gmail ouvre direct ton PWA
                dynamicLinkInfo: {
                  domainUriPrefix: "https://wodburner.page.link",   // ← tu crées ce domaine dans Firebase Console > Dynamic Links (2 clics)
                  link: "https://wodburner.app/verify",
                  android: { packageName: "com.wodburner.app" },   // valeur bidon, ignorée pour PWA
                  ios: { bundleId: "com.wodburner.app" },          // valeur bidon, ignorée pour PWA
                },
              };
      
              // On passe l’email dans l’URL pour que ça marche même dans Chrome Custom Tab
              const continueUrl = `https://wodburner.app/verify?email=${encodeURIComponent(email)}`;

              const link = await admin.auth().generateSignInWithEmailLink(email, {
                url: continueUrl,
                handleCodeInApp: true,
              });

        await db.collection("magicLinks").doc(email).set({ ip, userAgent, createdAt: new Date() });

        const brevoRes = await fetch("https://api.sendinblue.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                sender: { name: "WODBurner Team", email: "noreply@wodburner.app" },
                to: [{ email }],
                templateId: 2,
                params: { LINK: link },
            }),
        });

        if (!brevoRes.ok) throw new Error(`Brevo failed: ${await brevoRes.text()}`);

        res.json({ data: { success: true } });
    } catch (error) {
        console.error("sendMagicLink error:", error);
        res.status(500).json({ error: { status: 'INTERNAL', message: 'Failed to send link' } });
    }
});


exports.onUserSignIn = onCall(async (request) => {
  if (!request.auth?.uid) return;
  const userRef = db.collection("users").doc(request.auth.uid);
  const doc = await userRef.get();
  if (!doc.exists) {
    await userRef.set({
      premium: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      email: request.auth.token.email || null,
    });
  }
  return { success: true };
});

exports.verifyMagicLinkAccess = onCall(async (request) => {
  const email = request.data.email;
  if (!email) throw new HttpsError("invalid-argument", "email required");

  const headers = request.rawRequest?.headers || {};
  const ip = headers["x-forwarded-for"]?.split(",")[0]?.trim() || request.rawRequest?.ip || "unknown";
  const userAgent = headers["user-agent"] || "unknown";

  const doc = await db.collection("magicLinks").doc(email).get();
  if (!doc.exists) return { allowed: false, reason: "no_attempt" };

  const data = doc.data();
  const age = Date.now() - data.createdAt.toDate().getTime();
  if (age > 15 * 60 * 1000) {
    await doc.ref.delete();
    return { allowed: false, reason: "expired" };
  }
  if (data.ip !== ip || data.userAgent !== userAgent) {
    await doc.ref.delete();
    return { allowed: false, reason: "mismatch" };
  }

  await doc.ref.delete();
  return { allowed: true };
});

exports.resetOCR = onSchedule("0 0 1 * *", async () => {
  const snapshot = await db.collection("users").get();
  const batch = db.batch();
  snapshot.forEach(doc => batch.update(doc.ref, { ocrCount: 0 }));
  await batch.commit();
  console.log(`OCR reset for ${snapshot.size} users`);
});

exports.resetReactions = onSchedule("0 0 * * *", async () => {
  const snapshot = await db.collection("users").get();
  const batch = db.batch();
  snapshot.forEach(doc => batch.update(doc.ref, { dailyReactions: 0 }));
  await batch.commit();
  console.log(`Reactions reset for ${snapshot.size} users`);
});

exports.createCheckout = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Login required");

  const yearly = request.data.yearly === true;
  const priceId = yearly ? STRIPE_YEARLY_PRICE_ID : STRIPE_MONTHLY_PRICE_ID;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    allow_promotion_codes: true,
    success_url: "https://wodburner.app/premium?success=true",
    cancel_url: "https://wodburner.app/premium?cancel=true",
    customer_email: request.auth.token.email || undefined,
    metadata: { uid: request.auth.uid },
    subscription_data: {
      metadata: { uid: request.auth.uid },
    },
  });

  return { id: session.id };
});

import express from "express";
import type { Request, Response } from "express";

// On étend le type Request d'Express globalement
interface StripeRequest extends Request {
  rawBody: string;
}

const app = express();

// Middleware qui sauve le raw body avant que express.json() ne le parse
app.use(
  express.json({
    verify: (req: any, _res: any, buf: Buffer) => {
      (req as StripeRequest).rawBody = buf.toString();
    },
  })
);

// Route webhook
app.post("/", async (req: Request, res: Response) => {
  const typedReq = req as StripeRequest;
  const sig = req.headers["stripe-signature"] as string;

  if (!typedReq.rawBody) {
    console.error("rawBody manquant");
    return res.status(400).send("No raw body");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      typedReq.rawBody,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // === Ton code premium (tout le reste inchangé) ===
  if (
    ["checkout.session.completed", "customer.subscription.created", "invoice.paid"].includes(
      event.type
    )
  ) {
    const obj = event.data.object as any;

    let uid = obj.metadata?.uid;

    if (!uid && (obj.customer_details?.email || obj.customer_email)) {
      const email = (obj.customer_details?.email || obj.customer_email || "")
        .toLowerCase()
        .trim();
      if (email) {
        const snap = await db.collection("users").where("email", "==", email).limit(1).get();
        if (!snap.empty) uid = snap.docs[0].id;
      }
    }

    if (uid) {
      await db.collection("users").doc(uid).set(
        {
          premium: true,
          premiumSince: admin.firestore.FieldValue.serverTimestamp(),
          priceId:
            obj.items?.data?.[0]?.price?.id ||
            obj.plan?.id ||
            obj.subscription?.default_price ||
            "unknown",
        },
        { merge: true }
      );
      console.log(`PREMIUM ACTIVÉ pour ${uid} – ${event.type}`);
    }
  }

  res.status(200).send("ok");
});

// Export final
exports.stripeWebhook = onRequest({ region: "europe-west1" }, app);