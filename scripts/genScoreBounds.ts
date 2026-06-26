/**
 * 从 questions.json 预计算各维理论最小/最大值
 * 输出到 src/constants/scoreBounds.ts
 *
 * 用法: npx tsx scripts/genScoreBounds.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Question } from '../src/models/question';
import { DIMENSION_KEYS } from '../src/models/score';
import type { DimensionKey, ScoreVector } from '../src/models/score';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUESTIONS_PATH = path.resolve(__dirname, '../src/assets/questions.json');
const OUTPUT_PATH = path.resolve(__dirname, '../src/constants/scoreBounds.ts');

function loadQuestions(): Question[] {
  let raw = fs.readFileSync(QUESTIONS_PATH, 'utf-8');
  // Strip BOM if present
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw) as Question[];
}

function computeBounds(questions: Question[]): { rawMin: ScoreVector; rawMax: ScoreVector } {
  const rawMin: Record<DimensionKey, number> = { delay: 0, apply: 0, perfect: 0, interview: 0 };
  const rawMax: Record<DimensionKey, number> = { delay: 0, apply: 0, perfect: 0, interview: 0 };

  for (const q of questions) {
    for (const key of DIMENSION_KEYS) {
      const scores = q.options.map((opt) => opt.scores[key] ?? 0);
      rawMin[key] += Math.min(...scores);
      rawMax[key] += Math.max(...scores);
    }
  }

  return { rawMin: rawMin as ScoreVector, rawMax: rawMax as ScoreVector };
}

function generateFile(bounds: { rawMin: ScoreVector; rawMax: ScoreVector }): string {
  return `/**
 * 归一化边界常量
 * 由 scripts/genScoreBounds.ts 自动生成，请勿手动编辑
 * 生成时间: ${new Date().toISOString()}
 */

import type { ScoreBounds } from '@/models/score';

export const SCORE_BOUNDS: ScoreBounds = {
  rawMin: {
    delay: ${bounds.rawMin.delay},
    apply: ${bounds.rawMin.apply},
    perfect: ${bounds.rawMin.perfect},
    interview: ${bounds.rawMin.interview},
  },
  rawMax: {
    delay: ${bounds.rawMax.delay},
    apply: ${bounds.rawMax.apply},
    perfect: ${bounds.rawMax.perfect},
    interview: ${bounds.rawMax.interview},
  },
};
`;
}

function main(): void {
  console.log('Reading questions from', QUESTIONS_PATH);
  const questions = loadQuestions();
  console.log(`Loaded ${questions.length} questions`);

  const bounds = computeBounds(questions);
  console.log('\nComputed bounds:');
  for (const key of DIMENSION_KEYS) {
    console.log(
      `  ${key}: [${bounds.rawMin[key]}, ${bounds.rawMax[key]}] (range: ${bounds.rawMax[key] - bounds.rawMin[key]})`,
    );
  }

  const output = generateFile(bounds);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, output, 'utf-8');
  console.log('\nWritten to', OUTPUT_PATH);
}

main();
