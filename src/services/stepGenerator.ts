import type { PersonaId } from '../models/persona';
import type {
  JobCategory,
  StepOption,
  StepTemplate,
  StepLibrary,
  DefusePlan,
  DefuseStep,
} from '../models/step';
import { weightedRandomIndex, weightedRandomIndexExcluding } from '../utils/random';
import { interpolate, calcDaysLeft } from './templateEngine';
import { nanoid } from 'nanoid';

/**
 * 加权随机步骤生成器
 *
 * 输入: personaId, category, jobName, deadline, stepLibrary
 *   ↓
 * 遍历 8 个语义槽位 → 每槽位加权随机选文案 → 插值
 *   ↓
 * 输出: DefusePlan (8 步可执行行动方案)
 */

export interface GeneratePlanInput {
  personaId: PersonaId;
  personaName: string;
  category: JobCategory;
  jobName: string;
  deadline: string; // ISO date
  stepLibrary: StepLibrary;
  styleMode?: 'casual' | 'serious'; // P2: 文案风格过滤
}

/** 从选项列表中按风格筛选，若无匹配则回退到全部选项 */
function filterByStyle(
  options: StepOption[],
  styleMode: 'casual' | 'serious',
): StepOption[] {
  const filtered = options.filter((o) => o.style === styleMode);
  return filtered.length > 0 ? filtered : options;
}

/** 生成完整 8 步拆解方案 */
export function generatePlan(input: GeneratePlanInput): DefusePlan {
  const { personaId, personaName, category, jobName, deadline, stepLibrary, styleMode } =
    input;

  const templates = stepLibrary.personas[personaId];
  if (!templates || templates.length !== 8) {
    throw new Error(
      `generatePlan: persona "${personaId}" has no valid steps in library for "${category}"`,
    );
  }

  const daysLeft = calcDaysLeft(deadline);
  const vars = {
    jobName,
    deadline,
    daysLeft,
    personaName,
  };

  const steps: DefuseStep[] = templates.map((tmpl) => {
    const options = styleMode ? filterByStyle(tmpl.options, styleMode) : tmpl.options;
    const idx = weightedRandomIndex(options);
    return {
      position: tmpl.position,
      title: tmpl.title,
      content: interpolate(options[idx].text, vars),
      optionIndex: idx,
    };
  });

  return {
    id: nanoid(12),
    personaId,
    category,
    jobName,
    deadline,
    daysLeft,
    steps,
    createdAt: new Date().toISOString(),
  };
}

/** 「换一句」—— 局部重随机单个步骤 */
export function rerollStep(
  plan: DefusePlan,
  stepPosition: number,
  templates: StepTemplate[],
  personaName: string,
): DefusePlan {
  const tmpl = templates.find((t) => t.position === stepPosition);
  if (!tmpl) return plan;

  const oldStep = plan.steps.find((s) => s.position === stepPosition);
  const vars = {
    jobName: plan.jobName,
    deadline: plan.deadline,
    daysLeft: plan.daysLeft,
    personaName,
  };

  const newIdx = weightedRandomIndexExcluding(
    tmpl.options,
    oldStep?.optionIndex ?? -1,
  );
  const newContent = interpolate(tmpl.options[newIdx].text, vars);

  return {
    ...plan,
    steps: plan.steps.map((s) =>
      s.position === stepPosition
        ? { ...s, content: newContent, optionIndex: newIdx }
        : s,
    ),
  };
}
