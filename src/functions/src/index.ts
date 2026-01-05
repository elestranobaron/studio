
"use strict";

import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import type { QuerySnapshot, DocumentSnapshot } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { generateWod } from './ai/generate-wod-flow';
import { analyzeWod } from "./ai/analyze-wod-flow";
import * as cors from "cors";

const corsMiddleware = cors({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// Global config for all functions
setGlobalOptions({ 
  region: "us-central1"
});

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID!;
const STRIPE_YEARLY_PRICE_ID = process.env.STRIPE_YEARLY_PRICE_ID!;
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY!;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function validateTurnstile(token: string, ip: string | undefined): Promise<boolean> {
    if (!TURNSTILE_SECRET_KEY) {
        console.error('TURNSTILE_SECRET_KEY is not set. Skipping validation.');
        return process.env.NODE_ENV !== 'production';
    }

    const formData = new FormData();
    formData.append('secret', TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    if (ip) {
        formData.append('remoteip', ip);
    }
    
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
    });
    
    const outcome = await response.json() as { success: boolean; 'error-codes'?: string[] };
    if (!outcome.success) {
      console.warn('Turnstile validation failed:', outcome['error-codes']);
    }
    return outcome.success;
}

function generateDigicode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.sendDigicode = onCall({ cors: true }, async (request) => {
  const { email, turnstileToken } = request.data;
  if (!email || typeof email !== "string") {
    throw new HttpsError("invalid-argument", "A valid email address is required.");
  }
  
  if (!turnstileToken) {
    throw new HttpsError("invalid-argument", "Captcha token is missing.");
  }
  
  const isTurnstileValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
  if (!isTurnstileValid) {
      throw new HttpsError("permission-denied", "Captcha validation failed.");
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
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
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

exports.generateWod = onRequest(async (request, response) => {
  corsMiddleware(request, response, async () => {
    if (request.method !== 'POST') {
      response.status(405).send('Method Not Allowed');
      return;
    }
    const { data } = request.body;
    const { turnstileToken } = data;

    if (!turnstileToken) {
      response.status(400).json({ error: "Captcha token is missing." });
      return;
    }

    const isTurnstileValid = await validateTurnstile(turnstileToken, request.ip);
    if (!isTurnstileValid) {
      response.status(403).json({ error: "Captcha validation failed." });
      return;
    }

    try {
      const result = await generateWod({});
      response.status(200).json({ data: result });
    } catch (e: any) {
      console.error("WOD Generation Flow Error:", e);
      response.status(500).json({ 
        error: "Failed to generate WOD.",
        details: e.message,
        stack: e.stack 
      });
    }
  });
});

exports.analyzeWod = onRequest(async (request, response) => {
  corsMiddleware(request, response, async () => {
    if (request.method !== 'POST') {
      response.status(405).send('Method Not Allowed');
      return;
    }
    const { data } = request.body;
    const { photoDataUri, turnstileToken } = data;

    if (!photoDataUri) {
      response.status(400).json({ error: "The function must be called with a 'photoDataUri' argument." });
      return;
    }
    if (!turnstileToken) {
      response.status(400).json({ error: "Captcha token is missing." });
      return;
    }

    const isTurnstileValid = await validateTurnstile(turnstileToken, request.ip);
    if (!isTurnstileValid) {
      response.status(403).json({ error: "Captcha validation failed." });
      return;
    }

    try {
      const result = await analyzeWod({ photoDataUri });
      response.status(200).json({ data: result });
    } catch (e: any) {
      console.error("WOD Analysis Flow Error:", e);
      response.status(500).json({
        error: "Failed to analyze WOD.",
        details: e.message,
        stack: e.stack
      });
    }
  });
});

exports.verifyDigicode = onCall({ cors: true }, async (request) => {
  try {
    const { email, code } = request.data;

    if (!email || !code) {
      throw new HttpsError("invalid-argument", "Email and code are required.");
    }

    const codeRef = db.collection("digicodes").doc(email.toLowerCase());
    const codeDoc = await codeRef.get();

    if (!codeDoc.exists) {
      throw new HttpsError("not-found", "Invalid code. Please request a new one.");
    }

    const data = codeDoc.data()!;
    const { code: storedCode, expires } = data;

    if (expires.toMillis() < Date.now()) {
      await codeRef.delete();
      throw new HttpsError("deadline-exceeded", "The code has expired.");
    }

    if (storedCode !== code) {
      throw new HttpsError("unauthenticated", "Invalid code.");
    }

    await codeRef.delete();

    let uid: string;
    let isNewUser = false;
    try {
      const user = await admin.auth().getUserByEmail(email.toLowerCase());
      uid = user.uid;
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        const newUser = await admin.auth().createUser({ email });
        uid = newUser.uid;
        isNewUser = true;
      } else {
        throw err;
      }
    }

    const customToken = await admin.auth().createCustomToken(uid);
    
    return { token: customToken, isNewUser };

  } catch (error: any) {
    console.error("FATAL ERROR in verifyDigicode:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Could not complete the sign-in process.");
  }
});

exports.createCheckout = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const { yearly, turnstileToken } = request.data;
    if (!turnstileToken) {
        throw new HttpsError("invalid-argument", "Captcha token is missing.");
    }
    const isTurnstileValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
    if (!isTurnstileValid) {
        throw new HttpsError("permission-denied", "Captcha validation failed.");
    }

    if (!process.env.STRIPE_SECRET_KEY) {
        throw new HttpsError("internal", 'Stripe secret key is not set');
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });

    const uid = request.auth.uid;
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.data()?.premium === true) {
        throw new HttpsError("failed-precondition", "User is already premium.");
    }

    const priceId = yearly === true ? STRIPE_YEARLY_PRICE_ID : STRIPE_MONTHLY_PRICE_ID;
    if (!priceId) {
        throw new HttpsError("internal", "Missing Price ID");
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        allow_promotion_codes: true,
        success_url: `${NEXT_PUBLIC_APP_URL}/premium?success=true`,
        cancel_url: `${NEXT_PUBLIC_APP_URL}/premium?cancel=true`,
        customer_email: request.auth.token.email || undefined,
        metadata: { uid },
        subscription_data: { metadata: { uid } },
    });

    return { url: session.url };
});

