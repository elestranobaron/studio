
import type { Timestamp } from 'firebase/firestore';

export type WodType = "For Time" | "AMRAP" | "EMOM" | "Tabata" | "Other";

export type WodDescriptionSection = {
  title: string;
  content: string;
  timerType?: WodType;
  timerDuration?: number; // in minutes for AMRAP/EMOM
  timerRounds?: number;   // for EMOM/Tabata
  timerInterval?: number; // in seconds for EMOM
};

export type Reaction = 'fire' | 'poop' | 'laugh' | 'cry' | 'vomit';

export type Message = {
  id: string;
  text: string;
  userId: string;
  userDisplayName: string;
  timestamp: Timestamp | string; // Allow string for legacy/server values, but prefer Timestamp
  parentId?: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  replyCount: number;
};

export type MealIdea = {
  name: string;
  description: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'post-wod';
};

export type WOD = {
  id: string;
  name: string;
  type: WodType;
  date: string;
  description: WodDescriptionSection[] | string; // Allow string for legacy data
  duration?: number; // in minutes for AMRAP/EMOM
  rounds?: number; // for EMOM/Tabata
  result?: string; // e.g., "15:32" or "5 Rounds + 10 Reps"
  imageUrl: string; // Now stores the Data URI of the uploaded image
  imageHint?: string;
  userId: string;
  communityWodId?: string; // ID of the corresponding doc in communityWods
  userDisplayName?: string; // Author's name for community WODs
  reactions?: { // For community WODs
    fire: number;
    poop: number;
    laugh: number;
    cry: number;
    vomit: number;
  };
  commentCount?: number; // For community WODs
  emomInterval?: number; // Custom: Interval length in seconds for EMOM
  isPremium?: boolean; // To mark premium content
  // New workout profile fields
  cardio?: number; // Percentage (0-100)
  lifting?: number; // Percentage (0-100)
  upperBody?: number; // Percentage (0-100)
  lowerBody?: number; // Percentage (0-100)
};
