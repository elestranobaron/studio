/**
 * WODBurner – Email Functions
 */

import "dotenv/config"; // ← CHARGE .env AVANT TOUT
import * as functions from "firebase-functions";
import fetch from "node-fetch";

const BREVO_API_KEY = process.env.BREVO_API_KEY;

if (!BREVO_API_KEY) {
  throw new Error("BREVO_API_KEY missing in .env");
}

export const sendMagicLink = functions.https.onCall(async (data) => {
  const { email, link } = data.data;
  if (!email || !link) {
    throw new functions.https.HttpsError("invalid-argument", "email and link required");
  }

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
});