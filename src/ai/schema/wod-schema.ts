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
    // Timer-specific properties for this section
    timerType: z.enum(["For Time", "AMRAP", "EMOM", "Tabata", "Other"]).optional().describe("The type of timer for this specific section, if any."),
    timerDuration: z.number().optional().describe("The duration in minutes for this section's timer (for AMRAP or EMOM)."),
    timerRounds: z.number().optional().describe("The number of rounds for this section's timer (for EMOM or Tabata)."),
    timerInterval: z.number().optional().describe("The interval in seconds for an EMOM timer in this section."),
});

export const AnalyzeWodOutputSchema = z.object({
    name: z.string().describe("The name of the workout, e.g., 'Fran', 'Murph'."),
    type: z.enum(["For Time", "AMRAP", "EMOM", "Tabata", "Other"]).describe("The primary type of the main workout (usually the Metcon)."),
    description: z.array(WodDescriptionSectionSchema).describe("An array of workout sections. The AI should analyze each section to determine if it has its own timer and extract its parameters (timerType, timerDuration, etc.)."),
    duration: z.number().optional().describe("The total duration of the main workout in minutes (usually the Metcon). For EMOMs, calculate total time. For AMRAPs, use the specified time."),
    imageHint: z.string().describe("A one or two-word hint for a relevant stock photo, e.g., 'running', 'barbell', 'kettlebell', 'pull-up'."),
});
export type AnalyzeWodOutput = z.infer<typeof AnalyzeWodOutputSchema>;
