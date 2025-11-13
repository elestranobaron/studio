'use server';
/**
 * @fileOverview A WOD (Workout of the Day) generation AI agent.
 *
 * - generateWod - A function that handles the WOD generation process.
 */

import {ai} from '@/ai/genkit';
import {
    AnalyzeWodOutputSchema,
    type AnalyzeWodOutput,
} from '@/ai/schema/wod-schema';
import {z} from 'genkit';

// For now, the input is empty, but we can add preferences later (e.g., equipment, duration)
const GenerateWodInputSchema = z.object({});
export type GenerateWodInput = z.infer<typeof GenerateWodInputSchema>;

export async function generateWod(
  input: GenerateWodInput
): Promise<AnalyzeWodOutput> {
  return await generateWodFlow(input);
}

const generateWodPrompt = ai.definePrompt({
  name: 'generateWodPrompt',
  input: {schema: GenerateWodInputSchema},
  output: {schema: AnalyzeWodOutputSchema},
  config: {
    temperature: 1.0, // Increase creativity for more varied WODs
  },
  prompt: `You are "WODBot 3000", an expert CrossFit coach with a flair for creating challenging, effective, and fun Workouts of the Day (WODs).

Your task is to generate a completely new and random workout.

Follow these instructions precisely:

1.  **Name**: Create a cool, catchy, and original name for the WOD. Avoid generic names like "Workout 1" or real Hero/Girl WOD names (e.g., "Fran", "Murph"). Think of names like "Engine Builder", "The Grinder", "Iron Cyclone", "Legs of Thunder".
2.  **Type**: Choose one of these formats: "For Time", "AMRAP", "EMOM", or "Tabata".
3.  **Description**:
    *   Write a detailed description of the workout.
    *   Structure it logically. If there's a strength part and a metcon, create separate sections for them. Use titles like 'Strength', 'Metcon', 'Conditioning'.
    *   The content for each section must be clear and easy to follow. Use line breaks for readability.
4.  **Duration**:
    *   If the WOD is an AMRAP or EMOM, calculate its total duration in **minutes**. For example, an AMRAP in 20 minutes is 20. An EMOM for 10 rounds of 1 minute is 10. An EMOM for 6 rounds every 2 minutes 30 seconds is 15 (6 * 2.5).
    *   If it's "For Time" or "Tabata", leave this field empty.
5.  **Image Hint**: Provide a one or two-word hint for finding a relevant stock photo. Examples: "running", "barbell", "kettlebell", "pull-up", "rowing". Be creative and match it to the main movement.

Generate a well-balanced and challenging workout. Be creative! Surprise me!`,
});

const generateWodFlow = ai.defineFlow(
  {
    name: 'generateWodFlow',
    inputSchema: GenerateWodInputSchema,
    outputSchema: AnalyzeWodOutputSchema,
  },
  async (input: GenerateWodInput) => {
    const {output} = await generateWodPrompt(input);
    return output!;
  }
);
