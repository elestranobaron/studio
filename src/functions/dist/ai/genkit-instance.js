"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAi = getAi;
const genkit_1 = require("genkit");
const google_genai_1 = require("@genkit-ai/google-genai");
let aiInstance = null;
function getAi() {
    if (!aiInstance) {
        aiInstance = (0, genkit_1.genkit)({
            plugins: [(0, google_genai_1.googleAI)({ apiVersion: 'v1beta' })],
        });
    }
    return aiInstance;
}
