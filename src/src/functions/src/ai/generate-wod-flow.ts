/**
 * @fileOverview A WOD (Workout of the Day) generation AI agent.
 */

import {getAi} from './genkit-instance';
import {
    AnalyzeWodOutputSchema,
    type AnalyzeWodOutput,
} from './wod-schema';
import {z} from 'genkit';

const GenerateWodInputSchema = z.object({});
export type GenerateWodInput = z.infer<typeof GenerateWodInputSchema>;

export async function generateWod(
  input: GenerateWodInput
): Promise<AnalyzeWodOutput> {
  return await generateWodFlow(input);
}

const generateWodFlow = getAi().defineFlow(
  {
    name: 'generateWodFlow',
    inputSchema: GenerateWodInputSchema,
    outputSchema: AnalyzeWodOutputSchema,
  },
  async (input: GenerateWodInput) => {
      const generateWodPrompt = getAi().definePrompt({
        name: 'generateWodPrompt',
        input: {schema: GenerateWodInputSchema},
        output: {schema: AnalyzeWodOutputSchema},
        model: 'googleai/gemini-2.5-flash',
        config: {
          temperature: 1.0, 
        },
        prompt: `Generate a new random CrossFit WOD. Catchy name, logical structure, profile analysis.`,
      });

      const {output} = await generateWodPrompt(input);
      if (!output) throw new Error('AI generation failed.');
      return output;
  }
);