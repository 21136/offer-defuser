/**
 * 为 frontend.json 中所有现有 StepOption 添加 "style": "casual"
 *
 * 用法: npx tsx scripts/addCasualStyle.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StepOption {
  text: string;
  weight: number;
  style?: 'casual' | 'serious';
}

interface StepTemplate {
  position: number;
  title: string;
  options: StepOption[];
}

interface StepLibrary {
  category: string;
  personas: Record<string, StepTemplate[]>;
}

const TARGET = path.resolve(
  __dirname,
  '..',
  'src',
  'assets',
  'steps',
  'frontend.json',
);

function main() {
  const raw = fs.readFileSync(TARGET, 'utf-8');
  const lib: StepLibrary = JSON.parse(raw);

  let count = 0;
  for (const [personaId, steps] of Object.entries(lib.personas)) {
    for (const step of steps) {
      for (const opt of step.options) {
        if (!opt.style) {
          opt.style = 'casual';
          count++;
        }
      }
    }
  }

  fs.writeFileSync(TARGET, JSON.stringify(lib, null, 2) + '\n', 'utf-8');
  console.log(`✅ Added "style": "casual" to ${count} options in frontend.json`);
}

main();
