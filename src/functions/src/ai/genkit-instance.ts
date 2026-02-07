
import {genkit, type Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * Lazy initialization of Genkit to prevent crashes during module loading
 * if environment variables are not yet available.
 */
export function getAi(): Genkit {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  
  if (!geminiKey) {
    throw new Error("Missing GEMINI_API_KEY in environment variables.");
  }

  return genkit({
    plugins: [googleAI({ apiKey: geminiKey })],
  });
}
