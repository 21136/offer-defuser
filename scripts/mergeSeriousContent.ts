/**
 * 合并 serious 文案到 frontend.json
 *
 * 用法: npx tsx scripts/mergeSeriousContent.ts
 *
 * 前置: 先在各 persona 文件中生成 serious 文案（如 serious-mass-applyer.json）
 *       每个文件格式: { "personaId": "xxx", "steps": { "1": [...], "2": [...], ... } }
 *       其中 steps[position] 是 serious StepOption 数组（不含 style，脚本会自动添加）
 *
 * 脚本会:
 *   1. 读取 frontend.json
 *   2. 扫描 src/assets/steps/serious-*.json
 *   3. 将每个文件的 serious options 追加到对应 persona 的对应 step
 *   4. 写回 frontend.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_PATH = path.resolve(
  __dirname,
  '..',
  'src',
  'assets',
  'steps',
  'frontend.json',
);

const STEPS_DIR = path.resolve(__dirname, '..', 'src', 'assets', 'steps');

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

/** 单个 persona 的 serious 内容文件结构 */
interface SeriousPersonaFile {
  personaId: string;
  steps: Record<string, StepOption[]>; // key: "1"-"8"
}

function main() {
  // 1. 读取 frontend.json
  const lib: StepLibrary = JSON.parse(fs.readFileSync(FRONTEND_PATH, 'utf-8'));

  // 2. 扫描 serious-*.json 文件
  const files = fs
    .readdirSync(STEPS_DIR)
    .filter((f) => f.startsWith('serious-') && f.endsWith('.json'));

  if (files.length === 0) {
    console.log('⚠️  No serious-*.json files found. Nothing to merge.');
    return;
  }

  console.log(`Found ${files.length} serious content files: ${files.join(', ')}`);

  let totalAdded = 0;
  const mergedPersonas: string[] = [];

  for (const file of files) {
    const filePath = path.join(STEPS_DIR, file);
    const data: SeriousPersonaFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const { personaId, steps: stepMap } = data;
    const templates = lib.personas[personaId];

    if (!templates) {
      console.warn(`⚠️  Persona "${personaId}" not found in frontend.json, skipping`);
      continue;
    }

    for (const [posStr, newOptions] of Object.entries(stepMap)) {
      const position = parseInt(posStr, 10);
      const tmpl = templates.find((t) => t.position === position);
      if (!tmpl) {
        console.warn(`⚠️  Step ${position} not found for ${personaId}, skipping`);
        continue;
      }

      // 为每条新选项添加 style: "serious"
      const styledOptions: StepOption[] = newOptions.map((opt) => ({
        ...opt,
        style: 'serious',
      }));

      tmpl.options.push(...styledOptions);
      totalAdded += styledOptions.length;
    }

    mergedPersonas.push(personaId);
    console.log(`  ✅ ${personaId}: added ${JSON.stringify(stepMap).length} steps`);
  }

  // 3. 写回
  fs.writeFileSync(FRONTEND_PATH, JSON.stringify(lib, null, 2) + '\n', 'utf-8');

  console.log(
    `\n🎉 Merged ${totalAdded} serious options for ${mergedPersonas.length} personas into frontend.json`,
  );

  // 4. 清理临时文件
  for (const file of files) {
    fs.unlinkSync(path.join(STEPS_DIR, file));
    console.log(`  🗑️  Deleted temp file: ${file}`);
  }
}

main();
