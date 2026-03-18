
// This file is used for local development of Genkit flows
// with `genkit:dev` or `genkit:watch` scripts.

import {generateWod} from './generate-wod-flow';
import {analyzeWod} from './analyze-wod-flow';
import {generateMealPlan} from './meal-plan-flow';

export default {
  'generate-wod': generateWod,
  'analyze-wod': analyzeWod,
  'generate-meal-plan': generateMealPlan,
};
