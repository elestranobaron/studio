
'use server';
/**
 * @fileOverview A WOD (Workout of the Day) analysis AI agent.
 *
 * - analyzeWod - A function that handles the WOD analysis process from an image.
 */

import {ai} from '@/ai/genkit';
import {
    AnalyzeWodInputSchema,
    AnalyzeWodOutputSchema,
    type AnalyzeWodInput,
    type AnalyzeWodOutput,
} from '@/ai/schema/wod-schema';

export async function analyzeWod(
  input: AnalyzeWodInput
): Promise<AnalyzeWodOutput> {
  return await analyzeWodFlow(input);
}

const analyzeWodPrompt = ai.definePrompt({
  name: 'analyzeWodPrompt',
  input: {schema: AnalyzeWodInputSchema},
  output: {schema: AnalyzeWodOutputSchema},
  config: {
    // Relax safety settings to avoid blocking legitimate whiteboard photos
    safetySettings: [
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
        },
        {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
        },
        {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
        },
        {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
        },
    ]
  },
  prompt: `You are an expert CrossFit coach and data analyst. Your task is to meticulously analyze the provided image of a Workout of the Day (WOD) and structure it into a machine-readable format.

The image contains a workout, often split into sections like 'Warm-up', 'Strength', 'Metcon'.

**Main Analysis (Overall WOD):**
First, determine the primary details of the WOD. This is usually based on the "Metcon" or main conditioning piece.
1.  **Name**: The title of the workout (e.g., "Murph"). If no name is present, create a descriptive name.
2.  **Type**: The format of the *main workout*. Choose from "For Time", "AMRAP", "EMOM", "Tabata", or "Other".
3.  **Duration**: The total duration in **minutes** of the *main workout*.
    *   For AMRAPs, use the specified time.
    *   For EMOMs, calculate total time (e.g., 'EMOM for 10 rounds of 1 minute' is 10. 'Every 2:30 for 6 rounds' is 15).
    *   For "For Time" workouts, look for a "Time Cap" or "TC" and use that value. Example: "For Time (TC 25)" means the duration is 25.
    *   Leave empty if not applicable.
4.  **Image Hint**: Provide a one or two-word hint for a relevant stock photo based on the main exercises.

**Detailed Section-by-Section Analysis:**
Next, you MUST break the workout down into its logical sections. For **EACH** section, perform the following analysis:
1.  **title**: The title of the section (e.g., 'Warm-up', 'Strength', 'Metcon').
2.  **content**: The full, original text of that section. **Preserve all line breaks and formatting.**
3.  **Timer Analysis (for this section only):**
    *   **timerType**: If this specific section has a timer, identify its type ("For Time", "AMRAP", "EMOM", "Tabata", "Other").
    *   **timerDuration**: For AMRAP/EMOM, what is its duration in minutes? For "For Time", check for a Time Cap.
    *   **timerRounds**: For EMOM/Tabata, how many rounds?
    *   **timerInterval**: For EMOM, what is the interval in **seconds**? (e.g., "Every 90s" is 90).

**Workout Profile Analysis:**
Based on the **main Metcon/conditioning part** of the WOD, provide a profile analysis.
1.  **cardio**: On a scale of 0-100, what percentage is cardio (e.g., running, rowing, burpees)?
2.  **lifting**: On a scale of 0-100, what percentage is weightlifting (e.g., barbell, dumbbell, kettlebell)?
    *   The sum of \`cardio\` and \`lifting\` MUST be 100.
3.  **upperBody**: On a scale of 0-100, what percentage of the work targets the upper body (e.g., pull-ups, push-ups, thrusters)?
4.  **lowerBody**: On a scale of 0-100, what percentage of the work targets the lower body (e.g., squats, running, thrusters)?
    *   The sum of \`upperBody\` and \`lowerBody\` MUST be 100. A movement like a thruster would contribute to both.

Analyze the following image:
{{media url=photoDataUri}}`,
});

const analyzeWodFlow = ai.defineFlow(
  {
    name: 'analyzeWodFlow',
    inputSchema: AnalyzeWodInputSchema,
    outputSchema: AnalyzeWodOutputSchema,
  },
  async (input: AnalyzeWodInput) => {
    const {output} = await analyzeWodPrompt(input);
    return output!;
  }
);
