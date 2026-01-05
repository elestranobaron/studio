"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyzeWodOutputSchema = exports.AnalyzeWodInputSchema = void 0;
const genkit_1 = require("genkit");
exports.AnalyzeWodInputSchema = genkit_1.z.object({
    photoDataUri: genkit_1.z
        .string()
        .describe("A photo of a WOD, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
const WodDescriptionSectionSchema = genkit_1.z.object({
    title: genkit_1.z.string().describe("The title of the workout section, e.g., 'Warm-up', 'Strength', 'Metcon'."),
    content: genkit_1.z.string().describe("The content of the section. Preserve original formatting like newlines."),
    timerType: genkit_1.z.enum(["For Time", "AMRAP", "EMOM", "Tabata", "Other"]).optional().describe("The type of timer for this specific section, if any."),
    timerDuration: genkit_1.z.number().optional().describe("The duration in minutes for this section's timer (for AMRAP or EMOM)."),
    timerRounds: genkit_1.z.number().optional().describe("The number of rounds for this section's timer (for EMOM or Tabata)."),
    timerInterval: genkit_1.z.number().optional().describe("The interval in seconds for an EMOM timer in this section."),
});
exports.AnalyzeWodOutputSchema = genkit_1.z.object({
    name: genkit_1.z.string().describe("The name of the workout, e.g., 'Fran', 'Murph'."),
    type: genkit_1.z.enum(["For Time", "AMRAP", "EMOM", "Tabata", "Other"]).describe("The primary type of the main workout (usually the Metcon)."),
    description: genkit_1.z.array(WodDescriptionSectionSchema).describe("An array of workout sections. The AI should analyze each section to determine if it has its own timer and extract its parameters (timerType, timerDuration, etc.)."),
    duration: genkit_1.z.number().optional().describe("The total duration of the main workout in minutes (usually the Metcon). For EMOMs, calculate total time. For AMRAPs, use the specified time."),
    imageHint: genkit_1.z.string().describe("A one or two-word hint for a relevant stock photo, e.g., 'running', 'barbell', 'kettlebell', 'pull-up'."),
    cardio: genkit_1.z.number().min(0).max(100).describe("On a scale of 0-100, estimate the percentage of this WOD that is cardio-focused (running, rowing, burpees, etc.)."),
    lifting: genkit_1.z.number().min(0).max(100).describe("On a scale of 0-100, estimate the percentage of this WOD that is lifting-focused (barbell, kettlebell, dumbbells, etc.). The sum of cardio and lifting should be 100."),
    upperBody: genkit_1.z.number().min(0).max(100).describe("On a scale of 0-100, estimate the percentage of this WOD that targets the upper body (pull-ups, push-ups, overhead press, etc.)."),
    lowerBody: genkit_1.z.number().min(0).max(100).describe("On a scale of 0-100, estimate the percentage of this WOD that targets the lower body (squats, lunges, running, etc.). The sum of upperBody and lowerBody should be 100."),
});
