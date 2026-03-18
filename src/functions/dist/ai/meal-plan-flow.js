"use strict";
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMealPlan = generateMealPlan;
/**
 * @fileOverview A meal plan generation AI agent.
 */
const genkit_instance_1 = require("./genkit-instance");
const meal_schema_1 = require("./meal-schema");
const generateMealPlanPrompt = (0, genkit_instance_1.getAi)().definePrompt({
    name: 'generateMealPlanPrompt',
    input: { schema: meal_schema_1.GenerateMealPlanInputSchema },
    output: { schema: meal_schema_1.GenerateMealPlanOutputSchema },
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
async function generateMealPlan(input) {
    return await generateMealPlanFlow(input);
}
const generateMealPlanFlow = (0, genkit_instance_1.getAi)().defineFlow({
    name: 'generateMealPlanFlow',
    inputSchema: meal_schema_1.GenerateMealPlanInputSchema,
    outputSchema: meal_schema_1.GenerateMealPlanOutputSchema,
}, async (input) => {
    const { output } = await generateMealPlanPrompt(input);
    return output;
});
