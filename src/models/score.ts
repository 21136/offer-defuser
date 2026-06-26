/** 四维打分维度键 */
export type DimensionKey = 'delay' | 'apply' | 'perfect' | 'interview';

/** 维度元数据 */
export interface Dimension {
  key: DimensionKey;
  label: string;
  min: number; // 0
  max: number; // 100
}

/** 四维分数向量 */
export interface ScoreVector {
  delay: number; // D1 拖延倾向 [0, 100]
  apply: number; // D2 投递策略 [0, 100]
  perfect: number; // D3 完美主义 [0, 100]
  interview: number; // D4 面试心态 [0, 100]
}

/** 四维原始分（未归一化） */
export interface RawScoreVector extends ScoreVector {}

/** 归一化常量边界 */
export interface ScoreBounds {
  rawMin: ScoreVector;
  rawMax: ScoreVector;
}

/** 四维维度键数组 */
export const DIMENSION_KEYS: DimensionKey[] = ['delay', 'apply', 'perfect', 'interview'];

/** 四维维度中文标签 */
export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  delay: '拖延倾向',
  apply: '投递策略',
  perfect: '完美主义',
  interview: '面试心态',
};

/** 四维维度列表 */
export const DIMENSIONS: Dimension[] = [
  { key: 'delay', label: '拖延倾向', min: 0, max: 100 },
  { key: 'apply', label: '投递策略', min: 0, max: 100 },
  { key: 'perfect', label: '完美主义', min: 0, max: 100 },
  { key: 'interview', label: '面试心态', min: 0, max: 100 },
];
