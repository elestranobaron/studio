"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateMealPlanOutputSchema = exports.MealIdeaSchema = exports.GenerateMealPlanInputSchema = void 0;
const genkit_1 = require("genkit");
exports.GenerateMealPlanInputSchema = genkit_1.z.object({
    weight: genkit_1.z.number().optional(),
    height: genkit_1.z.number().optional(),
    goal: genkit_1.z.string().optional(),
    activityLevel: genkit_1.z.string().optional(),
    targetCalories: genkit_1.z.number().optional(),
    targetProteins: genkit_1.z.number().optional(),
});
exports.MealIdeaSchema = genkit_1.z.object({
    name: genkit_1.z.string(),
    description: genkit_1.z.string(),
    calories: genkit_1.z.number(),
    proteins: genkit_1.z.number(),
    carbs: genkit_1.z.number(),
    fats: genkit_1.z.number(),
    type: genkit_1.z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'post-wod']),
});
exports.GenerateMealPlanOutputSchema = genkit_1.z.object({
    meals: genkit_1.z.array(exports.MealIdeaSchema),
    totalCalories: genkit_1.z.number(),
    totalProteins: genkit_1.z.number(),
    coachAdvice: genkit_1.z.string().describe("A short piece of advice from the WODBurner coach for this specific plan."),
});
