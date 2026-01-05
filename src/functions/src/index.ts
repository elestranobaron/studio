
"use strict";

import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import type { QuerySnapshot, DocumentSnapshot } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import express from "express";
import { generateWod } from './ai/generate-wod-flow';
import { analyzeWod } from "./ai/analyze-wod-flow";
import cors from "cors";

// Initialize Express app
const app = express();

// Use CORS middleware to allow requests from your frontend
const corsMiddleware = cors({ origin: "https://wodburner.app" });
app.use(corsMiddleware);

// Middleware to handle JSON parsing and raw body for Stripe
app.use(express.json({
    verify: (req, res, buf) => {
        (req as any).rawBody = buf;
    }
}));


admin.initializeApp();
const db = admin.firestore();

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

app.post('/sendDigicode', async (req, res) => {
  const { email, turnstileToken } = req.body.data;
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: { message: "A valid email address is required." } });
    return;
  }
  
  if (!turnstileToken) {
    res.status(400).json({ error: { message: "Captcha token is missing." } });
    return;
  }
  
  const isTurnstileValid = await validateTurnstile(turnstileToken, req.ip);
  if (!isTurnstileValid) {
      res.status(403).json({ error: { message: "Captcha validation failed." } });
      return;
  }

  if (!process.env.BREVO_API_KEY) {
    console.error("Brevo API key is not configured.");
    res.status(500).json({ error: { message: "The mail service is not configured." } });
    return;
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
      res.status(500).json({ error: { message: "Failed to send the authentication code." } });
      return;
    }

    res.json({ data: { success: true } });
  } catch (error) {
    console.error("sendDigicode error:", error);
    res.status(500).json({ error: { message: "An unexpected error occurred." } });
  }
});

app.post('/generateWod', async (req, res) => {
    const { turnstileToken } = req.body.data;

    if (!turnstileToken) {
        res.status(400).json({ error: { message: "Captcha token is missing." } });
        return;
    }

    const isTurnstileValid = await validateTurnstile(turnstileToken, req.ip);
    if (!isTurnstileValid) {
        res.status(403).json({ error: { message: "Captcha validation failed." } });
        return;
    }

    try {
        const result = await generateWod({});
        res.json({ data: result });
    } catch (e: any) {
        console.error("WOD Generation Flow Error:", e);
        res.status(500).json({ error: { message: e.message || "Failed to generate WOD." } });
    }
});


app.post('/analyzeWod', async (req, res) => {
    const { photoDataUri, turnstileToken } = req.body.data;
    if (!photoDataUri) {
        res.status(400).json({ error: { message: "The function must be called with a 'photoDataUri' argument." } });
        return;
    }
    if (!turnstileToken) {
        res.status(400).json({ error: { message: "Captcha token is missing." } });
        return;
    }

    const isTurnstileValid = await validateTurnstile(turnstileToken, req.ip);
    if (!isTurnstileValid) {
        res.status(403).json({ error: { message: "Captcha validation failed." } });
        return;
    }

    try {
        const result = await analyzeWod({ photoDataUri });
        res.json({ data: result });
    } catch (e: any) {
        console.error("WOD Analysis Flow Error:", e);
        res.status(500).json({ error: { message: e.message || "Failed to analyze WOD." } });
    }
});


app.post('/verifyDigicode', async (req, res) => {
  try {
    const { email, code } = req.body.data;

    if (!email || !code) {
      res.status(400).json({ error: { message: "Email and code are required." } });
      return;
    }

    const codeRef = db.collection("digicodes").doc(email.toLowerCase());
    const codeDoc = await codeRef.get();

    if (!codeDoc.exists) {
      res.status(404).json({ error: { message: "Invalid code. Please request a new one." } });
      return;
    }

    const data = codeDoc.data()!;
    const { code: storedCode, expires } = data;

    if (expires.toMillis() < Date.now()) {
      await codeRef.delete();
      res.status(408).json({ error: { message: "The code has expired." } });
      return;
    }

    if (storedCode !== code) {
      res.status(401).json({ error: { message: "Invalid code." } });
      return;
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
    
    res.json({ data: { token: customToken, isNewUser } });

  } catch (error: any) {
    console.error("FATAL ERROR in verifyDigicode:", error);
    res.status(500).json({ error: { message: "Could not complete the sign-in process." } });
  }
});


app.post('/createCheckout', async (req, res) => {
    try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
    }

    const { yearly, turnstileToken } = req.body.data || {};
    const userIp = req.headers['x-forwarded-for'] as string | undefined;

    if (!turnstileToken) {
        res.status(400).json({ error: "Captcha token is missing." });
        return;
    }
    
    const isTurnstileValid = await validateTurnstile(turnstileToken, userIp);
    if (!isTurnstileValid) {
        res.status(403).json({ error: "Captcha validation failed." });
        return;
    }

    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe secret key is not set');
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;
    
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.data()?.premium === true) {
        res.status(400).json({ error: "User is already premium." });
        return;
    }


    const priceId = yearly === true ? STRIPE_YEARLY_PRICE_ID : STRIPE_MONTHLY_PRICE_ID;

    if (!priceId) {
        res.status(500).json({ error: "Missing Price ID" });
        return;
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        allow_promotion_codes: true,
        success_url: `${NEXT_PUBLIC_APP_URL}/premium?success=true`,
        cancel_url: `${NEXT_PUBLIC_APP_URL}/premium?cancel=true`,
        customer_email: decodedToken.email || undefined,
        metadata: { uid },
        subscription_data: { metadata: { uid } },
    });

    res.status(200).json({ data: { url: session.url }});
    } catch (error: any) {
    console.error("createCheckout Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
    }
});


app.post('/stripeWebhook', async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      console.error("Stripe keys not configured");
      res.status(500).send("Server configuration error");
      return;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-12-15.clover",
    });

    const sig = req.headers["stripe-signature"] as string;

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        (req as any).rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

  if (
    ["checkout.session.completed", "customer.subscription.created", "invoice.paid"].includes(event.type)
  ) {
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

  res.status(200).send("ok");
});

app.post('/createCustomerPortal', async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) {
        res.status(500).json({ error: 'Stripe secret key is not set.' });
        return;
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
    }

    try {
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;
        
        const userDoc = await db.collection('users').doc(uid).get();
        const customerId = userDoc.data()?.stripeCustomerId;

        if (!customerId) {
            res.status(404).json({ error: 'Stripe customer ID not found.' });
            return;
        }
        
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${NEXT_PUBLIC_APP_URL}/settings`,
        });

        res.json({ data: { url: portalSession.url }});
    } catch (error: any) {
         res.status(500).json({ error: error.message || 'Could not create customer portal session.' });
    }
});


// Export the Express app as a function for each endpoint
exports.api = onRequest(app);


// Scheduled functions remain unchanged
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
