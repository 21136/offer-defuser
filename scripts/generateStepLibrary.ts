/**
 * 步骤库生成脚本
 *
 * 为 16 个人格 × 8 步骤 × 7 选项生成占位文案。
 * 正式文案将在 Week 2 由多 AI 并行生产替换。
 *
 * 运行: npx tsx scripts/generateStepLibrary.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PERSONA_IDS = [
  'mass-applyer',
  'resume-anxious',
  'jd-perfectionist',
  'ddl-sprinter',
  'big-firm-only',
  'broad-net',
  'over-preparer',
  'zen-master',
  'project-refactorer',
  'intern-only',
  'emo-recoverer',
  'long-planner',
  'resume-edit-loop',
  'cross-field-rookie',
  'written-test-king',
  'offer-hesitator',
];

const STEP_SLOTS = [
  { position: 1, title: '搞清门槛' },
  { position: 2, title: '改简历' },
  { position: 3, title: '去投递' },
  { position: 4, title: '笔试准备' },
  { position: 5, title: '面试准备' },
  { position: 6, title: '模拟练习' },
  { position: 7, title: '跟进复盘' },
  { position: 8, title: '心态复位' },
];

const CATEGORIES = [
  {
    key: 'frontend',
    context: '前端开发实习',
    stepOverrides: {
      4: '前端笔试准备',
    },
  },
  {
    key: 'general',
    context: '通用互联网岗',
    stepOverrides: {},
  },
  {
    key: 'state-owned',
    context: '国企/事业单位',
    stepOverrides: {
      1: '了解招聘流程',
      4: '行测申论准备',
    },
  },
];

function makeOptions(stepPos: number, personaId: string, category: string): Array<{ text: string; weight: number }> {
  const weights = [10, 9, 8, 7, 5, 3, 2];
  return weights.map((w, i) => ({
    text: `[${category}] ${personaId} — 步骤${stepPos} 选项${i + 1}: {{jobName}} 截止 {{deadline}}，还剩 {{daysLeft}} 天。{{personaName}}的专属建议 #${i + 1}。（Week 2 替换为正式文案）`,
    weight: w,
  }));
}

const assetsDir = path.resolve(__dirname, '..', 'src', 'assets', 'steps');
fs.mkdirSync(assetsDir, { recursive: true });

for (const cat of CATEGORIES) {
  const personas: Record<string, Array<{ position: number; title: string; options: Array<{ text: string; weight: number }> }>> = {};

  for (const pid of PERSONA_IDS) {
    personas[pid] = STEP_SLOTS.map((slot) => ({
      position: slot.position,
      title: cat.stepOverrides[slot.position as keyof typeof cat.stepOverrides] ?? slot.title,
      options: makeOptions(slot.position, pid, cat.key),
    }));
  }

  const library = {
    category: cat.key,
    personas,
  };

  const outPath = path.join(assetsDir, `${cat.key}.json`);
  fs.writeFileSync(outPath, JSON.stringify(library, null, 2), 'utf-8');
  console.log(`Generated: ${outPath} (${Object.keys(personas).length} personas × 8 steps × 7 options)`);
}

console.log('\nDone! All step libraries generated.');
