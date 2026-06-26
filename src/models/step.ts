import type { PersonaId } from './persona';

/** 岗位场景分类 */
export type JobCategory = 'frontend' | 'general' | 'state-owned';

/** 场景中文标签 */
export const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  frontend: '前端开发实习',
  general: '通用互联网岗',
  'state-owned': '国企/事业单位',
};

/** P0 可用场景 */
export const P0_CATEGORIES: JobCategory[] = ['frontend', 'general', 'state-owned'];

/** 步骤选项 — 支持 {{var}} 插值 */
export interface StepOption {
  text: string;
  weight: number; // 1-10
  style?: 'casual' | 'serious'; // P2: 文案风格（缺省=任意）
}

/** 步骤模板 — 一个槽位（position 1-8）包含多条备选文案 */
export interface StepTemplate {
  position: number; // 1-8 固定语义槽位
  title: string; // 步骤标题（可按 JobCategory 覆写）
  options: StepOption[]; // 7 条备选文案
}

/** 方案 A：全量分叉步骤库（v1 锁定） */
export interface StepLibrary {
  category: JobCategory;
  personas: Record<PersonaId, StepTemplate[]>; // 每人格 8 步 × 每步 7 选项
}

/** 生成的单步拆解结果 */
export interface DefuseStep {
  position: number; // 1-8 固定
  title: string;
  content: string; // 已插值渲染的最终文案
  optionIndex: number; // 本次选中的选项索引（用于"换一句"避开重复）
}

/** 生成的完整拆解方案 */
export interface DefusePlan {
  id: string;
  personaId: PersonaId;
  category: JobCategory;
  jobName: string;
  deadline: string; // ISO date
  daysLeft: number; // 计算得出
  steps: DefuseStep[];
  createdAt: string;
}

/** 八步语义槽位定义 */
export const STEP_SLOTS: { position: number; title: string; intent: string }[] = [
  { position: 1, title: '搞清门槛', intent: 'JD 拆解 / 硬性条件' },
  { position: 2, title: '改简历', intent: '针对该岗改一版' },
  { position: 3, title: '去投递', intent: '今天投出去' },
  { position: 4, title: '笔试准备', intent: '按岗位类型选刷题方向' },
  { position: 5, title: '面试准备', intent: 'STAR 法则项目话术' },
  { position: 6, title: '模拟练习', intent: '自问自答 / 录音' },
  { position: 7, title: '跟进复盘', intent: '投后不消失' },
  { position: 8, title: '心态复位', intent: '防内耗收尾' },
];
