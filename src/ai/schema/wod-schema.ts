import { z } from 'genkit';

/**
 * @fileOverview Schemas for WOD analysis.
 *
 * - AnalyzeWodInputSchema - The Zod schema for the WOD analysis input.
 * - AnalyzeWodOutputSchema - The Zod schema for the WOD analysis output.
 * - AnalyzeWodInput - The input type for the analyzeWod function.
 * - AnalyzeWodOutput - The return type for the analyzeWod function.
 */

export const AnalyzeWodInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a WOD, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeWodInput = z.infer<typeof AnalyzeWodInputSchema>;

export const AnalyzeWodOutputSchema = z.object({
    name: z.string().describe("The name of the workout, e.g., 'Fran', 'Murph'."),
    type: z.enum(["For Time", "AMRAP", "EMOM", "Tabata", "Other"]).describe("The type of workout."),
    description: z.string().describe("The full description of the workout, including exercises, reps, rounds, and weights. Preserve formatting like newlines."),
    imageHint: z.string().describe("A one or two-word hint for a relevant stock photo, e.g., 'running', 'barbell', 'kettlebell', 'pull-up'."),
});
export type AnalyzeWodOutput = z.infer<typeof AnalyzeWodOutputSchema>;