exports.createCustomerPortal = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated.");
    }
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new HttpsError("internal", 'Stripe secret key is not set.');
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });

    const uid = request.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    const customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId) {
        throw new HttpsError("not-found", 'Stripe customer ID not found.');
    }
    
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${NEXT_PUBLIC_APP_URL}/settings`,
    });

    return { url: portalSession.url };
});

exports.stripeWebhook = onCall({ cors: true }, async (request) => {
    const sig = request.rawRequest.headers["stripe-signature"] as string;
    const event = request.data as Stripe.Event;

    if (!process.env.STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      console.error("Stripe keys not configured");
      throw new HttpsError("internal", "Server configuration error");
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-12-15.clover",
    });

    try {
      stripe.webhooks.constructEvent(
        request.rawRequest.rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      throw new HttpsError("invalid-argument", `Webhook Error: ${err.message}`);
    }

    if (["checkout.session.completed", "customer.subscription.created", "invoice.paid"].includes(event.type)) {
      const obj = event.data.object as any;
      let uid = obj.metadata?.uid;
      let email = (obj.customer_details?.email || obj.customer_email || "").toLowerCase().trim();
      let customerId = obj.customer;

      if (!uid && email) {
          try {
              const userRecord = await admin.auth().getUserByEmail(email);
              uid = userRecord.uid;
          } catch (error) {
              console.error(`Could not find user by email ${email} for Stripe event ${event.id}`);
          }
      }
      
      if (!uid && customerId) {
          try {
              const customer = await stripe.customers.retrieve(customerId);
              if(!customer.deleted) {
                uid = customer.metadata.uid;
              }
          } catch(e) {
              console.error(`Could not retrieve customer ${customerId}`);
          }
      }
      
      if (!uid && obj.subscription) {
         try {
             const subscription = await stripe.subscriptions.retrieve(obj.subscription as string);
             uid = subscription.metadata.uid;
             if (!customerId) customerId = subscription.customer as string;
         } catch(e) {
              console.error(`Could not retrieve subscription ${obj.subscription}`);
         }
      }

      if (uid) {
          const userRef = db.collection("users").doc(uid);

          try {
               await db.runTransaction(async (transaction) => {
                  const userSnap = await transaction.get(userRef);
                  const isAlreadyPremium = userSnap.exists && userSnap.data()?.premium;
                  
                  const updateData: any = {
                      premium: true,
                      stripeCustomerId: customerId,
                  };
                  
                  if (!isAlreadyPremium) {
                      updateData.premiumSince = admin.firestore.FieldValue.serverTimestamp();
                  }

                  transaction.set(userRef, updateData, { merge: true });

                  const yearlyPriceId = STRIPE_YEARLY_PRICE_ID;
                  const lineItems = obj.line_items || obj.items;
                  const isYearly = lineItems?.data?.[0]?.price?.id === yearlyPriceId || obj.plan?.id === yearlyPriceId;
                  
                  if (isYearly) {
                      const hallOfFameRef = db.collection("hallOfFame");
                      const ogQuery = await hallOfFameRef.get();
                      const ogCount = ogQuery.size;

                      if (ogCount < 300) {
                          const ogDocRef = hallOfFameRef.doc(uid);
                          const ogDoc = await transaction.get(ogDocRef);
                          if (!ogDoc.exists) {
                              const rank = ogCount + 1;
                              const authUser = await admin.auth().getUser(uid);
                              const displayName = authUser.email?.split('@')[0] || `user${rank}`;
                              transaction.set(ogDocRef, {
                                  uid,
                                  displayName,
                                  rank,
                                  joinedAt: admin.firestore.FieldValue.serverTimestamp()
                              });
                          }
                      }
                  }

                  if (!isAlreadyPremium && email && process.env.BREVO_API_KEY) {
                      try {
                          const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
                              method: "POST",
                              headers: {
                                  "api-key": process.env.BREVO_API_KEY,
                                  "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                  sender: { name: "WODBurner Team", email: "noreply@wodburner.app" },
                                  to: [{ email }],
                                  templateId: 4, 
                              }),
                          });
                          if (!brevoRes.ok) {
                             console.error(`Brevo API error for premium welcome email to ${email}:`, await brevoRes.text());
                          } else {
                             console.log(`Premium welcome email sent to ${email}`);
                          }
                      } catch (emailError) {
                          console.error(`Failed to send premium welcome email to ${email}:`, emailError);
                      }
                  }
              });
              console.log(`PREMIUM ACTIVATED for ${uid} – ${event.type}`);
          } catch(error) {
              console.error(`Transaction failed for user ${uid}:`, error);
          }
      }
    }

    return { success: true };
});


exports.resetDailyLimits = onSchedule('0 0 * * *', async () => {
    console.log('Running daily limit reset job.');
    try {
        const usersSnapshot: QuerySnapshot = await db.collection('users').get();
        if (usersSnapshot.empty) {
            console.log('No users to process.');
            return;
        }

        const batch = db.batch();
        usersSnapshot.forEach((doc: DocumentSnapshot) => {
            const userRef = doc.ref;
            batch.update(userRef, {
                dailyReactions: 0,
                wodGenerationCount: 0,
                dailyReset: admin.firestore.Timestamp.now()
            });
        });

        await batch.commit();
        console.log(`Successfully reset daily limits for ${usersSnapshot.size} users.`);
    } catch (error) {
        console.error('Error resetting daily limits:', error);
    }
});

exports.resetMonthlyLimits = onSchedule('0 0 1 * *', async () => {
    console.log('Running monthly limit reset job.');
    try {
        const usersSnapshot: QuerySnapshot = await db.collection('users').get();
        if (usersSnapshot.empty) {
            console.log('No users to process for monthly reset.');
            return;
        }

        const batch = db.batch();
        usersSnapshot.forEach((doc: DocumentSnapshot) => {
            const userRef = doc.ref;
            batch.update(userRef, {
                ocrCount: 0,
                ocrReset: admin.firestore.Timestamp.now()
            });
        });

        await batch.commit();
        console.log(`Successfully reset monthly limits for ${usersSnapshot.size} users.`);
    } catch (error) {
        console.error('Error resetting monthly limits:', error);
    }
});
