/**
 * WODBurner – VERSION FINALE QUI MARCHE À 100 %
 * Premium + Stripe + Brevo + Reset quotas + Secret Manager
 */
import "dotenv/config";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import Stripe from "stripe";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";

admin.initializeApp();
const db = getFirestore();

// ————— BREVO (marche avec .env) —————
const BREVO_API_KEY = process.env.BREVO_API_KEY;
if (!BREVO_API_KEY) {
  console.error("BREVO_API_KEY manquant dans .env");
  throw new Error("BREVO_API_KEY missing in .env");
}

// ————— STRIPE (Secret Manager ONLY) —————
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID;
const STRIPE_YEARLY_PRICE_ID = process.env.STRIPE_YEARLY_PRICE_ID;


// ————— MAGIC LINK —————
export const sendMagicLink = onCall(async (request) => {
  console.log("sendMagicLink called with data:", request.data);

  const email = request.data.email;
  if (!email || typeof email !== "string") {
    console.error("Missing or invalid email:", email);
    throw new HttpsError("invalid-argument", "email required");
  }

  // IP + User-Agent
  const headers = request.rawRequest?.headers || {};
  const forwarded = headers["x-forwarded-for"];
  const ip =
    forwarded && typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : request.rawRequest?.ip || "unknown";
  const userAgent = headers["user-agent"] || "unknown";

  try {
    const firebaseLink = await admin.auth().generateSignInWithEmailLink(email, {
      url: "https://wodburner.app/verify",
      handleCodeInApp: true,
    });
    
    // Create the intermediate redirect link that forces opening in the main browser
    const baseLink = `https://wodburner.app/auth/redirect?continueUrl=${encodeURIComponent(firebaseLink)}`;
    const redirectLink = `${baseLink}&utm_source=brevo&utm_campaign=WODBurner Magic Link EN&utm_medium=email&utm_id=2`;

    // Stockage Kraken
    await db.collection("magicLinks").doc(email).set({
      ip,
      userAgent,
      createdAt: new Date(),
    });

    // Envoi Brevo
    const payload = {
      sender: { name: "WODBurner Team", email: "noreply@wodburner.app" },
      to: [{ email }],
      templateId: 2,
      params: { LINK: redirectLink }, // Use the new redirect link
    };

    const res = await fetch("https://api.sendinblue.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    if (!res.ok) {
      throw new Error(`Brevo failed: ${res.status} ${responseText}`);
    }

    console.log("Magic link sent successfully to:", email);
    return { success: true };
  } catch (error: any) {
    console.error("sendMagicLink FAILED:", error);
    throw new HttpsError("internal", "Failed to send link");
  }
});

export const onUserSignIn = onCall(async (request) => {
  if (!request.auth?.uid) return;

  const userRef = db.collection("users").doc(request.auth.uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    await userRef.set({
      premium: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      email: request.auth.token.email,
    });
  }
  return { success: true };
});

// ————— VÉRIFICATION MAGIC LINK —————
export const verifyMagicLinkAccess = onCall(async (request) => {
  const email = request.data.email;
  if (!email) throw new HttpsError("invalid-argument", "email required");

  const headers = request.rawRequest?.headers || {};
  const forwarded = headers["x-forwarded-for"];
  const ip =
    forwarded && typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : request.rawRequest?.ip || "unknown";
  const userAgent = headers["user-agent"] || "unknown";

  const doc = await db.collection("magicLinks").doc(email).get();
  if (!doc.exists) return { allowed: false, reason: "no_attempt" };

  const data = doc.data()!;
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

// ————— RESET QUOTAS —————
export const resetOCR = onSchedule("0 0 1 * *", async () => {
  const users = await db.collection("users").get();
  const batch = db.batch();
  users.forEach((doc) => batch.update(doc.ref, { ocrCount: 0 }));
  await batch.commit();
  console.log(`Reset OCR count for ${users.size} users.`);
});

export const resetReactions = onSchedule("0 0 * * *", async () => {
  const users = await db.collection("users").get();
  const batch = db.batch();
  users.forEach((doc) => batch.update(doc.ref, { dailyReactions: 0 }));
  await batch.commit();
  console.log(`Reset daily reactions for ${users.size} users.`);
});

// ————— STRIPE CHECKOUT (PREMIUM) —————
export const createCheckout = onCall(
  {
    secrets: [stripeSecretKey],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Connecte-toi pour t'abonner.");
    }
    
    if (!STRIPE_MONTHLY_PRICE_ID || !STRIPE_YEARLY_PRICE_ID) {
      throw new HttpsError("failed-precondition", "Stripe price IDs are not configured.");
    }

    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: "2024-06-20",
    });

    const yearly = request.data.yearly === true;
    const priceId = yearly
      ? STRIPE_YEARLY_PRICE_ID
      : STRIPE_MONTHLY_PRICE_ID;

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: "https://wodburner.app/premium?success=true",
        cancel_url: "https://wodburner.app/premium?cancel=true",
        customer_email: request.auth.token.email || undefined,
        metadata: { uid: request.auth.uid },
      });

      // MISE À JOUR PREMIUM DANS FIRESTORE
      await db.collection('users').doc(request.auth.uid).set({
        premium: true,
        premiumUntil: null,
        priceId: priceId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return { id: session.id };
    } catch (error: any) {
      console.error("Stripe session creation failed:", error);
      throw new HttpsError("internal", "Impossible de créer la session Stripe.");
    }
  }
);


// ————— STRIPE WEBHOOK —————
export const stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (request, response) => {
    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: '2024-06-20',
    });

    let event: Stripe.Event;

    try {
      const sig = request.headers['stripe-signature'] as string;
      event = stripe.webhooks.constructEvent(request.rawBody, sig, stripeWebhookSecret.value());
    } catch (err: any) {
      console.error(`Webhook signature verification failed.`, err.message);
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const uid = session?.metadata?.uid;
      if (!uid) {
        console.error("Webhook Error: No UID in session metadata.");
        response.status(400).send("No UID in session metadata.");
        return;
      }
      
      const priceId = session.line_items?.data[0]?.price?.id;

      try {
        await db.collection('users').doc(uid).set({
          premium: true,
          premiumSince: admin.firestore.FieldValue.serverTimestamp(),
          priceId: priceId,
        }, { merge: true });
        console.log(`Successfully granted premium access to user ${uid}`);
      } catch (dbError) {
        console.error(`Firestore update failed for user ${uid}:`, dbError);
        response.status(500).send("Database update failed.");
        return;
      }
    }
    
    // Return a 200 response to acknowledge receipt of the event
    response.status(200).send();
  }
);

    