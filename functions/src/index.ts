/**
 * WODBurner – Email Functions (Firebase Functions v2)
 */
import "dotenv/config";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

admin.initializeApp();

const BREVO_API_KEY = process.env.BREVO_API_KEY;
if (!BREVO_API_KEY) {
  throw new Error("BREVO_API_KEY missing in .env");
}

// === 1. ENVOI DU LIEN + STOCKAGE IP/USER-AGENT ===
export const sendMagicLink = onCall(
  { region: "europe-west1", maxInstances: 10 },
  async (request) => {
    const email = request.data.email as string;
    if (!email) {
      throw new HttpsError("invalid-argument", "email required");
    }

    // Récupération IP + User-Agent (v2)
    const ipHeader = request.rawRequest?.headers["x-forwarded-for"] ||
                     request.rawRequest?.headers["x-appengine-user-ip"];
    const ip = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader || request.rawRequest?.ip || "unknown";
    const userAgent = request.rawRequest?.headers["user-agent"]?.[0] || "unknown";

    try {
      const actionCodeSettings = {
        url: "https://wodburner.app/verify",
        handleCodeInApp: true,
      };
      const link = await admin.auth().generateSignInWithEmailLink(email, actionCodeSettings);

      // Stockage dans Firestore
      await getFirestore()
        .collection("magicLinks")
        .doc(email)
        .set({
          ip,
          userAgent,
          createdAt: new Date(),
        });

      const res = await fetch("https://api.sendinblue.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: { name: "WODBurner Team", email: "noreply@wodburner.app" },
          to: [{ email }],
          templateId: 2,
          params: { LINK: link },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Brevo error: ${text}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error("sendMagicLink error:", error);
      throw new HttpsError("internal", error.message || "unknown error");
    }
  }
);

// === 2. VÉRIFICATION KRAKEN (IP + USER-AGENT + 15 MIN) ===
export const verifyMagicLinkAccess = onCall(
  { region: "europe-west1" },
  async (request) => {
    const email = request.data.email as string;
    if (!email) {
      throw new HttpsError("invalid-argument", "email required");
    }

    const ipHeader = request.rawRequest?.headers["x-forwarded-for"] ||
                     request.rawRequest?.headers["x-appengine-user-ip"];
    const ip = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader || request.rawRequest?.ip || "unknown";
    const userAgent = request.rawRequest?.headers["user-agent"]?.[0] || "unknown";

    const docRef = getFirestore().collection("magicLinks").doc(email);
    const doc = await docRef.get();

    if (!doc.exists) {
      return { allowed: false, reason: "no_attempt" };
    }

    const data = doc.data()!;
    const age = Date.now() - data.createdAt.toDate().getTime();

    if (age > 15 * 60 * 1000) {
      await docRef.delete();
      return { allowed: false, reason: "expired" };
    }

    if (data.ip !== ip || data.userAgent !== userAgent) {
      await docRef.delete();
      return { allowed: false, reason: "mismatch" };
    }

    await docRef.delete();
    return { allowed: true };
  }
);