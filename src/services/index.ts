export { calcScores, calcRawScores, normalize } from './scoreCalculator';
export type { Answer, AnswerRecord } from './scoreCalculator';

export { matchPersona, euclideanDistance, toSimilarity } from './personaMatcher';

export { generatePlan, rerollStep } from './stepGenerator';
export type { GeneratePlanInput } from './stepGenerator';

export { interpolate, formatDeadline, calcDaysLeft } from './templateEngine';
export type { TemplateVars } from './templateEngine';
