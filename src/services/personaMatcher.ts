import type { ScoreVector } from '../models/score';
import type { Persona, PersonaMatch } from '../models/persona';
import { DISTANCE_SCALE } from '../constants/scoreBounds';

/**
 * 欧式距离向量匹配
 *
 * 算法:
 * 1. 遍历 16 个人格，计算欧式距离
 * 2. 取最小距离 → 主结果，次小距离 → 次人格
 * 3. 计算相似度: similarity = max(0, 1 - distance / DISTANCE_SCALE) × 100
 *
 * DISTANCE_SCALE = 200（4 维各差 100 的理论最大距离）
 */

/** 计算用户向量与人格标准向量的欧式距离 */
export function euclideanDistance(a: ScoreVector, b: ScoreVector): number {
  const dDelay = a.delay - b.delay;
  const dApply = a.apply - b.apply;
  const dPerfect = a.perfect - b.perfect;
  const dInterview = a.interview - b.interview;
  return Math.sqrt(dDelay ** 2 + dApply ** 2 + dPerfect ** 2 + dInterview ** 2);
}

/** 距离 → 相似度百分比 */
export function toSimilarity(distance: number): number {
  return Math.round(Math.max(0, 1 - distance / DISTANCE_SCALE) * 100);
}

/**
 * 匹配最佳人格
 *
 * @param userVector 已归一化的用户四维向量
 * @param personas 全部 16 套人格
 * @returns PersonaMatch — 主/次匹配 + Top-3
 */
export function matchPersona(
  userVector: ScoreVector,
  personas: Persona[],
): PersonaMatch {
  if (personas.length < 2) {
    throw new Error('matchPersona: at least 2 personas required');
  }

  // 计算所有距离
  const scored = personas.map((p) => ({
    persona: p,
    distance: euclideanDistance(userVector, p.vector),
  }));

  // 按距离升序
  scored.sort((a, b) => a.distance - b.distance);

  const [best, second, ...rest] = scored;

  return {
    persona: best.persona,
    distance: best.distance,
    similarity: toSimilarity(best.distance),
    subPersona: second.persona,
    subSimilarity: toSimilarity(second.distance),
    top3: [best.persona, second.persona, rest[0]?.persona ?? second.persona],
  };
}
