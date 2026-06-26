/**
 * 内容资产交叉校验脚本
 *
 * 检查项:
 * 1. personaTexts.json 所有 key 与 personas.json ID 一致
 * 2. 步骤库 persona 对象 key 与 personas.json ID 一致
 * 3. 每人格 8 位置 × 每位置 7 选项结构完整
 * 4. 每条 option.text 至少含 1 个 {{变量}}
 * 5. 每条 option.weight 在 1-10 范围
 *
 * 用法: npx tsx scripts/validateContent.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS = path.resolve(__dirname, '..', 'src', 'assets');
const EXPECTED_PERSONA_COUNT = 16;
const EXPECTED_STEPS = 8;
const MIN_OPTIONS = 7;
const MAX_OPTIONS = 10; // 7 casual + 2-3 serious per BACKLOG P0

interface PersonaEntry {
  id: string;
  name: string;
}
interface StepOption {
  text: string;
  weight: number;
}
interface StepTemplate {
  position: number;
  title: string;
  options: StepOption[];
}

let errors = 0;
let warnings = 0;

function err(msg: string) { console.error(`❌ ${msg}`); errors++; }
function warn(msg: string) { console.warn(`⚠️  ${msg}`); warnings++; }
function ok(msg: string) { console.log(`✅ ${msg}`); }

// --- 1. Load personas.json ---
function readJSON(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf-8');
  // Strip BOM if present (PowerShell UTF-8 with BOM)
  const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(cleaned);
}

const personasPath = path.join(ASSETS, 'personas.json');
if (!fs.existsSync(personasPath)) { err(`Missing: ${personasPath}`); process.exit(1); }
const personas: PersonaEntry[] = readJSON(personasPath) as PersonaEntry[];
const personaIds = new Set(personas.map((p) => p.id));
ok(`personas.json: ${personas.length} personas loaded`);
if (personas.length !== EXPECTED_PERSONA_COUNT) {
  err(`personas.json has ${personas.length} entries (expected ${EXPECTED_PERSONA_COUNT})`);
}

// --- 2. Validate personaTexts.json ---
const textsPath = path.join(ASSETS, 'personaTexts.json');
if (!fs.existsSync(textsPath)) {
  warn(`personaTexts.json not found — skipping`);
} else {
  const texts: Record<string, unknown> = readJSON(textsPath) as Record<string, unknown>;
  const textKeys = Object.keys(texts);
  ok(`personaTexts.json: ${textKeys.length} entries loaded`);

  for (const key of textKeys) {
    if (!personaIds.has(key)) {
      err(`personaTexts.json key "${key}" not found in personas.json`);
    }
  }
  for (const pid of personaIds) {
    if (!textKeys.includes(pid)) {
      warn(`personas.json id "${pid}" missing from personaTexts.json`);
    }
  }
}

// --- 3. Validate step libraries ---
const stepFiles = ['frontend.json', 'general.json', 'state-owned.json'];

for (const file of stepFiles) {
  const stepPath = path.join(ASSETS, 'steps', file);
  if (!fs.existsSync(stepPath)) {
    warn(`Step library ${file} not found — skipping`);
    continue;
  }

  const library = readJSON(stepPath) as { category: string; personas: Record<string, StepTemplate[]> };
  const libPersonas: Record<string, StepTemplate[]> = library.personas;
  if (!libPersonas) { err(`${file}: missing "personas" key`); continue; }

  const libKeys = Object.keys(libPersonas);
  ok(`${file}: ${libKeys.length} personas in step library`);

  // Check persona ID consistency
  for (const key of libKeys) {
    if (!personaIds.has(key)) {
      err(`${file}: persona key "${key}" not in personas.json`);
    }
  }
  for (const pid of personaIds) {
    if (!libKeys.includes(pid)) {
      err(`${file}: persona "${pid}" from personas.json missing in step library`);
    }
  }

  // Check structure per persona
  for (const [pid, steps] of Object.entries(libPersonas)) {
    const stepArr = steps as StepTemplate[];
    if (stepArr.length !== EXPECTED_STEPS) {
      err(`${file}/${pid}: ${stepArr.length} steps (expected ${EXPECTED_STEPS})`);
      continue;
    }

    const positions = new Set<number>();
    for (const step of stepArr) {
      if (step.position < 1 || step.position > 8) {
        err(`${file}/${pid}: invalid position ${step.position}`);
      }
      if (positions.has(step.position)) {
        err(`${file}/${pid}: duplicate position ${step.position}`);
      }
      positions.add(step.position);
      if (!step.title || typeof step.title !== 'string') {
        err(`${file}/${pid}/pos${step.position}: missing or invalid title`);
      }
      if (!Array.isArray(step.options)) {
        err(`${file}/${pid}/pos${step.position}: options is not an array`);
        continue;
      }
      if (step.options.length < MIN_OPTIONS || step.options.length > MAX_OPTIONS) {
        err(
          `${file}/${pid}/pos${step.position}: ${step.options.length} options (expected ${MIN_OPTIONS}-${MAX_OPTIONS})`,
        );
      }

      for (let i = 0; i < step.options.length; i++) {
        const opt = step.options[i];
        // Weight check
        if (typeof opt.weight !== 'number' || opt.weight < 1 || opt.weight > 10) {
          err(`${file}/${pid}/pos${step.position}/opt${i}: invalid weight ${opt.weight}`);
        }
        // Variable check
        if (!opt.text || typeof opt.text !== 'string') {
          err(`${file}/${pid}/pos${step.position}/opt${i}: missing text`);
        } else if (!/\{\{\w+\}\}/.test(opt.text)) {
          warn(`${file}/${pid}/pos${step.position}/opt${i}: no {{variable}} in text`);
        }
      }
    }

    if (positions.size !== EXPECTED_STEPS) {
      err(`${file}/${pid}: only ${positions.size} unique positions (expected ${EXPECTED_STEPS})`);
    }
  }
}

// --- Summary ---
console.log('\n' + '='.repeat(50));
if (errors === 0 && warnings === 0) {
  console.log('🎉 All content assets validated — no errors or warnings!');
} else {
  console.log(`⚠️  ${errors} error(s), ${warnings} warning(s)`);
  if (errors > 0) process.exit(1);
}
