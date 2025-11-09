// src/types/firebase.d.ts   ← NOUVEAU FICHIER
import "firebase/auth";

declare module "firebase/auth" {
  interface User {
    premium?: boolean;
  }
}