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


const WodDescriptionSectionSchema = z.object({
    title: z.string().describe("The title of the workout section, e.g., 'Warm-up', 'Strength', 'Metcon'."),
    content: z.string().describe("The content of the section. Preserve original formatting like newlines."),
});

export const AnalyzeWodOutputSchema = z.object({
    name: z.string().describe("The name of the workout, e.g., 'Fran', 'Murph'."),
    type: z.enum(["For Time", "AMRAP", "EMOM", "Tabata", "Other"]).describe("The type of workout."),
    description: z.array(WodDescriptionSectionSchema).describe("An array of workout sections, each with a title and content. Examples: Warm-up, Strength, Metcon."),
    duration: z.number().optional().describe("The total duration of the workout in minutes. For EMOMs, calculate total time (e.g., 'Every 2:30 for 6 rounds' is 15 minutes). For AMRAPs, use the specified time."),
    imageHint: z.string().describe("A one or two-word hint for a relevant stock photo, e.g., 'running', 'barbell', 'kettlebell', 'pull-up'."),
});
export type AnalyzeWodOutput = z.infer<typeof AnalyzeWodOutputSchema>;
