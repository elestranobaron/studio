
import { z } from 'genkit';

export const GenerateMealPlanInputSchema = z.object({
  weight: z.number().optional(),
  height: z.number().optional(),
  goal: z.string().optional(),
  activityLevel: z.string().optional(),
  targetCalories: z.number().optional(),
  targetProteins: z.number().optional(),
  locale: z.string().optional().describe("The language code for the output (e.g., 'fr', 'en', 'es')."),
});
export type GenerateMealPlanInput = z.infer<typeof GenerateMealPlanInputSchema>;

export const MealIdeaSchema = z.object({
  name: z.string(),
  description: z.string(),
  calories: z.number(),
  proteins: z.number(),
  carbs: z.number(),
  fats: z.number(),
  type: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'post-wod']),
});

export const GenerateMealPlanOutputSchema = z.object({
  meals: z.array(MealIdeaSchema),
  totalCalories: z.number(),
  totalProteins: z.number(),
  coachAdvice: z.string().describe("A short piece of advice from the WODBurner coach for this specific plan."),
});
export type GenerateMealPlanOutput = z.infer<typeof GenerateMealPlanOutputSchema>;
