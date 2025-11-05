export type WodType = "For Time" | "AMRAP" | "EMOM" | "Tabata" | "Other";

export type WOD = {
  id: string;
  name: string;
  type: WodType;
  date: string;
  description: string;
  duration?: number; // in minutes for AMRAP/EMOM
  rounds?: number; // for EMOM/Tabata
  result?: string; // e.g., "15:32" or "5 Rounds + 10 Reps"
  imageUrl: string; // Now stores the Data URI of the uploaded image
  imageHint?: string;
  userId?: string;
};
