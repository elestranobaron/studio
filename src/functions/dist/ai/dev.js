"use strict";
// This file is used for local development of Genkit flows
// with `genkit:dev` or `genkit:watch` scripts.
Object.defineProperty(exports, "__esModule", { value: true });
const generate_wod_flow_1 = require("./generate-wod-flow");
const analyze_wod_flow_1 = require("./analyze-wod-flow");
const meal_plan_flow_1 = require("./meal-plan-flow");
exports.default = {
    'generate-wod': generate_wod_flow_1.generateWod,
    'analyze-wod': analyze_wod_flow_1.analyzeWod,
    'generate-meal-plan': meal_plan_flow_1.generateMealPlan,
};
