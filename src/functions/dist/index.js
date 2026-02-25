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
exports.resetMonthlyLimits = exports.resetDailyLimits = exports.stripeWebhook = exports.createCustomerPortal = exports.createCheckout = exports.verifyDigicode = exports.sendDigicode = exports.analyzeWod = exports.generateWod = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const v2_1 = require("firebase-functions/v2");
const firebase_functions_1 = require("firebase-functions");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
(0, v2_1.setGlobalOptions)({
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 120
});
async function validateTurnstile(token, ip) {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!token || token.includes('DUMMY'))
        return true;
    if (!secret || secret.startsWith('your_'))
        return true;
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);
    if (ip)
        formData.append('remoteip', ip);
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });
        const outcome = await response.json();
        firebase_functions_1.logger.info("[validateTurnstile] Full Cloudflare response:", outcome);
        return !!outcome.success;
    }
    catch (e) {
        firebase_functions_1.logger.error('Turnstile error:', e);
        return false;
    }
}
exports.generateWod = (0, https_1.onCall)(async (request) => {
    firebase_functions_1.logger.info("[generateWod] Started");
    try {
        const { turnstileToken } = request.data;
        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid)
            throw new https_1.HttpsError("permission-denied", "Captcha failed");
        // Use a different name for the imported function to avoid shadowing
        const flowModule = await Promise.resolve().then(() => __importStar(require("./ai/generate-wod-flow")));
        const result = await flowModule.generateWod({});
        return result;
    }
    catch (e) {
        firebase_functions_1.logger.error("[generateWod] Error:", e);
        throw new https_1.HttpsError("internal", e.message || "AI Error");
    }
});
exports.analyzeWod = (0, https_1.onCall)(async (request) => {
    try {
        const { photoDataUri, turnstileToken } = request.data;
        if (!photoDataUri)
            throw new https_1.HttpsError("invalid-argument", "Image required");
        const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
        if (!isValid)
            throw new https_1.HttpsError("permission-denied", "Captcha failed");
        const flowModule = await Promise.resolve().then(() => __importStar(require("./ai/analyze-wod-flow")));
        const result = await flowModule.analyzeWod({ photoDataUri });
        return result;
    }
    catch (e) {
        firebase_functions_1.logger.error("[analyzeWod] Error:", e);
        throw new https_1.HttpsError("internal", e.message || "AI Error");
    }
});
exports.sendDigicode = (0, https_1.onCall)(async (request) => {
    const { email, turnstileToken } = request.data;
    if (!email)
        throw new https_1.HttpsError("invalid-argument", "Email required");
    const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
    if (!isValid)
        throw new https_1.HttpsError("permission-denied", "Captcha failed");
    const brevoKey = process.env.BREVO_API_KEY;
    if (!brevoKey || brevoKey.startsWith('your_'))
        throw new https_1.HttpsError("failed-precondition", "Email config missing");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await db.collection("digicodes").doc(email.toLowerCase()).set({
        code,
        expires: admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
    });
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevoKey, "Content-Type": "application/json" },
        body: JSON.stringify({
            sender: { name: "WODBurner", email: "noreply@wodburner.app" },
            to: [{ email }],
            templateId: 2,
            params: { DIGICODE: code },
        }),
    });
    if (!res.ok)
        throw new https_1.HttpsError("internal", "Email failed");
    return { success: true };
});
exports.verifyDigicode = (0, https_1.onCall)(async (request) => {
    const { email, code } = request.data;
    const digiDoc = await db.collection("digicodes").doc(email.toLowerCase()).get();
    if (!digiDoc.exists)
        throw new https_1.HttpsError("not-found", "Invalid code");
    const data = digiDoc.data();
    if (data.code !== code || data.expires.toMillis() < Date.now())
        throw new https_1.HttpsError("unauthenticated", "Expired");
    await digiDoc.ref.delete();
    let uid;
    let isNewUser = false;
    try {
        const user = await admin.auth().getUserByEmail(email.toLowerCase());
        uid = user.uid;
    }
    catch {
        const user = await admin.auth().createUser({ email: email.toLowerCase() });
        uid = user.uid;
        isNewUser = true;
    }
    const token = await admin.auth().createCustomToken(uid);
    return { token, isNewUser };
});
exports.createCheckout = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Auth required");
    const { yearly, turnstileToken } = request.data;
    const isValid = await validateTurnstile(turnstileToken, request.rawRequest.ip);
    if (!isValid)
        throw new https_1.HttpsError("permission-denied", "Captcha failed");
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const stripe = new stripe_1.default(stripeKey, { apiVersion: "2026-01-28.clover" });
    const priceId = yearly ? process.env.STRIPE_YEARLY_PRICE_ID : process.env.STRIPE_MONTHLY_PRICE_ID;
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/premium?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/premium?cancel=true`,
        metadata: { uid: request.auth.uid },
    });
    return { url: session.url };
});
exports.createCustomerPortal = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Auth required");
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const customerId = userDoc.data()?.stripeCustomerId;
    if (!customerId)
        throw new https_1.HttpsError("not-found", "Stripe customer not found");
    const stripe = new stripe_1.default(stripeKey, { apiVersion: "2026-01-28.clover" });
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    });
    return { url: portalSession.url };
});
exports.stripeWebhook = (0, https_1.onRequest)(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const stripeKey = process.env.STRIPE_SECRET_KEY || "";
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    const stripe = new stripe_1.default(stripeKey, { apiVersion: "2026-01-28.clover" });
    try {
        const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
        if (event.type === "checkout.session.completed") {
            const obj = event.data.object;
            const uid = obj.metadata?.uid;
            if (uid) {
                await db.collection("users").doc(uid).set({ premium: true, stripeCustomerId: obj.customer }, { merge: true });
            }
        }
        res.status(200).send({ received: true });
    }
    catch (err) {
        res.status(400).send(`Error: ${err.message}`);
    }
});
exports.resetDailyLimits = (0, scheduler_1.onSchedule)('0 0 * * *', async () => {
    const users = await db.collection('users').get();
    const batch = db.batch();
    users.forEach(d => batch.update(d.ref, { dailyReactions: 0, wodGenerationCount: 0 }));
    await batch.commit();
});
exports.resetMonthlyLimits = (0, scheduler_1.onSchedule)('0 0 1 * *', async () => {
    const users = await db.collection('users').get();
    const batch = db.batch();
    users.forEach(d => batch.update(d.ref, { ocrCount: 0 }));
    await batch.commit();
});
