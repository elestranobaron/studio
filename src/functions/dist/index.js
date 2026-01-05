"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const v2_1 = require("firebase-functions/v2");
const generate_wod_flow_1 = require("./ai/generate-wod-flow");
const analyze_wod_flow_1 = require("./ai/analyze-wod-flow");
admin.initializeApp();
const db = admin.firestore();
(0, v2_1.setGlobalOptions)({ region: "us-central1" });
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config({ path: "./.env" });
}
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID;
const STRIPE_YEARLY_PRICE_ID = process.env.STRIPE_YEARLY_PRICE_ID;
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
async function validateTurnstile(token, ip) {
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
    const outcome = await response.json();
    if (!outcome.success) {
        console.warn('Turnstile validation failed:', outcome['error-codes']);
    }
    return outcome.success;
}
function generateDigicode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
exports.sendDigicode = (0, https_1.onCall)({}, async (request) => {
    const { email, turnstileToken } = request.data;
    if (!email || typeof email !== "string") {
        throw new https_1.HttpsError("invalid-argument", "A valid email address is required.");
    }
    if (!turnstileToken) {
        throw new https_1.HttpsError("invalid-argument", "Captcha token is missing.");
    }
    const isTurnstileValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
    if (!isTurnstileValid) {
        throw new https_1.HttpsError("unauthenticated", "Captcha validation failed.");
    }
    if (!process.env.BREVO_API_KEY) {
        console.error("Brevo API key is not configured.");
        throw new https_1.HttpsError("internal", "The mail service is not configured.");
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
            throw new https_1.HttpsError("internal", "Failed to send the authentication code.");
        }
        return { success: true };
    }
    catch (error) {
        console.error("sendDigicode error:", error);
        throw new https_1.HttpsError("internal", "An unexpected error occurred.");
    }
});
exports.generateWod = (0, https_1.onCall)({}, async (request) => {
    const { turnstileToken } = request.data;
    if (!turnstileToken) {
        throw new https_1.HttpsError("invalid-argument", "Captcha token is missing.");
    }
    const isTurnstileValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
    if (!isTurnstileValid) {
        throw new https_1.HttpsError("unauthenticated", "Captcha validation failed.");
    }
    try {
        const result = await (0, generate_wod_flow_1.generateWod)({});
        return result;
    }
    catch (e) {
        console.error("WOD Generation Flow Error:", e);
        // Re-throw the original error to propagate its message to the client
        throw new https_1.HttpsError("internal", e.message || "Failed to generate WOD.");
    }
});
exports.analyzeWod = (0, https_1.onCall)({}, async (request) => {
    const { photoDataUri, turnstileToken } = request.data;
    if (!photoDataUri) {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with a 'photoDataUri' argument.");
    }
    if (!turnstileToken) {
        throw new https_1.HttpsError("invalid-argument", "Captcha token is missing.");
    }
    const isTurnstileValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
    if (!isTurnstileValid) {
        throw new https_1.HttpsError("unauthenticated", "Captcha validation failed.");
    }
    try {
        const result = await (0, analyze_wod_flow_1.analyzeWod)({ photoDataUri });
        return result;
    }
    catch (e) {
        console.error("WOD Analysis Flow Error:", e);
        throw new https_1.HttpsError("internal", e.message || "Failed to analyze WOD.");
    }
});
exports.verifyDigicode = (0, https_1.onCall)({}, async (request) => {
    try {
        const { email, code } = request.data;
        if (!email || !code) {
            throw new https_1.HttpsError("invalid-argument", "Email and code are required.");
        }
        const codeRef = db.collection("digicodes").doc(email.toLowerCase());
        const codeDoc = await codeRef.get();
        if (!codeDoc.exists) {
            throw new https_1.HttpsError("not-found", "Invalid code. Please request a new one.");
        }
        const data = codeDoc.data();
        const { code: storedCode, expires } = data;
        if (expires.toMillis() < Date.now()) {
            await codeRef.delete();
            throw new https_1.HttpsError("deadline-exceeded", "The code has expired.");
        }
        if (storedCode !== code) {
            throw new https_1.HttpsError("unauthenticated", "Invalid code.");
        }
        await codeRef.delete();
        let uid;
        let isNewUser = false;
        try {
            const user = await admin.auth().getUserByEmail(email.toLowerCase());
            uid = user.uid;
        }
        catch (err) {
            if (err.code === "auth/user-not-found") {
                const newUser = await admin.auth().createUser({ email });
                uid = newUser.uid;
                isNewUser = true;
            }
            else {
                throw err;
            }
        }
        const customToken = await admin.auth().createCustomToken(uid);
        return { token: customToken, isNewUser };
    }
    catch (error) {
        console.error("ERREUR FATALE dans verifyDigicode :", error);
        console.error("Stack :", error.stack);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "Could not complete the sign-in process.");
    }
});
exports.createCheckout = (0, https_1.onRequest)({
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 60,
}, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            res.status(401).json({ error: "Unauthenticated" });
            return;
        }
        const { yearly, turnstileToken } = req.body.data || {};
        const userIp = req.headers['x-forwarded-for'];
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
        const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" });
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
            res.status(500).json({ error: "Price ID manquant" });
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
        res.status(200).json({ url: session.url });
    }
    catch (error) {
        console.error("Erreur createCheckout:", error);
        res.status(500).json({ error: error.message || "Erreur interne" });
    }
});
exports.stripeWebhook = (0, https_1.onRequest)({
    region: "us-central1",
    // Important : permet à Firebase d'exposer req.rawBody nativement
    // (nécessaire pour Stripe webhook signature verification)
    // https://firebase.google.com/docs/functions/http-events#raw_request_body
    // En v2, il suffit de ne pas parser le body automatiquement
}, async (req, res) => {
    // Autoriser seulement les POST
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    // Vérifications de base
    if (!process.env.STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
        console.error("Stripe keys not configured");
        res.status(500).send("Server configuration error");
        return;
    }
    const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-12-15.clover",
    });
    const sig = req.headers["stripe-signature"];
    // En Firebase Functions v2, req.rawBody est disponible nativement
    // tant qu’on n’utilise pas de middleware qui parse le body (comme express.json())
    if (!req.rawBody) {
        console.error("rawBody manquant – cela ne devrait pas arriver en v2");
        res.status(400).send("No raw body");
        return;
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, // ← Utilisation directe de req.rawBody
        sig, STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    if (["checkout.session.completed", "customer.subscription.created", "invoice.paid"].includes(event.type)) {
        const obj = event.data.object;
        let uid = obj.metadata?.uid;
        let email = (obj.customer_details?.email || obj.customer_email || "").toLowerCase().trim();
        let customerId = obj.customer;
        if (!uid && email) {
            try {
                const userRecord = await admin.auth().getUserByEmail(email);
                uid = userRecord.uid;
            }
            catch (error) {
                console.error(`Could not find user by email ${email} for Stripe event ${event.id}`);
            }
        }
        if (!uid && customerId) {
            try {
                const customer = await stripe.customers.retrieve(customerId);
                if (!customer.deleted) {
                    uid = customer.metadata.uid;
                }
            }
            catch (e) {
                console.error(`Could not retrieve customer ${customerId}`);
            }
        }
        if (!uid && obj.subscription) {
            try {
                const subscription = await stripe.subscriptions.retrieve(obj.subscription);
                uid = subscription.metadata.uid;
                if (!customerId)
                    customerId = subscription.customer;
            }
            catch (e) {
                console.error(`Could not retrieve subscription ${obj.subscription}`);
            }
        }
        if (uid) {
            const userRef = db.collection("users").doc(uid);
            try {
                await db.runTransaction(async (transaction) => {
                    const userSnap = await transaction.get(userRef);
                    const isAlreadyPremium = userSnap.exists && userSnap.data()?.premium;
                    const updateData = {
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
                            }
                            else {
                                console.log(`Premium welcome email sent to ${email}`);
                            }
                        }
                        catch (emailError) {
                            console.error(`Failed to send premium welcome email to ${email}:`, emailError);
                        }
                    }
                });
                console.log(`PREMIUM ACTIVÉ pour ${uid} – ${event.type}`);
            }
            catch (error) {
                console.error(`Transaction failed for user ${uid}:`, error);
            }
        }
    }
    res.status(200).send("ok");
});
exports.createCustomerPortal = (0, https_1.onCall)({}, async (request) => {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new https_1.HttpsError('internal', 'Stripe secret key is not set.');
    }
    const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" });
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    }
    const uid = request.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    const customerId = userDoc.data()?.stripeCustomerId;
    if (!customerId) {
        throw new https_1.HttpsError('not-found', 'Stripe customer ID not found.');
    }
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${NEXT_PUBLIC_APP_URL}/settings`,
    });
    return { url: portalSession.url };
});
