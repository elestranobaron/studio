
import {genkit, type Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * Lazy initialization of Genkit to prevent crashes during module loading
 * if environment variables are not yet available.
 */
export function getAi(): Genkit {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  
  // We provide a fallback 'dummy' key for the definition phase.
  // This prevents the top-level 'defineFlow' calls from throwing errors
  // during the 'import' statement in the main index.ts.
  const apiKey = geminiKey || 'placeholder-key-for-definition-only';

  return genkit({
    plugins: [googleAI({ apiKey })],
  });
}
