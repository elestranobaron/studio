
"use strict";

import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import type { QuerySnapshot, DocumentSnapshot } from "firebase-admin/firestore";

admin.initializeApp();
const db = admin.firestore();

if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Stripe secret key is not set. Exiting.");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID!;
const STRIPE_YEARLY_PRICE_ID = process.env.STRIPE_YEARLY_PRICE_ID!;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';


// --- DIGICODE AUTHENTICATION ---
function generateDigicode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.sendDigicode = onCall({}, async (request: any) => {
  const email = request.data.email;
  if (!email || typeof email !== "string") {
    throw new HttpsError("invalid-argument", "A valid email address is required.");
  }

  if (!process.env.BREVO_API_KEY) {
    console.error("Brevo API key is not configured.");
    throw new HttpsError("internal", "The mail service is not configured.");
  }

  const code = generateDigicode();
  const expires = admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);

  await db.collection("digicodes").doc(email).set({
    code,
    expires,
  });

  try {
    const brevoRes = await fetch("https://api.sendinblue.com/v3/smtp/email", {
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
      const errorText = await brevoRes.text();
      console.error("Brevo API error:", errorText);
      throw new HttpsError("internal", "Failed to send the authentication code.");
    }

    return { success: true };
  } catch (error) {
    console.error("sendDigicode error:", error);
    throw new HttpsError("internal", "An unexpected error occurred.");
  }
});

exports.verifyDigicode = onCall({}, async (request: any) => {
  console.log("verifyDigicode appelée – payload reçu :", JSON.stringify(request.data));

  try {
    const { email, code } = request.data;

    if (!email || !code) {
      console.log("Missing email or code");
      throw new HttpsError("invalid-argument", "Email and code are required.");
    }

    console.log("Recherche du digicode dans Firestore pour", email);
    const codeRef = db.collection("digicodes").doc(email.toLowerCase());
    const codeDoc = await codeRef.get();

    if (!codeDoc.exists) {
      console.log("Aucun document trouvé dans digicodes pour cet email");
      throw new HttpsError("not-found", "Invalid code. Please request a new one.");
    }

    const data = codeDoc.data()!;
    const { code: storedCode, expires } = data;

    if (expires.toMillis() < Date.now()) {
      console.log("Code expiré");
      await codeRef.delete();
      throw new HttpsError("deadline-exceeded", "The code has expired.");
    }

    if (storedCode !== code) {
      console.log(`Code incorrect – reçu: ${code} | stocké: ${storedCode}`);
      throw new HttpsError("unauthenticated", "Invalid code.");
    }

    await codeRef.delete();
    console.log("Code valide – on passe à la création/utilisation user");

    // === LA PARTIE QUI PLANTE EST ICI ===
    let uid: string;
    try {
      const user = await admin.auth().getUserByEmail(email.toLowerCase());
      uid = user.uid;
      console.log("Utilisateur existant trouvé :", uid);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        console.log("Utilisateur n'existe pas → création");
        const newUser = await admin.auth().createUser({ email });
        uid = newUser.uid;
        console.log("Nouvel utilisateur créé :", uid);
      } else {
        console.error("Erreur getUserByEmail inattendue :", err);
        throw err;
      }
    }

    console.log("Création du custom token pour uid", uid);
    const customToken = await admin.auth().createCustomToken(uid);
    console.log("Custom token généré avec succès");

    return { token: customToken };

  } catch (error: any) {
    console.error("ERREUR FATALE dans verifyDigicode :", error);
    console.error("Stack :", error.stack);
    throw new HttpsError("internal", "Could not complete the sign-in process.");
  }
});


// --- USER AND STRIPE FUNCTIONS (Unchanged but kept for context) ---

