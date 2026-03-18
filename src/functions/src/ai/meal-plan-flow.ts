
'use server';
/**
 * @fileOverview A meal plan generation AI agent.
 */

import {getAi} from './genkit-instance';
import {
  GenerateMealPlanInputSchema,
  GenerateMealPlanOutputSchema,
  type GenerateMealPlanInput,
  type GenerateMealPlanOutput,
} from './meal-schema';

const generateMealPlanPrompt = getAi().definePrompt({
  name: 'generateMealPlanPrompt',
  input: {schema: GenerateMealPlanInputSchema},
  output: {schema: GenerateMealPlanOutputSchema},
  model: 'googleai/gemini-2.5-flash', 
  config: {
    temperature: 0.7,
  },
  prompt: `You are "WODBurner Nutritionist", an expert in performance nutrition for CrossFit athletes.

Your task is to generate a daily meal plan (3-5 meals) based on the user's profile and targets.

User Profile:
- Weight: {{weight}} kg
- Height: {{height}} cm
- Goal: {{goal}}
- Activity Level: {{activityLevel}}
- Target Calories: {{targetCalories}} kcal
- Target Proteins: {{targetProteins}} g

Instructions:
1. Create a balanced day of eating with breakfast, lunch, dinner, and snacks/post-wod meals.
2. Ensure the total calories and proteins are close to the targets provided.
3. Suggest simple, healthy, and realistic meals for an athlete.
4. Provide macro-nutrients for each meal.
5. Add a short, motivating coach advice at the end.

The language of the output should be the same as the input language or English by default.`,
});

export async function generateMealPlan(
  input: GenerateMealPlanInput
): Promise<GenerateMealPlanOutput> {
  return await generateMealPlanFlow(input);
}

const generateMealPlanFlow = getAi().defineFlow(
  {
    name: 'generateMealPlanFlow',
    inputSchema: GenerateMealPlanInputSchema,
    outputSchema: GenerateMealPlanOutputSchema,
  },
  async (input: GenerateMealPlanInput) => {
    const {output} = await generateMealPlanPrompt(input);
    return output!;
  }
);
