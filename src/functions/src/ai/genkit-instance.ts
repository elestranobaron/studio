
import {genkit, type Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

let aiInstance: Genkit | null = null;

export function getAi(): Genkit {
  if (!aiInstance) {
    aiInstance = genkit({
      plugins: [googleAI({apiVersion: 'v1beta'})],
    });
  }
  return aiInstance;
}
