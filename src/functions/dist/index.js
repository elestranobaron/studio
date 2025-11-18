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
exports.sendMagicLink = onCall({
    region: "us-central1",
    // cors géré automatiquement sur onCall, pas besoin de le préciser
}, async (request) => {
    const email = request.data.email;
    if (!email || typeof email !== "string") {
        throw new HttpsError("invalid-argument", "email required");
    }
    // Récupère IP & UA depuis le contexte callable (plus propre)
    const headers = request.rawRequest?.headers || {};
    const ip = headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
    const userAgent = headers["user-agent"] || "unknown";
    try {
        const link = await admin.auth().generateSignInWithEmailLink(email, {
            url: "https://wodburner.app/verify",
            handleCodeInApp: true,
        });
        const redirectLink = `https://wodburner.app/auth/redirect?continueUrl=${encodeURIComponent(link)}&utm_source=brevo&utm_campaign=magiclink`;
        await db.collection("magicLinks").doc(email).set({
            ip,
            userAgent,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
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
                params: { LINK: redirectLink },
            }),
        });
        if (!brevoRes.ok) {
            const text = await brevoRes.text();
            throw new Error(`Brevo failed: ${text}`);
        }
        return { success: true };
    }
    catch (error) {
        console.error("sendMagicLink error:", error);
        throw new HttpsError("internal", "Failed to send magic link");
    }
});
exports.onUserSignIn = onCall(async (request) => {
    if (!request.auth?.uid)
        return;
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
    if (!email)
        throw new HttpsError("invalid-argument", "email required");
    const headers = request.rawRequest?.headers || {};
    const ip = headers["x-forwarded-for"]?.split(",")[0]?.trim() || request.rawRequest?.ip || "unknown";
    const userAgent = headers["user-agent"] || "unknown";
    const doc = await db.collection("magicLinks").doc(email).get();
    if (!doc.exists)
        return { allowed: false, reason: "no_attempt" };
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
    if (!request.auth?.uid)
        throw new HttpsError("unauthenticated", "Login required");
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
exports.stripeWebhook = onRequest({ region: "europe-west1", invoker: "public" }, async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`Webhook signature verification failed:`, message);
        return res.status(400).send(`Webhook Error: ${message}`);
    }
    if (event.type === "checkout.session.completed" || event.type === "customer.subscription.created") {
        const session = event.data.object;
        const uid = session.metadata?.uid;
        if (uid) {
            await db.collection("users").doc(uid).set({
                premium: true,
                premiumSince: admin.firestore.FieldValue.serverTimestamp(),
                priceId: session.subscription ? null : session.display_items?.[0]?.price?.id,
            }, { merge: true });
            console.log(`User ${uid} is now premium`);
            if (session.customer_details?.email) {
                try {
                    await fetch("https://api.sendinblue.com/v3/smtp/email", {
                        method: "POST",
                        headers: {
                            "api-key": BREVO_API_KEY,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            sender: { name: "WODBurner Team", email: "noreply@wodburner.app" },
                            to: [{ email: session.customer_details.email }],
                            templateId: 4,
                        }),
                    });
                }
                catch (e) {
                    console.error("Brevo welcome email failed:", e);
                }
            }
        }
    }
    res.status(200).send();
});
