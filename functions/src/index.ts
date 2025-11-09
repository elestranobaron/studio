/**
 * WODBurner – Email Functions (KRAKEN + ZERO INTERNAL ERROR)
 */
import "dotenv/config";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import Stripe from "stripe";

admin.initializeApp();
const db = getFirestore();

const BREVO_API_KEY = process.env.BREVO_API_KEY;
if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY missing in .env");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY missing in .env");
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

export const sendMagicLink = onCall(
  async (request) => {
    console.log("sendMagicLink called with data:", request.data);

    const email = request.data.email;
    if (!email || typeof email !== "string") {
      console.error("Missing or invalid email:", email);
      throw new HttpsError("invalid-argument", "email required");
    }

    // IP + User-Agent (version ultra-robuste)
    const headers = request.rawRequest?.headers || {};
    const forwarded = headers["x-forwarded-for"];
    const ip = forwarded
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0]).trim()
      : request.rawRequest?.ip || "unknown";

    const userAgent = headers["user-agent"] || "unknown";

    console.log("Detected IP:", ip, "User-Agent:", userAgent);

    try {
      const link = await admin.auth().generateSignInWithEmailLink(email, {
        url: "https://wodburner.app/verify",
        handleCodeInApp: true,
      });

      console.log("Firebase link generated:", link.substring(0, 100) + "...");

      // Stockage Kraken
      await db.collection("magicLinks").doc(email).set({
        ip,
        userAgent,
        createdAt: new Date(),
      });

      console.log("Kraken data saved for:", email);

      // Envoi Brevo
      const payload = {
        sender: { name: "WODBurner Team", email: "noreply@wodburner.app" },
        to: [{ email }],
        templateId: 2,
        params: { LINK: link },
      };

      console.log("Sending to Brevo:", JSON.stringify(payload).substring(0, 200));

      const res = await fetch("https://api.sendinblue.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      console.log("Brevo response status:", res.status, "body:", responseText.substring(0, 500));

      if (!res.ok) {
        throw new Error(`Brevo failed: ${res.status} ${responseText}`);
      }

      console.log("Magic link sent successfully to:", email);
      return { success: true };
    } catch (error: any) {
      console.error("sendMagicLink FAILED:", error);
      throw new HttpsError("internal", "Failed to send link");
    }
  }
);

export const verifyMagicLinkAccess = onCall(
  async (request) => {
    const email = request.data.email;
    if (!email) throw new HttpsError("invalid-argument", "email required");

    const headers = request.rawRequest?.headers || {};
    const forwarded = headers["x-forwarded-for"];
    const ip = forwarded
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0]).trim()
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
  }
);

// Reset OCR count to 0 for all users on the 1st of every month.
export const resetOCR = onSchedule("0 0 1 * *", async () => {
    const users = await db.collection("users").get();
    const batch = db.batch();
    users.forEach(doc => {
        batch.update(doc.ref, { ocrCount: 0, ocrReset: new Date() });
    });
    await batch.commit();
    console.log(`Reset OCR count for ${users.size} users.`);
});

// Reset daily reaction count to 0 for all users every day at midnight.
export const resetReactions = onSchedule("0 0 * * *", async () => {
    const users = await db.collection("users").get();
    const batch = db.batch();
    users.forEach(doc => {
        batch.update(doc.ref, { dailyReactions: 0, dailyReset: new Date() });
    });
    await batch.commit();
    console.log(`Reset daily reactions for ${users.size} users.`);
});

// Create a Stripe checkout session for a user.
export const createCheckout = onCall({
    secrets: ["STRIPE_SECRET_KEY"],
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to subscribe.");
    }
    const { priceId, userId } = request.data;
    if (!priceId || !userId) {
        throw new HttpsError("invalid-argument", "priceId and userId are required.");
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: "subscription",
            success_url: "https://wodburner.app/dashboard?upgraded=true",
            cancel_url: "https://wodburner.app/premium",
            metadata: {
                userId: userId,
            },
        });
        return { id: session.id };
    } catch (error: any) {
        console.error("Stripe session creation failed:", error);
        throw new HttpsError("internal", "Could not create Stripe checkout session.");
    }
});
