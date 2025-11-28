
// src/lib/digicode-store.ts
export type DigicodeEntry = {
    code: string;
    expires: number;
};

// Une seule Map pour tout le process Node.js, gérée de manière synchrone.
const store = new Map<string, DigicodeEntry>();

export const digicodeStore = {
  set(key: string, value: DigicodeEntry) {
    store.set(key, value);
  },
  get(key: string): DigicodeEntry | null {
    return store.get(key) || null;
  },
  delete(key: string) {
    store.delete(key);
  },
};
