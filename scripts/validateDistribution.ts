/**
 * 分布验收脚本
 * 生成 ≥10,000 随机答卷，验证 16 人格分布是否合理
 * 若任一型 >35% 或 <3%，需要调整 personas.json 标准向量
 *
 * 用法: npx tsx scripts/validateDistribution.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Question, Answer } from '../src/models/question';
import type { Persona } from '../src/models/persona';
import { calculateRawScore, normalize } from '../src/services/scoreCalculator';
import { matchPersona } from '../src/services/personaMatcher';
import { seededRandom } from '../src/services/weightedRandom';
import { SCORE_BOUNDS } from '../src/constants/scoreBounds';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUESTIONS_PATH = path.resolve(__dirname, '../src/assets/questions.json');
const PERSONAS_PATH = path.resolve(__dirname, '../src/assets/personas.json');

const SIMULATIONS = 10_000;
const SEED = 42;

function loadJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function generateRandomAnswers(questions: Question[], rng: () => number): Answer[] {
  return questions.map((q) => ({
    questionId: q.id,
    selectedOption: Math.floor(rng() * 4),
  }));
}

function main(): void {
  const questions = loadJson<Question[]>(QUESTIONS_PATH);
  const personas = loadJson<Persona[]>(PERSONAS_PATH);

  console.log(`Running ${SIMULATIONS.toLocaleString()} simulations (seed: ${SEED})...\n`);

  const rng = seededRandom(SEED);
  const counts: Record<string, number> = {};
  for (const p of personas) {
    counts[p.id] = 0;
  }

  const meanVec = { delay: 0, apply: 0, perfect: 0, interview: 0 };

  for (let i = 0; i < SIMULATIONS; i++) {
    const answers = generateRandomAnswers(questions, rng);
    const raw = calculateRawScore(answers, questions);
    const normalized = normalize(raw, SCORE_BOUNDS);
    for (const k of ['delay', 'apply', 'perfect', 'interview'] as const) {
      meanVec[k] += normalized[k];
    }
    const match = matchPersona(normalized, personas);
    counts[match.persona.id]++;
  }

  // Print mean vector
  console.log('Mean normalized vector:');
  for (const k of ['delay', 'apply', 'perfect', 'interview'] as const) {
    console.log(`  ${k}: ${(meanVec[k] / SIMULATIONS).toFixed(1)}`);
  }
  console.log('');

  // Print histogram
  console.log('Persona distribution:\n');
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  let hasWarning = false;
  for (const [id, count] of sorted) {
    const pct = (count / SIMULATIONS) * 100;
    const bar = '█'.repeat(Math.round(pct));
    const persona = personas.find((p) => p.id === id);
    const name = persona ? persona.name : id;
    const flag = pct > 35 ? ' ⚠️ >35%' : pct < 3 ? ' ⚠️ <3%' : '';
    if (flag) hasWarning = true;
    console.log(`  ${name.padEnd(20)} ${pct.toFixed(1).padStart(5)}% ${bar}${flag}`);
  }

  console.log('\n---');
  if (hasWarning) {
    console.log('⚠️  WARNING: Some personas are outside the 3%-35% range.');
    console.log('   Adjust standard vectors in personas.json and re-run.');
  } else {
    console.log('✅ All personas within 3%-35% range. Distribution is healthy.');
  }
}

main();
