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
  prompt: `You are an expert CrossFit coach. Your task is to analyze the provided image of a Workout of the Day (WOD) and extract its key details.

The image contains a description of a workout. It might be split into multiple columns or sections (like 'Strength' and 'Metcon'). Please carefully read the ENTIRE image and extract the following information, combining all parts of the workout into a single description.

1.  **Name**: The title of the workout (e.g., "Fran", "Murph", "Cindy"). If no name is present, create a descriptive name based on the exercises.
2.  **Type**: The format of the main workout. Choose from "For Time", "AMRAP", "EMOM", "Tabata", or "Other".
3.  **Description**: The full text of the workout, including ALL components like warm-ups, strength parts, and metcons (e.g., "Hybrid Metcon"). Include all movements, repetition schemes, weights, and any other relevant instructions. Please maintain the original formatting, including line breaks, and combine all sections into one cohesive description.
4.  **Image Hint**: Based on the main exercise(s), provide a one or two-word hint for finding a relevant stock photo. Examples: "running", "barbell", "kettlebell", "pull-up", "rowing".

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
