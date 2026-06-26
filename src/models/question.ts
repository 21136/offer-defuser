import type { ScoreVector } from './score';

/** 测试题选项 — 各维度加减分 */
export interface QuestionOption {
  text: string;
  scores: Partial<ScoreVector>;
}

/** 测试题 */
export interface Question {
  id: number;
  text: string;
  options: QuestionOption[]; // v1 固定 4 选项，但类型上不过度约束方便 JSON 导入
}
