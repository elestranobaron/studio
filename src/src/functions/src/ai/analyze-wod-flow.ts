/**
 * @fileOverview A WOD (Workout of the Day) analysis AI agent.
 */

import {getAi} from './genkit-instance';
import {
  AnalyzeWodInputSchema,
  AnalyzeWodOutputSchema,
  type AnalyzeWodInput,
  type AnalyzeWodOutput,
} from './wod-schema';

export async function analyzeWod(
  input: AnalyzeWodInput
): Promise<AnalyzeWodOutput> {
  return await analyzeWodFlow(input);
}

const analyzeWodFlow = getAi().defineFlow(
  {
    name: 'analyzeWodFlow',
    inputSchema: AnalyzeWodInputSchema,
    outputSchema: AnalyzeWodOutputSchema,
  },
  async (input: AnalyzeWodInput) => {
    const analyzeWodPrompt = getAi().definePrompt({
      name: 'analyzeWodPrompt',
      input: {schema: AnalyzeWodInputSchema},
      output: {schema: AnalyzeWodOutputSchema},
      model: 'googleai/gemini-2.5-flash', 
      config: {
        temperature: 0.2, 
      },
      prompt: `You are "WODBurner", an expert CrossFit coach. Extract workout details from the image.
      Analyze this workout:
      {{media url=photoDataUri}}`,
    });

    const {output} = await analyzeWodPrompt(input);
    return output!;
  }
);