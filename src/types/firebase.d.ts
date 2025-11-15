// src/types/firebase.d.ts
import "firebase/auth";

declare module "firebase/auth" {
  interface User {
    premium?: boolean;
    stripeCustomerId?: string;
  }
}