exports.onUserSignIn = onCall({}, async (request: any) => {
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

exports.resetOCR = onSchedule("0 0 1 * *", async () => {
  const snapshot: QuerySnapshot = await db.collection("users").get();
  const batch = db.batch();

  snapshot.docs.forEach((doc: DocumentSnapshot) => {
    batch.update(doc.ref, { ocrCount: 0 });
  });

  await batch.commit();
  console.log(`OCR reset for ${snapshot.size} users`);
});

exports.resetReactions = onSchedule("0 0 * * *", async () => {
  const snapshot: QuerySnapshot = await db.collection("users").get();
  const batch = db.batch();

  snapshot.docs.forEach((doc: DocumentSnapshot) => {
    batch.update(doc.ref, { dailyReactions: 0 });
  });

  await batch.commit();
  console.log(`Reactions reset for ${snapshot.size} users`);
});

exports.createCheckout = onCall({
    // secrets: ["STRIPE_SECRET_KEY", "STRIPE_MONTHLY_PRICE_ID", "STRIPE_YEARLY_PRICE_ID"],
}, async (request: any) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Login required");
  
  if (!STRIPE_MONTHLY_PRICE_ID || !STRIPE_YEARLY_PRICE_ID) {
    throw new HttpsError("internal", "Stripe price IDs are not configured.");
  }

  const yearly = request.data.yearly === true;
  const priceId = yearly ? STRIPE_YEARLY_PRICE_ID : STRIPE_MONTHLY_PRICE_ID;
  const uid = request.auth.uid;
  const email = request.auth.token.email;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    allow_promotion_codes: true,
    success_url: `${NEXT_PUBLIC_APP_URL}/premium?success=true`,
    cancel_url: `${NEXT_PUBLIC_APP_URL}/premium?cancel=true`,
    customer_email: email || undefined,
    metadata: { uid },
    subscription_data: {
      metadata: { uid },
    },
  });

  return { url: session.url };
});


import express from "express";
import type { Request, Response } from "express";

interface StripeRequest extends Request {
  rawBody: string;
}

const app = express();

app.use(
  express.json({
    verify: (req: any, _res: any, buf: Buffer) => {
      (req as StripeRequest).rawBody = buf.toString();
    },
  })
);

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

  if (
    ["checkout.session.completed", "customer.subscription.created", "invoice.paid"].includes(
      event.type
    )
  ) {
    const obj = event.data.object as any;

    let uid = obj.metadata?.uid;
    const email = (obj.customer_details?.email || obj.customer_email || "").toLowerCase().trim();

    if (!uid && email) {
      const snap = await db.collection("users").where("email", "==", email).limit(1).get();
      if (!snap.empty) uid = snap.docs[0].id;
    }

    if (uid) {
        const userRef = db.collection("users").doc(uid);
        const priceId = obj.items?.data?.[0]?.price?.id || obj.plan?.id || obj.subscription?.default_price || "unknown";

        await db.runTransaction(async (transaction: any) => {
          const userSnap = await transaction.get(userRef);
          const userData = userSnap.data();
        
          transaction.set(userRef, {
            premium: true,
            premiumSince: admin.firestore.FieldValue.serverTimestamp(),
            priceId: priceId,
          }, { merge: true });
        
          if (priceId === STRIPE_YEARLY_PRICE_ID && !userData?.isOg) {
            const hallOfFameRef = db.collection("hallOfFame");
            const ogQuery = await hallOfFameRef.get();
            const ogCount = ogQuery.size;
        
            if (ogCount < 300) {
              const rank = ogCount + 1;
              const authUser = await admin.auth().getUser(uid);
              const displayName = authUser.email?.split('@')[0] || `user${rank}`;
        
              const ogDocRef = hallOfFameRef.doc(uid);
              transaction.set(ogDocRef, {
                uid,
                displayName,
                rank,
                joinedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              transaction.update(userRef, { isOg: true });
            }
          }
        });

        console.log(`PREMIUM ACTIVÉ pour ${uid} – ${event.type}`);
    }
  }

  res.status(200).send("ok");
});

exports.stripeWebhook = onRequest({ region: "europe-west1" }, app);

exports.createCustomerPortal = onCall({}, async (request: any) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in.');
    }
    const uid = request.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    const customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId) {
        throw new HttpsError('not-found', 'Stripe customer ID not found.');
    }
    
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${NEXT_PUBLIC_APP_URL}/settings`,
    });

    return { url: portalSession.url };
});
