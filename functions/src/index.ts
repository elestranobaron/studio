/**
 * WODBurner – Email Functions (KRAKEN + ZERO INTERNAL ERROR)
 */
import "dotenv/config";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

admin.initializeApp();

const BREVO_API_KEY = process.env.BREVO_API_KEY;
if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY missing in .env");

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
      await getFirestore().collection("magicLinks").doc(email).set({
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

    const doc = await getFirestore().collection("magicLinks").doc(email).get();
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