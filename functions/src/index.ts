/**
 * WODBurner – Email Functions
 */
import "dotenv/config";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin"; // ← AJOUTE ÇA
import fetch from "node-fetch";

admin.initializeApp(); // ← INITIALISE ADMIN SDK

const BREVO_API_KEY = process.env.BREVO_API_KEY;

if (!BREVO_API_KEY) {
  throw new Error("BREVO_API_KEY missing in .env");
}
/*
export const sendMagicLink = functions.https.onCall(async (data) => {
  const { email } = data.data;
  if (!email) {
    throw new functions.https.HttpsError("invalid-argument", "email required");
  }

  try {
    // GÉNÈRE LE LIEN MAGIQUE AVEC TOKEN
    const actionCodeSettings = {
      url: "https://wodburner.app/verify",
      handleCodeInApp: true,
    };
    const link = await admin.auth().generateSignInWithEmailLink(email, actionCodeSettings);

    // ENVOIE VIA BREVO
    const res = await fetch("https://api.sendinblue.com/v3/smtp/email", {
      method: "POST",
      headers: {"api-key": BREVO_API_KEY, "Content-Type": "application/json"},
      body: JSON.stringify({
        sender: {name: "WODBurner Team", email: "noreply@wodburner.app"},
        to: [{email}],
        templateId: 2,
        params: {LINK: link}
      })
    });

    if (!res.ok) throw new functions.https.HttpsError("internal", await res.text());
    return {success: true};
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new functions.https.HttpsError("internal", error.message);
    } else {
      throw new functions.https.HttpsError("internal", "An unknown error occurred");
    }
  }
});

export const verifyMagicLinkAccess = functions.https.onCall(async (data, context) => {
  const { email } = data;
  if (!email) {
    throw new functions.https.HttpsError("invalid-argument", "email required");
  }

  const ip = context.rawRequest?.ip || context.rawRequest?.headers['x-forwarded-for']?.[0] || 'unknown';
  const userAgent = context.rawRequest?.headers['user-agent'] || 'unknown';

  const doc = await admin.firestore().collection('magicLinks').doc(email).get();

  if (!doc.exists) {
    return { allowed: false, reason: "no_attempt" };
  }

  const attempt = doc.data()!;
  const timeDiff = Date.now() - attempt.createdAt.toMillis();
  if (timeDiff > 15 * 60 * 1000) { // 15 min
    await doc.ref.delete();
    return { allowed: false, reason: "expired" };
  }

  if (attempt.ip !== ip || attempt.userAgent !== userAgent) {
    return { allowed: false, reason: "mismatch" };
  }

  await doc.ref.delete();
  return { allowed: true };
});*/