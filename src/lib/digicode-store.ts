// src/lib/digicode-store.ts  ← CE FICHIER EST PARTAGÉ ENTRE LES 2 ROUTES
export type DigicodeEntry = {
    code: string;
    expires: number;
  };
  
  // Une seule Map pour tout le process Node.js
  export const digicodeStore = new Map<string, DigicodeEntry>();