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

The image contains a description of a workout. Please carefully read the image and extract the following information:
1.  **Name**: The title of the workout (e.g., "Fran", "Murph", "Cindy"). If no name is present, create a descriptive name based on the exercises.
2.  **Type**: The format of the workout. Choose from "For Time", "AMRAP", "EMOM", "Tabata", or "Other".
3.  **Description**: The full text of the workout, including all movements, repetition schemes, weights, and any other relevant instructions. Please maintain the original formatting, including line breaks.

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
