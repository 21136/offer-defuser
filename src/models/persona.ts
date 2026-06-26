import type { ScoreVector } from './score';

/** 人格 ID（如 "mass-applyer"） */
export type PersonaId = string;

/** 求职人格定义 */
export interface Persona {
  id: PersonaId;
  name: string; // 梗名: "海投摆烂吗喽"
  formalName?: string; // 中性别名 P2: "广泛投递型"
  vector: ScoreVector; // 标准四维向量
  tags: string[]; // ["海投", "佛系", "随缘"]
  description: string; // 人格解读
  strengths: string[];
  weaknesses: string[];
  advice: string; // 一句话建议
}

/** 人格匹配结果 */
export interface PersonaMatch {
  persona: Persona; // 主匹配人格
  distance: number; // 欧式距离
  similarity: number; // max(0, 1 - distance/200) × 100
  subPersona: Persona; // 次匹配人格
  subSimilarity: number; // 次人格相似度
  top3: Persona[]; // Top-3 人格（含主）
}
