
// src/lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

// Assurez-vous que les variables d'environnement sont définies dans votre environnement de production/déploiement.
// Pour le développement local, cela peut être via un fichier .env.local non versionné.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : undefined;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: serviceAccount
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault(), // Utilise les credentials par défaut de l'environnement (ex: Google Cloud)
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
