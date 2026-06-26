/**
 * 归一化边界常量
 * SCORE_BOUNDS 由 scripts/genScoreBounds.ts 自动生成，请勿手动编辑
 * 生成时间: 2026-06-26T01:35:33.175Z
 */

import type { ScoreBounds } from '@/models/score';

/** 4 维各差 100 的理论最大欧氏距离 = sqrt(4 * 100²) */
export const DISTANCE_SCALE = 200;

export const SCORE_BOUNDS: ScoreBounds = {
  rawMin: {
    delay: -24,
    apply: -26,
    perfect: -22,
    interview: -28,
  },
  rawMax: {
    delay: 28,
    apply: 23,
    perfect: 26,
    interview: 21,
  },
};
