import type { StepOption } from '@/models/step';

/**
 * 加权随机抽取
 * 返回选中的 text 字符串
 * 总权重为 0 时返回第一项
 */
export function weightedRandom(texts: StepOption[]): string {
  return weightedRandomWithRng(texts, () => Math.random());
}

/**
 * 可复现的伪随机数生成器（Mulberry32 算法）
 * 供分布验收脚本使用，确保结果可复现
 */
export function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 使用给定随机函数进行加权随机抽取
 * 供分布验收脚本使用
 */
export function weightedRandomWithRng(texts: StepOption[], rng: () => number): string {
  if (texts.length === 0) {
    return '';
  }

  const total = texts.reduce((sum, t) => sum + t.weight, 0);
  if (total <= 0) {
    return texts[0].text;
  }

  let r = rng() * total;
  for (const t of texts) {
    r -= t.weight;
    if (r <= 0) return t.text;
  }

  return texts[0].text;
}
