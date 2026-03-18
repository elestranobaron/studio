"use strict";
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeWod = analyzeWod;
/**
 * @fileOverview A WOD (Workout of the Day) analysis AI agent.
 *
 * - analyzeWod - A function that handles the WOD analysis process.
 */
const genkit_instance_1 = require("./genkit-instance");
const wod_schema_1 = require("./wod-schema");
async function analyzeWod(input) {
    return await analyzeWodFlow(input);
}
const analyzeWodFlow = (0, genkit_instance_1.getAi)().defineFlow({
    name: 'analyzeWodFlow',
    inputSchema: wod_schema_1.AnalyzeWodInputSchema,
    outputSchema: wod_schema_1.AnalyzeWodOutputSchema,
}, async (input) => {
    const analyzeWodPrompt = (0, genkit_instance_1.getAi)().definePrompt({
        name: 'analyzeWodPrompt',
        input: { schema: wod_schema_1.AnalyzeWodInputSchema },
        output: { schema: wod_schema_1.AnalyzeWodOutputSchema },
        model: 'googleai/gemini-2.5-flash',
        config: {
            temperature: 0.2,
            safetySettings: [
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            ],
        },
        prompt: `You are "WODBurner", an expert CrossFit coach specializing in analyzing images of workouts written on whiteboards.

Your task is to analyze the provided image and extract the workout details in a structured format.

Follow these instructions precisely:

1.  **Analyze the Image**: The image contains a photo of a workout. Read all the text carefully.
2.  **Name**: Identify the name of the workout. It's often at the top. If no name is given, create a descriptive one based on the main exercises (e.g., "Row & Burpee AMRAP").
3.  **Type**: Determine the primary type of the main workout section (usually the Metcon or Conditioning part). It must be one of: "For Time", "AMRAP", "EMOM", "Tabata", or "Other".
4.  **Description Sections**:
    *   Break the workout down into logical sections (e.g., "Warm-up", "Strength", "Metcon", "Accessory", "Cool Down").
    *   For each section, provide the full content, preserving line breaks.
    *   **Crucially**, if a section has its own specific timer (like a 10-minute AMRAP within a larger workout), extract its parameters (\`timerType\`, \`timerDuration\`, \`timerRounds\`, \`timerInterval\`) for that section.
5.  **Main Workout Duration**:
    *   Calculate the total duration in **minutes** for the *main* workout component (the Metcon/Conditioning part).
    *   For an AMRAP, this is the specified time (e.g., "AMRAP in 20 minutes" -> duration: 20).
    *   For an EMOM, calculate \`rounds * interval_minutes\` (e.g., "EMOM for 10 rounds of 1 minute" -> duration: 10).
    *   For "For Time" or "Tabata", leave this field empty.
6.  **Image Hint**: Provide a one or two-word hint for a relevant stock photo. This should be based on the main equipment or movement. Examples: "running", "barbell", "kettlebell", "pull-up".
7.  **Workout Profile Analysis**: Based on the main Metcon/conditioning part, provide a profile analysis.
    *   **cardio**: On a scale of 0-100, what percentage is cardio?
    *   **lifting**: On a scale of 0-100, what percentage is weightlifting? (Sum of cardio and lifting must be 100).
    *   **upperBody**: On a scale of 0-100, what percentage targets the upper body?
    *   **lowerBody**: On a scale of 0-100, what percentage targets the lower body? (Sum of upperBody and lowerBody must be 100).

Be meticulous. The accuracy of the extracted data is critical.

Analyze this workout:
{{media url=photoDataUri}}`,
    });
    const { output } = await analyzeWodPrompt(input);
    return output;
});
