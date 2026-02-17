
import {genkit, type Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * Lazy initialization of Genkit to prevent crashes during module loading
 * if environment variables are not yet available.
 */
export function getAi(): Genkit {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  
  // Safety check: if no key is found, use a placeholder to avoid throwing during initialization.
  // The actual flow execution will fail later if the key is still missing, 
  // but it won't crash the entire Cloud Function process at startup.
  const apiKey = geminiKey || 'missing-api-key';

  return genkit({
    plugins: [googleAI({ apiKey })],
  });
}
