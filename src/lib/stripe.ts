// src/lib/stripe.ts
import { loadStripe } from "@stripe/stripe-js";

// COLLE TA PUBLISHABLE KEY ICI (celle qui commence par pk_test_...)
const stripePromise = loadStripe(
  "pk_test_51M3JRFBuRfqlcCPRgOBJjp5vlhG9iU0rOpRABCcOebSmrWht97BAu22VeuPl0723K2KuWDN3DdheqU9HWUo3vjTM008rbnH1Qg"
);

export default stripePromise;