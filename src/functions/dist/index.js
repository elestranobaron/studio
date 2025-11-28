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
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
// ─────────────────────────────────────────────────────
// IMPORTS À METTRE À JOUR (remplace tes anciens imports https)
const v2_1 = require("firebase-functions/v2"); // ← nouvelle localisation depuis v5
// ─────────────────────────────────────────────────────
admin.initializeApp();
const db = admin.firestore();
// Optionnel mais propre : tu définis la région par défaut pour toutes tes functions v2
(0, v2_1.setGlobalOptions)({ region: "us-central1" });
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID;
const STRIPE_YEARLY_PRICE_ID = process.env.STRIPE_YEARLY_PRICE_ID;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
// --- DIGICODE AUTHENTICATION ---
function generateDigicode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
exports.sendDigicode = (0, https_1.onCall)({}, async (request) => {
    const email = request.data.email;
    if (!email || typeof email !== "string") {
        throw new https_1.HttpsError("invalid-argument", "A valid email address is required.");
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
        const brevoRes = await fetch("https://api.sendinblue.com/v3/smtp/email", {
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
exports.verifyDigicode = (0, https_1.onCall)({}, async (request) => {
    console.log("verifyDigicode appelée – payload reçu :", JSON.stringify(request.data));
    try {
        const { email, code } = request.data;
        if (!email || !code) {
            console.log("Missing email or code");
            throw new https_1.HttpsError("invalid-argument", "Email and code are required.");
        }
        console.log("Recherche du digicode dans Firestore pour", email);
        const codeRef = db.collection("digicodes").doc(email.toLowerCase());
        const codeDoc = await codeRef.get();
        if (!codeDoc.exists) {
            console.log("Aucun document trouvé dans digicodes pour cet email");
            throw new https_1.HttpsError("not-found", "Invalid code. Please request a new one.");
        }
        const data = codeDoc.data();
        const { code: storedCode, expires } = data;
        if (expires.toMillis() < Date.now()) {
            console.log("Code expiré");
            await codeRef.delete();
            throw new https_1.HttpsError("deadline-exceeded", "The code has expired.");
        }
        if (storedCode !== code) {
            console.log(`Code incorrect – reçu: ${code} | stocké: ${storedCode}`);
            throw new https_1.HttpsError("unauthenticated", "Invalid code.");
        }
        await codeRef.delete();
        console.log("Code valide – on passe à la création/utilisation user");
        // === LA PARTIE QUI PLANTE EST ICI ===
        let uid;
        try {
            const user = await admin.auth().getUserByEmail(email.toLowerCase());
            uid = user.uid;
            console.log("Utilisateur existant trouvé :", uid);
        }
        catch (err) {
            if (err.code === "auth/user-not-found") {
                console.log("Utilisateur n'existe pas → création");
                const newUser = await admin.auth().createUser({ email });
                uid = newUser.uid;
                console.log("Nouvel utilisateur créé :", uid);
            }
            else {
                console.error("Erreur getUserByEmail inattendue :", err);
                throw err;
            }
        }
        console.log("Création du custom token pour uid", uid);
        const customToken = await admin.auth().createCustomToken(uid);
        console.log("Custom token généré avec succès");
        return { token: customToken };
    }
    catch (error) {
        console.error("ERREUR FATALE dans verifyDigicode :", error);
        console.error("Stack :", error.stack);
        throw new https_1.HttpsError("internal", "Could not complete the sign-in process.");
    }
});
// --- USER AND STRIPE FUNCTIONS (Unchanged but kept for context) ---
exports.onUserSignIn = (0, https_1.onCall)({}, async (request) => {
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
exports.resetOCR = (0, scheduler_1.onSchedule)("0 0 1 * *", async () => {
    const snapshot = await db.collection("users").get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { ocrCount: 0 });
    });
    await batch.commit();
    console.log(`OCR reset for ${snapshot.size} users`);
});
exports.resetReactions = (0, scheduler_1.onSchedule)("0 0 * * *", async () => {
    const snapshot = await db.collection("users").get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { dailyReactions: 0 });
    });
    await batch.commit();
    console.log(`Reactions reset for ${snapshot.size} users`);
});
exports.createCheckout = (0, https_1.onRequest)({
    cors: true, // résout le problème CORS
    memory: "256MiB",
    timeoutSeconds: 60,
}, async (req, res) => {
    try {
        // 1. Vérification de l'auth Firebase manuellement
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            res.status(401).json({ error: "Unauthenticated" });
            return;
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;
        // 2. Récupération des données envoyées depuis le front
        const yearly = req.body.data?.yearly === true;
        const priceId = yearly
            ? process.env.STRIPE_YEARLY_PRICE_ID
            : process.env.STRIPE_MONTHLY_PRICE_ID;
        if (!priceId) {
            res.status(500).json({ error: "Price ID manquant" });
            return;
        }
        // 3. Création de la session Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: "subscription",
            allow_promotion_codes: true,
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/premium?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/premium?cancel=true`,
            customer_email: decodedToken.email || undefined,
            metadata: { uid },
            subscription_data: { metadata: { uid } },
        });
        // 4. Réponse au front
        res.status(200).json({ url: session.url });
    }
    catch (error) {
        console.error("Erreur createCheckout:", error);
        res.status(500).json({ error: error.message || "Erreur interne" });
    }
});
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.use(express_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf.toString();
    },
}));
app.post("/", async (req, res) => {
    const typedReq = req;
    const sig = req.headers["stripe-signature"];
    if (!typedReq.rawBody) {
        console.error("rawBody manquant");
        return res.status(400).send("No raw body");
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(typedReq.rawBody, sig, STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error("Webhook error:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (["checkout.session.completed", "customer.subscription.created", "invoice.paid"].includes(event.type)) {
        const obj = event.data.object;
        let uid = obj.metadata?.uid;
        const email = (obj.customer_details?.email || obj.customer_email || "").toLowerCase().trim();
        if (!uid && email) {
            const snap = await db.collection("users").where("email", "==", email).limit(1).get();
            if (!snap.empty)
                uid = snap.docs[0].id;
        }
        if (uid) {
            const userRef = db.collection("users").doc(uid);
            const priceId = obj.items?.data?.[0]?.price?.id || obj.plan?.id || obj.subscription?.default_price || "unknown";
            await db.runTransaction(async (transaction) => {
                const userSnap = await transaction.get(userRef);
                const userData = userSnap.data();
                transaction.set(userRef, {
                    premium: true,
                    premiumSince: admin.firestore.FieldValue.serverTimestamp(),
                    priceId: priceId,
                }, { merge: true });
                if (priceId === STRIPE_YEARLY_PRICE_ID && !userData?.isOg) {
                    const hallOfFameRef = db.collection("hallOfFame");
                    const ogQuery = await hallOfFameRef.get();
                    const ogCount = ogQuery.size;
                    if (ogCount < 300) {
                        const rank = ogCount + 1;
                        const authUser = await admin.auth().getUser(uid);
                        const displayName = authUser.email?.split('@')[0] || `user${rank}`;
                        const ogDocRef = hallOfFameRef.doc(uid);
                        transaction.set(ogDocRef, {
                            uid,
                            displayName,
                            rank,
                            joinedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        transaction.update(userRef, { isOg: true });
                    }
                }
            });
            console.log(`PREMIUM ACTIVÉ pour ${uid} – ${event.type}`);
        }
    }
    res.status(200).send("ok");
});
exports.stripeWebhook = (0, https_1.onRequest)({ region: "europe-west1" }, app);
exports.createCustomerPortal = (0, https_1.onCall)({}, async (request) => {
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
