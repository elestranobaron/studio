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
    // Add safety settings to moderate community-shared content
    safetySettings: [
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
    ]
  },
  prompt: `You are an expert CrossFit coach. Your task is to analyze the provided image of a Workout of the Day (WOD) and extract its key details.

The image contains a description of a workout. It might be split into multiple columns or sections (like 'Strength', 'Metcon', 'Warm-up'). Please carefully read the ENTIRE image and extract the following information.

1.  **Name**: The title of the workout (e.g., "Fran", "Murph", "Cindy"). If no name is present, create a descriptive name based on the exercises.
2.  **Type**: The format of the main workout. Choose from "For Time", "AMRAP", "EMOM", "Tabata", or "Other".
3.  **Description**: Analyze the workout and break it down into logical sections. Each section should have a 'title' (like 'Warm-up', 'Strength', 'Metcon', 'Accessory', or 'Cool-down') and 'content'. The content for each section must preserve the original formatting, including all line breaks and spacing, to ensure it is readable.
4.  **Duration**: If the WOD is an AMRAP or EMOM, calculate its total duration in **minutes**. For example, an AMRAP in 20 minutes is 20. An EMOM for 10 rounds of 1 minute is 10. An EMOM for 6 rounds every 2 minutes 30 seconds is 15 (6 * 2.5). If it's "For Time" or the duration is not specified, leave this field empty.
5.  **Image Hint**: Based on the main exercise(s), provide a one or two-word hint for finding a relevant stock photo. Examples: "running", "barbell", "kettlebell", "pull-up", "rowing".

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
